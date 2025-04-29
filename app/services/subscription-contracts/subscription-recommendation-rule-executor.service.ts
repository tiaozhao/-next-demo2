import type { RuleProperties } from 'json-rules-engine';
import { Engine } from 'json-rules-engine';
import { loggerService } from '~/lib/logger';
import { subscriptionRecommendationRuleRepository } from '~/repositories/subscription-recommendation/subscription-recommendation-rule.repository';
import type {
  IUnifiedItemContext,
  IRuleEvaluatedItem
} from '~/types/subscription-contracts/subscription-recommendation.types';

/**
 * Interface for rule definition compatible with json-rules-engine
 */
interface RecommendationRule {
  type: 'filter' | 'score';
  name: string;
  conditions: any; // Using 'any' to avoid TypeScript conflicts with json-rules-engine
  weight?: number;  // For score rules
  disqualify?: boolean; // For filter rules
  event?: {
    type: string;
    params: {
      ruleName: string;
      score?: number;
    };
  };
}

// Use IRuleEvaluatedItem from types instead of local interface

/**
 * Service for executing business rules to generate subscription recommendations
 */
export class SubscriptionRecommendationRuleExecutorService {
  private readonly CLASS_NAME = 'SubscriptionRecommendationRuleExecutorService';

  /**
   * Get rules for a store from the database
   * If no rules are found, falls back to default rules
   * @param storeName The store to get rules for
   * @returns Array of recommendation rules
   */
  private async getRulesForStore(storeName: string): Promise<RecommendationRule[]> {
    const METHOD = 'getRulesForStore';
    try {
      // Get rules from database
      const dbRules = await subscriptionRecommendationRuleRepository.findAllRulesByStore(storeName);

      if (dbRules.length > 0) {
        loggerService.info(`${this.CLASS_NAME}.${METHOD}: Found ${dbRules.length} rules in database for store ${storeName}`);

        // Transform database rules to RecommendationRule format
        return dbRules.map(dbRule => {
          // Parse JSON fields from database
          const conditions = typeof dbRule.conditions === 'string'
            ? JSON.parse(dbRule.conditions as string)
            : dbRule.conditions;

          const event = typeof dbRule.event === 'string'
            ? JSON.parse(dbRule.event as string)
            : dbRule.event;

          // Extract rule type and other metadata
          const ruleType = dbRule.ruleType?.toLowerCase() as 'filter' | 'score' || 'score';

          // Create rule object
          const rule: RecommendationRule = {
            type: ruleType,
            name: dbRule.ruleKey,
            conditions,
          };

          // Add additional properties based on type
          if (ruleType === 'filter') {
            rule.disqualify = true;
          } else if (ruleType === 'score') {
            // Extract weight from event if available
            const weight = event?.params?.score || 1;
            rule.weight = weight;
            rule.event = event;
          }

          return rule;
        });
      } else {
        // If no rules in database, use default hardcoded rules
        loggerService.warn(`${this.CLASS_NAME}.${METHOD}: No rules found in database for store ${storeName}, using default rules`);
        return this.getDefaultRules();
      }
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error getting rules`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName
      });
      // Fall back to default rules
      return this.getDefaultRules();
    }
  }

  /**
   * Get default hardcoded rules
   * @returns Array of default recommendation rules
   */
  private getDefaultRules(): RecommendationRule[] {
    const rules: RecommendationRule[] = [
      // Filter Rules
      {
        type: 'filter',
        name: 'already_subscribed',
        conditions: {
          all: [
            {
              fact: 'item',
              path: '.isSubscribed',
              operator: 'equal',
              value: true
            }
          ]
        },
        disqualify: true
      },
      // Score Rules
      {
        type: 'score',
        name: 'wishlist',
        weight: 4,
        conditions: {
          all: [
            { fact: 'item', path: '.isInWishlist', operator: 'equal', value: true },
            { fact: 'item', path: '.isSubscribed', operator: 'equal', value: false }
          ]
        },
        event: {
          type: 'score',
          params: {
            ruleName: 'wishlist',
            score: 4
          }
        }
      },
      {
        type: 'score',
        name: 'top_selling',
        weight: 3,
        conditions: {
          all: [
            { fact: 'item', path: '.isTopSelling', operator: 'equal', value: true }
          ]
        },
        event: {
          type: 'score',
          params: {
            ruleName: 'top_selling',
            score: 3
          }
        }
      },
      {
        type: 'score',
        name: 'shopify_recommendation',
        weight: 2,
        conditions: {
          all: [
            { fact: 'item', path: '.isShopifyRecommendation', operator: 'equal', value: true },
            { fact: 'item', path: '.isSubscribed', operator: 'equal', value: false }
          ]
        },
        event: {
          type: 'score',
          params: {
            ruleName: 'shopify_recommendation',
            score: 2
          }
        }
      },
      {
        type: 'score',
        name: 'frequency_high',
        weight: 2,
        conditions: {
          all: [
            { fact: 'item', path: '.orderCount', operator: 'greaterThanInclusive', value: 2 },
            { fact: 'item', path: '.isSubscribed', operator: 'equal', value: false }
          ]
        },
        event: {
          type: 'score',
          params: {
            ruleName: 'frequency_high',
            score: 2
          }
        }
      },
      {
        type: 'score',
        name: 'subscription_association',
        weight: 1,
        conditions: {
          all: [
            { fact: 'item', path: '.isSubscribed', operator: 'equal', value: false }
          ]
        },
        event: {
          type: 'score',
          params: {
            ruleName: 'subscription_association',
            score: 1
          }
        }
      }
    ];

    // Add events to rules that don't have them
    rules.forEach(rule => {
      if (rule.type === 'score' && !rule.event) {
        rule.event = {
          type: 'score',
          params: {
            ruleName: rule.name,
            score: rule.weight || 1
          }
        };
      }
    });

    return rules;
  }

  /**
   * Execute rule engine on a single unified item context
   * @param item The unified item context to evaluate
   * @param rules The rules to apply for evaluation
   * @returns Evaluation result with scores and matched rules
   */
  private async evaluateItem(item: IUnifiedItemContext, rules: RecommendationRule[]): Promise<IRuleEvaluatedItem | null> {
    const engine = new Engine();

    // Add only score rules to the engine
    const scoreRules = rules.filter(rule => rule.type === 'score');
    scoreRules.forEach(rule => {
      if (rule.event) {
        // Create a valid rule properties object
        const ruleProps: RuleProperties = {
          conditions: rule.conditions,
          event: rule.event,
          name: rule.name,
          priority: 1
        };

        engine.addRule(ruleProps);
      }
    });

    // First check if item passes all filter rules
    const filterRules = rules.filter(rule => rule.type === 'filter');
    for (const rule of filterRules) {
      // For each filter rule, check if item is disqualified
      const disqualified = this.checkFilterRule(item, rule);
      if (disqualified) {
        // If item is disqualified by any filter rule, return null
        return null;
      }
    }

    try {
      // Initialize score variables
      let baseScore = 0;
      const matchedRules: string[] = [];

      // Process each score rule manually
      for (const rule of scoreRules) {
        if (rule.name === 'wishlist' && item.isInWishlist && !item.isSubscribed) {
          baseScore += rule.weight || 4;
          matchedRules.push(rule.name);
        } else if (rule.name === 'top_selling' && item.isTopSelling) {
          baseScore += rule.weight || 3;
          matchedRules.push(rule.name);
        } else if (rule.name === 'shopify_recommendation' && item.isShopifyRecommendation && !item.isSubscribed) {
          baseScore += rule.weight || 2;
          matchedRules.push(rule.name);
        } else if (rule.name === 'frequency_high' && item.orderCount && item.orderCount >= 2 && !item.isSubscribed) {
          baseScore += rule.weight || 2;
          matchedRules.push(rule.name);
        }
      }

      // Run the engine rules as well (this is the json-rules-engine part)
      const { events } = await engine.run({ item });

      if (events && events.length > 0) {
        // Add any additional rule matches from the engine
        events.forEach(event => {
          if (event.type === 'score' && event.params) {
            // Only add if we haven't manually added this rule already
            const ruleName = event.params.ruleName;
            if (ruleName && !matchedRules.includes(ruleName)) {
              baseScore += event.params.score || 0;
              matchedRules.push(ruleName);
            }
          }
        });
      }

      // Cap the total score at 10
      baseScore = Math.min(baseScore, 10);

      // Return the evaluated item
      return {
        ...item,
        baseScore,
        ruleMatched: matchedRules
      };
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.evaluateItem: Failed to evaluate item`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        skuId: item.skuId
      });
      return null;
    }
  }

  /**
   * Check if an item is disqualified by a filter rule
   * @param item Item to check
   * @param rule Filter rule to apply
   * @returns True if item is disqualified, false otherwise
   */
  private checkFilterRule(item: IUnifiedItemContext, rule: RecommendationRule): boolean {
    if (rule.type !== 'filter' || !rule.disqualify) {
      return false;
    }

    try {
      // Check all conditions
      if (rule.conditions.all) {
        for (const condition of rule.conditions.all) {
          const factValue = this.getFactValue(item, condition.fact, condition.path);
          if (!this.evaluateCondition(factValue, condition.operator, condition.value)) {
            // If any condition fails, rule doesn't disqualify
            return false;
          }
        }
        // All conditions passed, item is disqualified
        return true;
      }

      // Check any conditions
      if (rule.conditions.any) {
        for (const condition of rule.conditions.any) {
          const factValue = this.getFactValue(item, condition.fact, condition.path);
          if (this.evaluateCondition(factValue, condition.operator, condition.value)) {
            // If any condition passes, item is disqualified
            return true;
          }
        }
        // No conditions passed, rule doesn't disqualify
        return false;
      }

      return false;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.checkFilterRule: Error checking filter rule`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        ruleName: rule.name,
        skuId: item.skuId
      });
      return false;
    }
  }

  /**
   * Get value from fact using optional path
   * @param facts Facts object
   * @param factName Name of the fact
   * @param path Optional path within fact
   * @returns Value from facts
   */
  private getFactValue(facts: any, factName: string, path?: string): any {
    if (!facts || typeof facts !== 'object') {
      return undefined;
    }

    if (factName === 'item') {
      // For item fact, return the entire facts object or use path
      if (!path) {
        return facts;
      }

      // Handle path navigation (e.g., '.isSubscribed')
      const normalizedPath = path.startsWith('.') ? path.substring(1) : path;
      return facts[normalizedPath];
    }

    // For other facts, get the property from facts
    return facts[factName];
  }

  /**
   * Evaluate a single condition
   * @param factValue Value from facts
   * @param operator Condition operator
   * @param expectedValue Expected value
   * @returns True if condition is met, false otherwise
   */
  private evaluateCondition(factValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equal':
        return factValue === expectedValue;
      case 'notEqual':
        return factValue !== expectedValue;
      case 'greaterThan':
        return factValue > expectedValue;
      case 'greaterThanInclusive':
        return factValue >= expectedValue;
      case 'lessThan':
        return factValue < expectedValue;
      case 'lessThanInclusive':
        return factValue <= expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(factValue);
      case 'notIn':
        return Array.isArray(expectedValue) && !expectedValue.includes(factValue);
      case 'contains':
        return Array.isArray(factValue) && factValue.includes(expectedValue);
      case 'doesNotContain':
        return Array.isArray(factValue) && !factValue.includes(expectedValue);
      default:
        return false;
    }
  }

  /**
   * Get all active rules for a store
   * @param storeName The store to get rules for
   * @returns Array of active rules
   */
  public async getActiveRules(storeName: string): Promise<any[]> {
    const METHOD = 'getActiveRules';
    try {
      // Get rules from database
      const dbRules = await subscriptionRecommendationRuleRepository.findAllRulesByStore(storeName);

      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Found ${dbRules.length} rules in database for store ${storeName}`);
      return dbRules;
    } catch (error) {
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error getting active rules`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        storeName
      });
      return [];
    }
  }

  /**
   * Execute all recommendation rules
   * @param params Parameters for rule execution
   * @returns Evaluated items with scores and matched rules
   */
  public async executeRules(params: {
    customerId: string;
    storeName: string;
    companyLocationId: string;
    subscriberType?: string;
    context: any;
  }): Promise<any[]> {
    const METHOD = 'executeRules';
    const start = Date.now();

    try {
      // Log execution start with context stats
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Executing recommendation rules`, {
        customerId: params.customerId,
        storeName: params.storeName,
        contextStats: {
          unifiedContextsSize: params.context.unifiedContexts?.size || 0
        }
      });

      // Early return with empty array if no contexts available
      if (!params.context.unifiedContexts || params.context.unifiedContexts.size === 0) {
        loggerService.warn(`${this.CLASS_NAME}.${METHOD}: No unified contexts available for rule execution`, {
          customerId: params.customerId,
          storeName: params.storeName
        });
        return [];
      }

      // Get rules for this store
      const rules = await this.getRulesForStore(params.storeName);

      // Process all items in unified contexts using evaluateItem method
      const evaluatedItems: any[] = [];

      // Process each context item through rule engine
      for (const [skuId, context] of params.context.unifiedContexts.entries()) {
        // Evaluate item using rule engine to get score on 0-10 scale
        const evaluatedItem = await this.evaluateItem(context, rules);

        // If item wasn't filtered out, add to results
        if (evaluatedItem) {
          evaluatedItems.push({
            skuId: skuId,
            score: evaluatedItem.baseScore, // Convert 0-10 scale to 0-1 scale
            matchedRules: evaluatedItem.ruleMatched,
            title: context.title || `Product ${skuId}`,
            description: context.description
          });
        }
      }

      // Log execution completion
      loggerService.info(`${this.CLASS_NAME}.${METHOD}: Rule execution completed`, {
        evaluatedItemsCount: evaluatedItems.length,
        duration: Date.now() - start
      });

      return evaluatedItems;
    } catch (error) {
      // Log error
      loggerService.error(`${this.CLASS_NAME}.${METHOD}: Error executing rules`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: params.customerId,
        storeName: params.storeName,
        duration: Date.now() - start
      });

      // Return empty array in case of error
      return [];
    }
  }
}

/**
 * Singleton instance of the rule executor service
 */
export const subscriptionRecommendationRuleExecutorService = new SubscriptionRecommendationRuleExecutorService();