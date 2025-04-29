# Environment Configuration System

This configuration module provides a unified configuration management solution, supporting environment-specific configurations and Schema validation. It maintains backward compatibility with existing code while introducing a more structured configuration management approach.

## Directory Structure

```
app/config/
├── development/                     # Development environment
│   ├── config.yaml                  # Development environment configuration
│   └── schema.json                  # Development environment Schema validation
│
├── production/                      # Production environment
│   ├── config.yaml                  # Production environment configuration
│   └── schema.json                  # Production environment Schema validation
│
├── test/                            # Test environment
│   ├── config.yaml                  # Test environment configuration
│   └── schema.json                  # Test environment Schema validation
│
├── configLoader.ts                  # Configuration loading and validation logic
├── index.ts                         # Main entry point (re-exporting all configurations)
├── README.md                        # This document
│
├── billing.ts                       # Billing configuration
├── metafields.ts                    # Metafield definitions
└── filterConfig.tsx                 # UI filter configuration
```

## Key Features

1. **Environment-Based Configuration**:
   - Each environment (development, production, test) has a separate configuration file
   - Configuration is loaded based on the NODE_ENV environment variable

2. **Schema Validation**:
   - Each environment has a JSON Schema definition for structure and validation of configuration
   - Ensures the completeness of configuration and early detection of errors

3. **Fallback Mechanism**:
   - If the configuration for the current environment is missing or invalid, falls back to the development environment configuration
   - If all configurations fail, uses reasonable default values

4. **Backward Compatibility**:
   - Retains all existing configuration files
   - Continues to support existing code imported from the configuration module

## Usage

### Basic Usage

```typescript
import config from 'app/config';

// Accessing configuration properties
console.log(config.app.name);        // Application name
console.log(config.api.timeout);     // API timeout (milliseconds)
console.log(config.features.enableAI); // AI feature enabled
```

### Using Helper Functions

```typescript
import { 
  getAppConfig, 
  getApiConfig, 
  getFeaturesConfig,
  getServicesConfig,
  getEnvConfig,
  getCurrentEnv
} from 'app/config';

// Getting application configuration
const appConfig = getAppConfig();
console.log(appConfig.name, appConfig.version);

// Getting API configuration
const apiConfig = getApiConfig();
console.log(apiConfig.timeout, apiConfig.retries);

// Getting services configuration
const services = getServicesConfig();
console.log(services.shopify.apiVersion);
console.log(services.analytics.provider);

// Getting the current environment
console.log('Current Environment:', getCurrentEnv());
```

### Accessing Environment Variables

Environment variables (from .env file) can be accessed through the `env` property:

```typescript
import config from 'app/config';

// Accessing environment variables
console.log(config.env.port);
console.log(config.env.shopifyApiKey);

// Or using helper functions
import { getEnvConfig } from 'app/config';
const env = getEnvConfig();
console.log(env.shopifyApiUrl);
```

### Backward Compatibility

For code that depends on the original configuration files:

```typescript
// These imports are still valid for backward compatibility
import { BILLING_CONFIG } from 'app/config';
import { METAFIELD_DEFINITIONS } from 'app/config';
import { draftOrderFilterConfig } from 'app/config';
```

## Extending Configuration

### Adding New Configuration Properties

1. Update the YAML configuration files in each environment directory:
   ```yaml
   # development/config.yaml
   newSection:
     property1: value1
     property2: value2
   ```

2. Update the JSON Schema files to include the new properties:
   ```json
   {
     "properties": {
       "newSection": {
         "type": "object",
         "required": ["property1", "property2"],
         "properties": {
           "property1": { "type": "string" },
           "property2": { "type": "string" }
         }
       }
     }
   }
   ```

3. If necessary, add helper functions in `configLoader.ts`:
   ```typescript
   export const getNewSectionConfig = () => config.newSection;
   ```

4. Export the helper functions in `index.ts`

### Adding a New Environment

1. Create a new directory named after the environment under app/config/
2. Add `config.yaml` and `schema.json` files
3. Update the `VALID_ENVIRONMENTS` in `configLoader.ts` to include the new environment

## Environment Variables

Environment variables are loaded from the `.env` file and merged with the configuration. The following environment variables are supported:

- `NODE_ENV`: Determines which environment configuration to load
- `PORT`: Server port
- `SHOPIFY_API_KEY`: Shopify API key
- `SHOPIFY_API_SECRET`: Shopify API secret
- `SHOPIFY_APP_URL`: Shopify application URL
- `POSTGRES_PRISMA_URL`: Database connection URL
- `ALLOWED_ORIGINS`: CORS allowed origins
- `VITE_PUBLIC_API_V1_ENDPOINT`: Public API endpoint

## Schema Validation

JSON Schema validation ensures that configuration files conform to the expected structure and constraints. If validation fails, the system falls back to the development environment configuration or default values.

Benefits of Schema validation:
- Early detection of configuration errors
- Documentation of configuration structure
- Better error information
- Enforcement of type constraints and valid values 