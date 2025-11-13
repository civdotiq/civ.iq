/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * API Key Validation Utilities
 *
 * Validates API keys for format, security, and proper configuration
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a single API key for common security issues
 */
export function validateApiKey(key: string | undefined, keyName: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if key exists
  if (!key || key.trim() === '') {
    errors.push(`${keyName} is missing or empty`);
    return { isValid: false, errors, warnings };
  }

  // Check for placeholder values
  const placeholders = [
    'your_api_key_here',
    'your_key',
    'replace_me',
    'changeme',
    'example',
    'test',
    'demo',
  ];

  if (placeholders.some(placeholder => key.toLowerCase().includes(placeholder))) {
    errors.push(`${keyName} contains a placeholder value`);
  }

  // Check for whitespace
  if (key !== key.trim()) {
    errors.push(`${keyName} contains leading or trailing whitespace`);
  }

  if (key.includes(' ')) {
    errors.push(`${keyName} contains spaces (likely invalid format)`);
  }

  // Check minimum length (most API keys are at least 20 characters)
  if (key.length < 20) {
    warnings.push(`${keyName} is shorter than 20 characters (may be invalid)`);
  }

  // Check for common patterns that indicate test/fake keys
  if (key.startsWith('sk-test') || key.startsWith('pk-test')) {
    warnings.push(`${keyName} appears to be a test key`);
  }

  // Check for exposed keys in code (single/double quotes around key)
  if (key.startsWith('"') || key.startsWith("'") || key.endsWith('"') || key.endsWith("'")) {
    errors.push(`${keyName} has quotes in the value (environment variable error)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all required API keys for the application
 */
export function validateAllApiKeys(): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Required keys
  const requiredKeys = [
    { name: 'CONGRESS_API_KEY', value: process.env.CONGRESS_API_KEY },
    { name: 'FEC_API_KEY', value: process.env.FEC_API_KEY },
    { name: 'OPENSTATES_API_KEY', value: process.env.OPENSTATES_API_KEY },
    { name: 'CENSUS_API_KEY', value: process.env.CENSUS_API_KEY },
  ];

  // Optional keys
  const optionalKeys = [
    { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY },
    { name: 'NEWSAPI_KEY', value: process.env.NEWSAPI_KEY },
  ];

  // Validate required keys
  for (const { name, value } of requiredKeys) {
    const result = validateApiKey(value, name);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  // Validate optional keys if they exist
  for (const { name, value } of optionalKeys) {
    if (value) {
      const result = validateApiKey(value, name);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }
  }

  // Validate Redis configuration
  const hasUpstashRest = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasTraditionalRedis = process.env.REDIS_HOST || process.env.REDIS_URL;

  if (!hasUpstashRest && !hasTraditionalRedis) {
    allWarnings.push('No Redis configuration found (will use in-memory cache only)');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Check if application is in production mode
 */
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Validate production-specific requirements
 */
export function validateProductionConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isProductionEnvironment()) {
    return { isValid: true, errors, warnings };
  }

  // Production-specific checks
  if (process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://')) {
    warnings.push('NEXT_PUBLIC_APP_URL uses HTTP in production (should use HTTPS)');
  }

  if (!process.env.CACHE_WARM_SECRET) {
    warnings.push('CACHE_WARM_SECRET not set (cache warming endpoint unprotected)');
  }

  // Check for development values in production
  if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
    errors.push('NEXT_PUBLIC_APP_URL points to localhost in production');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate a validation report for logging
 */
export function generateValidationReport(): string {
  const apiKeyResults = validateAllApiKeys();
  const prodResults = validateProductionConfig();

  const lines: string[] = [];
  lines.push('=== API Key Validation Report ===');
  lines.push('');

  if (apiKeyResults.isValid) {
    lines.push('✅ All required API keys are valid');
  } else {
    lines.push('❌ API key validation failed:');
    apiKeyResults.errors.forEach(error => lines.push(`  - ${error}`));
  }

  if (apiKeyResults.warnings.length > 0) {
    lines.push('');
    lines.push('⚠️  Warnings:');
    apiKeyResults.warnings.forEach(warning => lines.push(`  - ${warning}`));
  }

  if (!prodResults.isValid || prodResults.warnings.length > 0) {
    lines.push('');
    lines.push('=== Production Configuration ===');

    if (!prodResults.isValid) {
      lines.push('❌ Production configuration errors:');
      prodResults.errors.forEach(error => lines.push(`  - ${error}`));
    }

    if (prodResults.warnings.length > 0) {
      lines.push('⚠️  Production warnings:');
      prodResults.warnings.forEach(warning => lines.push(`  - ${warning}`));
    }
  }

  return lines.join('\n');
}
