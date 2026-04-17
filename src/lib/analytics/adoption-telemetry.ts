/**
 * Adoption telemetry — surfaces who is actually consuming the CIV.IQ backbone.
 *
 * We record two signals:
 *  - MCP initialize requests capture `clientInfo.{name,version}` via JSON-RPC.
 *  - REST API requests capture `@civiq/sdk/<version>` signatures from the
 *    User-Agent header.
 *
 * Both are fire-and-forget and must never throw — adoption telemetry is
 * advisory, not load-bearing. If a consumer sends a malformed body or
 * lies in the User-Agent, we silently drop the event.
 *
 * Structured logs land wherever the platform is routing stdout; on Vercel
 * they end up in the log drain. A weekly job (scripts/fetch-adoption.ts)
 * also snapshots npm download counts for the three published packages.
 */

// Match signatures like "@civiq/sdk/0.1.0" anywhere inside a UA string so we
// can detect SDK usage even when consumers append their own app name.
// Examples we recognize:
//   "@civiq/sdk/0.1.0"
//   "myapp/1.0 @civiq/sdk/0.1.0 node/20.11"
const SDK_UA_PATTERN = /@civiq\/sdk\/(\d+\.\d+\.\d+(?:-[\w.]+)?)/;

export interface SdkSignature {
  name: '@civiq/sdk';
  version: string;
}

export function extractSdkSignature(userAgent: string | null | undefined): SdkSignature | null {
  if (!userAgent) return null;
  const match = userAgent.match(SDK_UA_PATTERN);
  if (!match) return null;
  const version = match[1];
  if (!version) return null;
  return { name: '@civiq/sdk', version };
}

export interface McpClientInfo {
  name: string;
  version: string;
}

/**
 * Extract clientInfo from either:
 *  - a JSON-RPC message (or batch) where at least one entry has
 *    method=`initialize`, or
 *  - the bare `params` object from an initialize request (the shape
 *    mcp-handler's onEvent passes as `parameters`).
 */
export function extractMcpClientInfo(input: unknown): {
  clientInfo: McpClientInfo;
  protocolVersion: string | null;
} | null {
  const candidates = Array.isArray(input) ? input : [input];
  for (const candidate of candidates) {
    const params = resolveInitializeParams(candidate);
    if (!params) continue;
    const clientInfo = (params as { clientInfo?: unknown }).clientInfo;
    if (!isClientInfo(clientInfo)) continue;
    const protocolVersion =
      typeof (params as { protocolVersion?: unknown }).protocolVersion === 'string'
        ? (params as { protocolVersion: string }).protocolVersion
        : null;
    return { clientInfo, protocolVersion };
  }
  return null;
}

function resolveInitializeParams(candidate: unknown): Record<string, unknown> | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const obj = candidate as Record<string, unknown>;
  // Full JSON-RPC message: require method === "initialize".
  if (obj.method === 'initialize' && obj.params && typeof obj.params === 'object') {
    return obj.params as Record<string, unknown>;
  }
  // Bare params object: accept when it carries a clientInfo field.
  if ('clientInfo' in obj) {
    return obj;
  }
  return null;
}

function isClientInfo(value: unknown): value is McpClientInfo {
  if (!value || typeof value !== 'object') return false;
  const { name, version } = value as { name?: unknown; version?: unknown };
  return typeof name === 'string' && typeof version === 'string';
}

interface AdoptionLogger {
  metric: (name: string, data: Record<string, unknown>) => void;
}

const edgeSafeLogger: AdoptionLogger = {
  metric: (name, data) => {
    try {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          level: 'metric',
          timestamp: new Date().toISOString(),
          message: name,
          data,
        })
      );
    } catch {
      // Swallow — telemetry must never throw.
    }
  },
};

export function recordSdkRequest(
  userAgent: string | null | undefined,
  path: string,
  method: string,
  logger: AdoptionLogger = edgeSafeLogger
): void {
  const sig = extractSdkSignature(userAgent);
  if (!sig) return;
  logger.metric('adoption.sdk.request', {
    sdk: sig.name,
    version: sig.version,
    path,
    method,
  });
}

export function recordMcpInitialize(body: unknown, logger: AdoptionLogger = edgeSafeLogger): void {
  const info = extractMcpClientInfo(body);
  if (!info) return;
  logger.metric('adoption.mcp.initialize', {
    clientName: info.clientInfo.name,
    clientVersion: info.clientInfo.version,
    protocolVersion: info.protocolVersion,
  });
}
