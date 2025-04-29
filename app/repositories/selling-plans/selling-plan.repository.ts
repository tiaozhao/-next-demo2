import { loggerService } from '~/lib/logger';
import prisma from '~/db.server';
import {
  type UpdateSellingPlanRepoParams,
  type UpdateSellingPlanRepoResult,
  type GetByIdRepoParams,
  type GetByIdRepoResult,
  type DbSellingPlan,
  type DbSellingPlanLine,
  type DbSellingPlanDeliveryPolicy,
  type CreateSellingPlanRepoParams,
  type CreateSellingPlanRepoResult,
  type FindManyRepoParams,
  type FindManyRepoResult
} from '~/types/selling-plans/selling-plan.schema';

export class SellingPlanRepository {

  
  /**
   * Create a complete selling plan with lines and delivery policies in a transaction
   */
  public async createWithLinesAndPolicies(data: CreateSellingPlanRepoParams): Promise<CreateSellingPlanRepoResult> {
    loggerService.info('Creating selling plan with lines and policies', {
      planName: data.plan.name,
      lineCount: data.lines.length,
      policyCount: data.deliveryPolicies.length,
      storeName: data.plan.storeName,
      isB2B: !!data.plan.companyLocationId
    });
    
    return await prisma.$transaction(async (tx) => {
      // 1. Create the selling plan
      const sellingPlan = await tx.sellingPlan.create({
        data: {
          name: data.plan.name,
          description: data.plan.description,
          currencyCode: data.plan.currencyCode,
          isDeleted: false,
          storeName: data.plan.storeName,
          createdById: data.plan.createdById,
          companyLocationId: data.plan.companyLocationId
        }
      });
      
      // 2. Create selling plan lines
      const sellingPlanLines = await Promise.all(
        data.lines.map(line => 
          tx.sellingPlanLine.create({
            data: {
              sellingPlanId: sellingPlan.id,
              variantId: line.variantId,
              sku: line.sku,
              quantity: line.quantity,
              storeName: data.plan.storeName
            }
          })
        )
      );
      
      // 3. Create delivery policies
      const deliveryPolicies = await Promise.all(
        data.deliveryPolicies.map(policy => 
          tx.sellingPlanDeliveryPolicy.create({
            data: {
              sellingPlanId: sellingPlan.id,
              offerDiscount: policy.offerDiscount,
              intervalValue: policy.intervalValue,
              intervalUnit: policy.intervalUnit,
              discountType: policy.discountType,
              discountValue: policy.discountValue,
              deliveryAnchor: policy.deliveryAnchor,
              storeName: data.plan.storeName
            }
          })
        )
      );
      
      loggerService.info('Successfully created selling plan with lines and policies', {
        sellingPlanId: sellingPlan.id,
        lineCount: sellingPlanLines.length,
        policyCount: deliveryPolicies.length
      });
      
      return {
        sellingPlan,
        sellingPlanLines,
        deliveryPolicies
      };
    });
  }
  
  /**
   * Find selling plan by ID
   */
  public async findById(id: number | bigint | string): Promise<DbSellingPlan | null> {
    // Convert to BigInt consistently
    const bigIntId = typeof id === 'string' || typeof id === 'number' 
      ? BigInt(id) 
      : id;
    
    const result = await prisma.sellingPlan.findUnique({
      where: { 
        id: bigIntId,
        isDeleted: false
      }
    });
    
    return result;
  }
  
  /**
   * Find multiple selling plans
   */
  public async findMany(params: FindManyRepoParams): Promise<FindManyRepoResult> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    const where: any = {
      storeName: params.storeName,
      ...(params.filters?.name && {
        name: {
          contains: params.filters.name,
          mode: 'insensitive' as const
        }
      }),
      ...(params.filters?.companyLocationId && {
        companyLocationId: params.filters.companyLocationId
      }),
      ...(params.filters?.createdById && {
        createdById: params.filters.createdById
      })
    };
    
    // Handle B2B/B2C filtering based on companyLocationId
    if (params.filters?.companyLocationId === 'null') {
      where.companyLocationId = null;
    }
    
    // Handle date filtering
    if (params.filters?.createdFrom || params.filters?.createdTo) {
      where.createdAt = {};
      
      if (params.filters?.createdFrom) {
        where.createdAt.gte = params.filters.createdFrom;
      }
      
      if (params.filters?.createdTo) {
        where.createdAt.lte = params.filters.createdTo;
      }
    }

    where.isDeleted = false; // Filter out deleted records
    
