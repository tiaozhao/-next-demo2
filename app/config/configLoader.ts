/**
 * Configuration Loader
 * 
 * This module loads environment-specific configurations from YAML files
 * and validates them against their respective JSON schemas.
 */

import yaml from 'yaml';
import Ajv from 'ajv';
import { loggerService } from '~/lib/logger';

// Get current environment
const ENV = process.env.NODE_ENV || 'development';
const VALID_ENVIRONMENTS = ['development', 'production', 'test'];

// Check if the environment is valid, otherwise default to development
const environment = VALID_ENVIRONMENTS.includes(ENV) ? ENV : 'development';

// Configuration type (will be inferred from the schema)
type ConfigType = any;

// Import config files using Vite's import.meta.glob
const configs = import.meta.glob('./**/config.yaml', { eager: true, as: 'raw' });
const schemas = import.meta.glob('./**/schema.json', { eager: true, as: 'raw' });

/**
 * Load and validate configuration for the current environment
 */
export function loadConfig(): ConfigType {
  try {
    // Find the config file for current environment
    const configFile = Object.entries(configs).find(([path]) =>
      path.includes(`/${environment}/config.yaml`)
    );

    if (!configFile) {
      console.error(`Configuration file not found for environment: ${environment}`);
      return loadFallbackConfig();
    }

    const config = yaml.parse(configFile[1]);

    // Find and validate against schema if it exists
    const schemaFile = Object.entries(schemas).find(([path]) =>
      path.includes(`/${environment}/schema.json`)
    );

    if (schemaFile) {
      const schema = JSON.parse(schemaFile[1]);
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(schema);
      const valid = validate(config);

      if (!valid) {
        console.error('Configuration validation errors:', validate.errors);
        return loadFallbackConfig();
      }
    } else {
      console.warn(`Schema file not found for environment: ${environment}. Skipping validation.`);
    }

    // Merge with environment variables
    const envConfig = loadEnvVariables();

    return {
      ...config,
      env: envConfig,
      currentEnv: environment
    };
  } catch (error) {
    console.error(`Error loading configuration: ${error}`);
    return loadFallbackConfig();
  }
}

/**
 * Load environment variables
 */
function loadEnvVariables() {
  return {
    port: process.env.PORT,
    shopifyApiKey: process.env.SHOPIFY_API_KEY,
    shopifyApiSecret: process.env.SHOPIFY_API_SECRET,
    shopifyApiUrl: process.env.SHOPIFY_APP_URL,
    dbUrl: process.env.POSTGRES_PRISMA_URL,
    allowedOrigins: process.env.ALLOWED_ORIGINS,
    apiEndpoint: process.env.VITE_PUBLIC_API_V1_ENDPOINT,
    aiKey: process.env.API_KEY,
    shopifyStoreExtensionsId: process.env.SHOPIFY_STORE_EXTENSIONS_ID,
    shopifyCartTransformQuoteId: process.env.SHOPIFY_CART_TRANSFORM_QUOTE_ID
  };
}

/**
 * Load fallback configuration (development or default)
 */
function loadFallbackConfig(): ConfigType {
  // Try to load development config as fallback
  if (environment !== 'development') {
    try {
      // Try to find development config
      const fallbackFile = Object.entries(configs).find(([path]) =>
        path.includes('/development/config.yaml')
      );

      if (fallbackFile) {
        console.warn('Using development configuration as fallback');
        const fallbackConfig = yaml.parse(fallbackFile[1]);

        // Merge with environment variables
        const envConfig = loadEnvVariables();
        return {
          ...fallbackConfig,
          env: envConfig,
          currentEnv: 'development (fallback)'
        };
      }
    } catch (error) {
      console.error(`Error loading fallback configuration: ${error}`);
    }
  }

  // Return default configuration if all else fails
  console.warn('Using default configuration');
  return {
    app: { name: 'Default App', logLevel: 'info', version: '1.0.0' },
    api: { timeout: 5000, retries: 3 },
    features: { enableAI: false, enableTelemetry: false, enableDebugMode: false },
    database: {
      poolSize: 5,
      connectionTimeout: 10000,
      idleTimeout: 20000,
      maxConnections: 10,
      minConnections: 2
    },
    ui: {
      theme: 'light',
      animation: false,
      itemsPerPage: 10,
      enableDevTools: false
    },
    services: {
      shopify: {
        apiVersion: '2024-10',
        storageEngine: 'memory'
      },
      analytics: {
        provider: 'none',
        sampleRate: 0
      },
      cache: {
        ttl: 60,
        provider: 'memory'
      },
      ai: {
        provider: 'mock',
        model: 'test-model'
      },
      storage: {
        bucketName: 'default-storage'
      },
      coveo: {
        organizationId: 'default-org-id',
        sourceId: 'default-source-id'
      }
    },
    server: {
      port: 3000,
      cors: {
        allowedOrigins: '*'
      }
    },
    env: loadEnvVariables(),
    currentEnv: 'default'
  };
}

// Create and export configuration instance
const config = loadConfig();

export default config;

// Helper functions for accessing specific parts of the configuration
export const getAppConfig = () => config.app;
export const getApiConfig = () => config.api;
export const getFeaturesConfig = () => config.features;
export const getDatabaseConfig = () => config.database;
export const getUiConfig = () => config.ui;
export const getServicesConfig = () => config.services;
export const getEnvConfig = () => config.env;
export const getCurrentEnv = () => config.currentEnv;
export const getServerConfig = () => config.server; 