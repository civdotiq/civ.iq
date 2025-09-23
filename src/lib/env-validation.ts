/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Environment variable validation for production deployment
 * Validates required API keys and configuration at startup
 */

interface EnvValidationResult {
  isValid: boolean;
  missingVariables: string[];
  warnings: string[];
}

const REQUIRED_ENV_VARS = ['CONGRESS_API_KEY', 'NODE_ENV'] as const;

const OPTIONAL_ENV_VARS = [
  'FEC_API_KEY',
  'CENSUS_API_KEY',
  'OPENSTATES_API_KEY',
  'REDIS_HOST',
  'REDIS_PASSWORD',
  'OPENAI_API_KEY',
] as const;

export function validateEnvironment(): EnvValidationResult {
  const missingVariables: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVariables.push(varName);
    }
  }

  // Check optional variables and add warnings
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName]) {
      warnings.push(
        `Optional environment variable ${varName} not set - some features may be unavailable`
      );
    }
  }

  // Validate NODE_ENV
  if (
    process.env.NODE_ENV &&
    !['development', 'production', 'test'].includes(process.env.NODE_ENV)
  ) {
    warnings.push('NODE_ENV should be one of: development, production, test');
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    warnings,
  };
}

export function logEnvironmentStatus(): void {
  const result = validateEnvironment();

  if (!result.isValid) {
    // In production, throw an error for missing required variables
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${result.missingVariables.join(', ')}`
      );
    }
  }

  // Return the result for external logging systems to handle
  return;
}

/**
 * Validates that required API keys are available for a specific feature
 */
export function validateFeatureEnvironment(
  feature: 'congress' | 'fec' | 'census' | 'openstates'
): boolean {
  switch (feature) {
    case 'congress':
      return !!process.env.CONGRESS_API_KEY;
    case 'fec':
      return !!process.env.FEC_API_KEY;
    case 'census':
      return !!process.env.CENSUS_API_KEY;
    case 'openstates':
      return !!process.env.OPENSTATES_API_KEY;
    default:
      return false;
  }
}