    // Prepare orderBy condition
    const orderBy = params.sort?.map(sort => ({
      [sort.field]: sort.order
    })) || [{ updatedAt: 'desc' as const }];
    
    const [plans, totalCount] = await Promise.all([
      prisma.sellingPlan.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy
      }),
      prisma.sellingPlan.count({ where })
    ]);
    
    return {
      plans,
      totalCount,
      page,
      pageSize
    };
  }
  
  /**
   * Get selling plan by ID with all related data
   */
  public async getById(params: GetByIdRepoParams): Promise<GetByIdRepoResult | null> {
    // Convert ID to BigInt consistently
    const id = typeof params.id === 'string' || typeof params.id === 'number' 
      ? BigInt(params.id) 
      : params.id;
    
    // Create a string representation for logging
    const idString = id.toString();
    
    loggerService.info('Getting selling plan by ID', {
      id: idString,
      storeName: params.storeName
    });
    
    const sellingPlan = await prisma.sellingPlan.findFirst({
      where: {
        id,
        storeName: params.storeName,
        isDeleted: false
      }
    });
    
    if (!sellingPlan) {
      loggerService.warn('Selling plan not found', {
        id: idString,
        storeName: params.storeName
      });
      return null;
    }
    
    const [sellingPlanLines, deliveryPolicies] = await Promise.all([
      prisma.sellingPlanLine.findMany({
        where: { sellingPlanId: id }
      }),
      prisma.sellingPlanDeliveryPolicy.findMany({
        where: { sellingPlanId: id }
      })
    ]);
    
    loggerService.info('Selling plan details retrieved successfully', {
      id: idString,
      linesCount: sellingPlanLines.length,
      policiesCount: deliveryPolicies.length
    });
    
    return {
      sellingPlan,
      sellingPlanLines,
      deliveryPolicies
    };
  }
  
  /**
   * Soft delete a selling plan by setting isDeleted to true
   */
  public async softDelete(id: bigint | number | string, storeName: string, deletedById: string): Promise<boolean> {
    try {
      // Convert to BigInt consistently
      const bigIntId = typeof id === 'string' || typeof id === 'number' 
        ? BigInt(id) 
        : id;
      
      // Create string representation for logging
      const idString = bigIntId.toString();
      
      loggerService.info('Soft deleting selling plan', {
        id: idString,
        storeName,
        deletedById
      });
      
      const result = await prisma.sellingPlan.updateMany({
        where: { 
          id: bigIntId,
          storeName 
        },
        data: { 
          isDeleted: true,
          deletedAt: new Date(),
          deletedById,
          updatedAt: new Date()
        }
      });
      
      loggerService.info('Soft delete result', {
        id: idString,
        storeName,
        deletedById,
        recordsAffected: result.count
      });
      
      return result.count > 0;
    } catch (error) {
      loggerService.error('Error soft deleting selling plan', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: String(id),
        storeName,
        deletedById
      });
      throw error;
    }
  }

  /**
   * Updates a selling plan along with its lines and delivery policies
   * @param data - Object containing plan data, lines, and delivery policies to update
   * @returns Promise with updated selling plan and its related data
   */
  public async updateWithLinesAndPolicies(data: UpdateSellingPlanRepoParams): Promise<UpdateSellingPlanRepoResult> {
    loggerService.info('Updating selling plan with lines and policies', {
      sellingPlanId: data.id,
      storeName: data.plan.storeName
    });

    return await prisma.$transaction(async (tx) => {
      // 1. Update the selling plan
      const updateData: Record<string, any> = {};
      
      if (data.plan.name !== undefined) updateData.name = data.plan.name;
      if (data.plan.description !== undefined) updateData.description = data.plan.description;
      if (data.plan.currencyCode !== undefined) updateData.currencyCode = data.plan.currencyCode;
      if (data.plan.companyLocationId !== undefined) updateData.companyLocationId = data.plan.companyLocationId;
      if (data.plan.updatedById !== undefined) updateData.updatedById = data.plan.updatedById;
      
      const sellingPlan = await tx.sellingPlan.update({
        where: {
          id: data.id,
          storeName: data.plan.storeName,
          isDeleted: false
        },
        data: updateData
      });
      
      // 2. Handle line deletions if specified
      if (data.linesToDelete && data.linesToDelete.length > 0) {
        loggerService.info('Deleting lines in update operation', {
          count: data.linesToDelete.length,
          lineIds: data.linesToDelete
        });
        
        await tx.sellingPlanLine.deleteMany({
          where: {
            id: { in: data.linesToDelete },
            sellingPlanId: data.id,
            storeName: data.plan.storeName
          }
        });
      }
      
      // 3. Handle policy deletions if specified
      if (data.policiesToDelete && data.policiesToDelete.length > 0) {
        loggerService.info('Deleting policies in update operation', {
          count: data.policiesToDelete.length,
          policyIds: data.policiesToDelete
        });
        
        await tx.sellingPlanDeliveryPolicy.deleteMany({
          where: {
            id: { in: data.policiesToDelete },
            sellingPlanId: data.id,
            storeName: data.plan.storeName
          }
        });
      }
      
      // 4. Handle line updates and additions
      let sellingPlanLines: DbSellingPlanLine[] = [];
      if (data.lines && data.lines.length > 0) {
        // Process each line in sequence to ensure logging of each operation
        sellingPlanLines = [];
        for (const line of data.lines) {
          if (line.id) {
            // Log the update attempt
            loggerService.info('Updating existing line', {
              lineId: line.id,
              sellingPlanId: data.id,
              sku: line.sku
            });
            
            // Update existing line
            const updatedLine = await tx.sellingPlanLine.update({
              where: {
                id: line.id,
                sellingPlanId: data.id,
                storeName: data.plan.storeName
              },
              data: {
                variantId: line.variantId,
                sku: line.sku,
                quantity: line.quantity
              }
            });
            sellingPlanLines.push(updatedLine);
          } else {
            // Log the creation attempt
            loggerService.info('Creating new line', {
              sellingPlanId: data.id,
              sku: line.sku
            });
            
            // Create new line
            const newLine = await tx.sellingPlanLine.create({
              data: {
                sellingPlanId: data.id,
                variantId: line.variantId,
                sku: line.sku,
                quantity: line.quantity,
                storeName: data.plan.storeName
              }
            });
            sellingPlanLines.push(newLine);
          }
        }
      } else {
        // If no lines provided, fetch existing ones
        sellingPlanLines = await tx.sellingPlanLine.findMany({
          where: {
            sellingPlanId: data.id,
            storeName: data.plan.storeName
          }
        });
      }
      
      // 5. Handle delivery policy updates and additions
      let deliveryPolicies: DbSellingPlanDeliveryPolicy[] = [];
      if (data.deliveryPolicies && data.deliveryPolicies.length > 0) {
        // Process each policy in sequence to ensure logging of each operation
        deliveryPolicies = [];
        for (const policy of data.deliveryPolicies) {
          if (policy.id) {
            // Log the update attempt
            loggerService.info('Updating existing policy', {
              policyId: policy.id,
              sellingPlanId: data.id,
              intervalUnit: policy.intervalUnit
            });
            
            // Update existing policy
            const updatedPolicy = await tx.sellingPlanDeliveryPolicy.update({
              where: {
                id: policy.id,
                sellingPlanId: data.id,
                storeName: data.plan.storeName
              },
              data: {
                offerDiscount: policy.offerDiscount,
                intervalValue: policy.intervalValue,
                intervalUnit: policy.intervalUnit,
                discountType: policy.discountType,
                discountValue: policy.discountValue,
                deliveryAnchor: policy.deliveryAnchor
              }
            });
            deliveryPolicies.push(updatedPolicy);
          } else {
            // Log the creation attempt
            loggerService.info('Creating new policy', {
              sellingPlanId: data.id,
              intervalUnit: policy.intervalUnit
            });
            
            // Create new policy
            const newPolicy = await tx.sellingPlanDeliveryPolicy.create({
              data: {
                sellingPlanId: data.id,
                offerDiscount: policy.offerDiscount,
                intervalValue: policy.intervalValue,
                intervalUnit: policy.intervalUnit,
                discountType: policy.discountType,
                discountValue: policy.discountValue,
                deliveryAnchor: policy.deliveryAnchor,
                storeName: data.plan.storeName
              }
            });
            deliveryPolicies.push(newPolicy);
          }
        }
      } else {
        // If no policies provided, fetch existing ones
        deliveryPolicies = await tx.sellingPlanDeliveryPolicy.findMany({
          where: {
            sellingPlanId: data.id,
            storeName: data.plan.storeName
          }
        });
      }
      
      loggerService.info('Successfully updated selling plan with lines and policies', {
        sellingPlanId: sellingPlan.id,
        lineCount: sellingPlanLines.length,
        policyCount: deliveryPolicies.length
      });
      
      return {
        sellingPlan,
        sellingPlanLines,
        deliveryPolicies
      };
    });
  }
}

export const sellingPlanRepository = new SellingPlanRepository(); 