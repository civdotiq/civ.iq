/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

export interface ApiKeyConfig {
  requiredForRoutes: string[];
  optionalForRoutes: string[];
  adminRoutes: string[];
}

interface ApiKey {
  key: string;
  name: string;
  permissions: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

class ApiKeyManager {
  private keys = new Map<string, ApiKey>();

  constructor() {
    this.loadDefaultKeys();
  }

  private loadDefaultKeys() {
    // Create a default internal API key for server-to-server communication
    const internalKey = this.generateApiKey();
    this.keys.set(this.hashKey(internalKey), {
      key: internalKey,
      name: 'Internal Server Key',
      permissions: ['read', 'write', 'admin'],
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    // Internal key is generated but not logged for security reasons
  }

  private generateApiKey(): string {
    const timestamp = Date.now().toString(36);
    const secureRandom = randomBytes(16).toString('hex');
    return `civiq_${timestamp}_${secureRandom}`;
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  validateKey(key: string): ApiKey | null {
    const hashedKey = this.hashKey(key);
    const apiKey = this.keys.get(hashedKey);

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // Update last used timestamp
    apiKey.lastUsed = new Date().toISOString();
    return apiKey;
  }

  createKey(name: string, permissions: string[]): string {
    const key = this.generateApiKey();
    const hashedKey = this.hashKey(key);

    this.keys.set(hashedKey, {
      key,
      name,
      permissions,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    return key;
  }

  revokeKey(key: string): boolean {
    const hashedKey = this.hashKey(key);
    const apiKey = this.keys.get(hashedKey);

    if (apiKey) {
      apiKey.isActive = false;
      return true;
    }

    return false;
  }

  listKeys(): Omit<ApiKey, 'key'>[] {
    return Array.from(this.keys.values()).map(({ key: _key, ...rest }) => rest);
  }
}

const apiKeyManager = new ApiKeyManager();

// Default configuration
const defaultConfig: ApiKeyConfig = {
  requiredForRoutes: ['/api/admin', '/api/internal'],
  optionalForRoutes: ['/api/representatives', '/api/district-map', '/api/representative'],
  adminRoutes: ['/api/admin'],
};

export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter (less secure, only for development)
  if (process.env.NODE_ENV === 'development') {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('api_key');
    if (apiKey) {
      return apiKey;
    }
  }

  return null;
}

export function requireAuth(permissions: string[] = ['read']) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (request: NextRequest, ...args: unknown[]) {
      const apiKey = extractApiKey(request);

      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key required', message: 'Please provide a valid API key' },
          { status: 401 }
        );
      }

      const keyData = apiKeyManager.validateKey(apiKey);
      if (!keyData) {
        return NextResponse.json(
          { error: 'Invalid API key', message: 'The provided API key is invalid or inactive' },
          { status: 401 }
        );
      }

      // Check permissions
      const hasPermission = permissions.every(
        permission =>
          keyData.permissions.includes(permission) || keyData.permissions.includes('admin')
      );

      if (!hasPermission) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            message: `This API key does not have the required permissions: ${permissions.join(', ')}`,
            required: permissions,
            granted: keyData.permissions,
          },
          { status: 403 }
        );
      }

      // Add API key info to request for logging
      (request as unknown as { apiKey: ApiKey }).apiKey = keyData;

      return originalMethod.call(this, request, ...args);
    };

    return descriptor;
  };
}

export async function checkAuth(
  request: NextRequest,
  config: ApiKeyConfig = defaultConfig
): Promise<{
  isAuthenticated: boolean;
  apiKey?: ApiKey;
  response?: NextResponse;
}> {
  const pathname = new URL(request.url).pathname;

  // Check if route requires authentication
  const requiresAuth = config.requiredForRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = config.adminRoutes.some(route => pathname.startsWith(route));

  if (!requiresAuth && !isAdminRoute) {
    return { isAuthenticated: true };
  }

  const apiKeyString = extractApiKey(request);

  if (!apiKeyString) {
    return {
      isAuthenticated: false,
      response: NextResponse.json(
        { error: 'API key required', message: 'Please provide a valid API key' },
        { status: 401 }
      ),
    };
  }

  const apiKey = apiKeyManager.validateKey(apiKeyString);
  if (!apiKey) {
    return {
      isAuthenticated: false,
      response: NextResponse.json(
        { error: 'Invalid API key', message: 'The provided API key is invalid or inactive' },
        { status: 401 }
      ),
    };
  }

  // Check admin permissions for admin routes
  if (isAdminRoute && !apiKey.permissions.includes('admin')) {
    return {
      isAuthenticated: false,
      response: NextResponse.json(
        {
          error: 'Insufficient permissions',
          message: 'Admin access required for this endpoint',
        },
        { status: 403 }
      ),
    };
  }

  return {
    isAuthenticated: true,
    apiKey,
  };
}

// Helper function to apply authentication to API routes
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, apiKey?: ApiKey) => Promise<NextResponse>,
  config: ApiKeyConfig = defaultConfig
): Promise<NextResponse> {
  const authResult = await checkAuth(request, config);

  if (!authResult.isAuthenticated && authResult.response) {
    return authResult.response;
  }

  try {
    return await handler(request, authResult.apiKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export the API key manager for administration
export { apiKeyManager };
