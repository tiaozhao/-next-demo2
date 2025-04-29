/**
 * Configuration Module Entry Point
 * 
 * This module serves as the main entry point for application configuration.
 * It exports an environment-based configuration system that uses YAML files and performs JSON Schema validation.
 * 
 * Structure:
 * - {environment}/           # Environment-specific directory
 *   - config.yaml            # Environment configuration
 *   - schema.json            # JSON Schema for validation
 * 
 * Configuration is loaded based on the NODE_ENV environment variable.
 * Supported environments: development, production, test
 */

// Import the new configuration loader
import config, {
  getAppConfig,
  getApiConfig,
  getFeaturesConfig,
  getDatabaseConfig,
  getUiConfig,
  getServicesConfig,
  getEnvConfig,
  getCurrentEnv,
  getServerConfig
} from './configLoader';

// Export configuration as the default export
export {
  config as default,
  getAppConfig,
  getApiConfig,
  getFeaturesConfig,
  getDatabaseConfig,
  getUiConfig,
  getServicesConfig,
  getEnvConfig,
  getCurrentEnv,
  getServerConfig
};

// Export the contents of the original configuration files
export * from './billing';
export * from './metafields';
export * from './filterConfig';

/**
 * Import Guidelines:
 * 
 * Recommended import patterns:
 * 
 * - Core configuration:
 *   import config from 'app/config';
 *   import { getAppConfig, getApiConfig } from 'app/config';
 * 
 * - Service-specific configuration:
 *   import { getServicesConfig } from 'app/config';
 *   const { shopify, analytics } = getServicesConfig();
 * 
 * - Server configuration:
 *   import { getServerConfig } from 'app/config';
 *   const { port, cors } = getServerConfig();
 * 
 * - Application-specific configuration:
 *   import { BILLING_CONFIG } from 'app/config';
 */ 