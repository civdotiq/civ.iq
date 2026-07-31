/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Adoption telemetry tests
 *
 * Pins the signature extractor, MCP clientInfo shape, and fire-and-forget
 * logger contract. These helpers feed the npm/MCP adoption dashboard, so
 * regressions would make the adoption signal disappear silently — tests are
 * the only alarm.
 */

import {
  extractMcpClientInfo,
  extractMcpToolCalls,
  extractSdkSignature,
  recordMcpInitialize,
  recordMcpToolCall,
  recordSdkRequest,
} from '@/lib/analytics/adoption-telemetry';

describe('extractSdkSignature', () => {
  it('parses a bare SDK UA', () => {
    expect(extractSdkSignature('@civiq/sdk/0.1.0')).toEqual({
      name: '@civiq/sdk',
      version: '0.1.0',
    });
  });

  it('finds the SDK tag inside a composite UA', () => {
    const ua = 'myapp/1.0 @civiq/sdk/1.2.3 node/20.11.0';
    expect(extractSdkSignature(ua)).toEqual({
      name: '@civiq/sdk',
      version: '1.2.3',
    });
  });

  it('accepts prerelease tags', () => {
    expect(extractSdkSignature('@civiq/sdk/0.2.0-beta.1')).toEqual({
      name: '@civiq/sdk',
      version: '0.2.0-beta.1',
    });
  });

  it('returns null for unrelated UAs', () => {
    expect(extractSdkSignature('curl/8.4.0')).toBeNull();
    expect(extractSdkSignature('Mozilla/5.0 (Macintosh)')).toBeNull();
  });

  it('returns null for unsemver versions', () => {
    expect(extractSdkSignature('@civiq/sdk/latest')).toBeNull();
    expect(extractSdkSignature('@civiq/sdk/0.1')).toBeNull();
  });

  it('returns null for missing UA', () => {
    expect(extractSdkSignature(undefined)).toBeNull();
    expect(extractSdkSignature(null)).toBeNull();
    expect(extractSdkSignature('')).toBeNull();
  });
});

describe('extractMcpClientInfo', () => {
  const initializeMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'claude-desktop', version: '0.7.2' },
    },
  };

  it('pulls clientInfo out of a full JSON-RPC initialize message', () => {
    expect(extractMcpClientInfo(initializeMessage)).toEqual({
      clientInfo: { name: 'claude-desktop', version: '0.7.2' },
      protocolVersion: '2024-11-05',
    });
  });

  it('pulls clientInfo out of the bare params object (mcp-handler onEvent)', () => {
    expect(extractMcpClientInfo(initializeMessage.params)).toEqual({
      clientInfo: { name: 'claude-desktop', version: '0.7.2' },
      protocolVersion: '2024-11-05',
    });
  });

  it('scans JSON-RPC batches', () => {
    const batch = [{ method: 'ping' }, initializeMessage];
    expect(extractMcpClientInfo(batch)).toEqual({
      clientInfo: { name: 'claude-desktop', version: '0.7.2' },
      protocolVersion: '2024-11-05',
    });
  });

  it('returns null for non-initialize messages', () => {
    expect(extractMcpClientInfo({ method: 'ping', params: {} })).toBeNull();
  });

  it('returns null when clientInfo is missing or malformed', () => {
    expect(
      extractMcpClientInfo({ method: 'initialize', params: { protocolVersion: '1' } })
    ).toBeNull();
    expect(
      extractMcpClientInfo({
        method: 'initialize',
        params: { clientInfo: { name: 42, version: 'x' } },
      })
    ).toBeNull();
  });

  it('returns null for nullish / unrelated inputs', () => {
    expect(extractMcpClientInfo(null)).toBeNull();
    expect(extractMcpClientInfo(undefined)).toBeNull();
    expect(extractMcpClientInfo('not json')).toBeNull();
    expect(extractMcpClientInfo(42)).toBeNull();
  });

  it('keeps protocolVersion null when the client omits it', () => {
    const msg = {
      method: 'initialize',
      params: { clientInfo: { name: 'custom', version: '0.0.1' } },
    };
    expect(extractMcpClientInfo(msg)).toEqual({
      clientInfo: { name: 'custom', version: '0.0.1' },
      protocolVersion: null,
    });
  });
});

describe('recordSdkRequest', () => {
  it('emits a metric when the UA carries an SDK signature', () => {
    const metric = jest.fn();
    recordSdkRequest('@civiq/sdk/0.1.0', '/api/v1/representatives', 'GET', { metric });
    expect(metric).toHaveBeenCalledWith('adoption.sdk.request', {
      sdk: '@civiq/sdk',
      version: '0.1.0',
      path: '/api/v1/representatives',
      method: 'GET',
    });
  });

  it('no-ops for non-SDK UAs', () => {
    const metric = jest.fn();
    recordSdkRequest('curl/8.4.0', '/api/v1/votes', 'GET', { metric });
    expect(metric).not.toHaveBeenCalled();
  });

  it('no-ops for missing UA', () => {
    const metric = jest.fn();
    recordSdkRequest(null, '/api/v1/votes', 'GET', { metric });
    expect(metric).not.toHaveBeenCalled();
  });
});

describe('extractMcpToolCalls', () => {
  it('pulls the tool name from a tools/call message', () => {
    const msg = { method: 'tools/call', params: { name: 'get_representative', arguments: {} } };
    expect(extractMcpToolCalls(msg)).toEqual(['get_representative']);
  });

  it('pulls every tool name from a batch', () => {
    const batch = [
      { method: 'tools/call', params: { name: 'get_bill' } },
      { method: 'initialize', params: { clientInfo: { name: 'x', version: '1' } } },
      { method: 'tools/call', params: { name: 'get_votes' } },
    ];
    expect(extractMcpToolCalls(batch)).toEqual(['get_bill', 'get_votes']);
  });

  it('ignores non-tools/call methods and malformed params', () => {
    expect(extractMcpToolCalls({ method: 'tools/list' })).toEqual([]);
    expect(extractMcpToolCalls({ method: 'tools/call', params: { name: 42 } })).toEqual([]);
    expect(extractMcpToolCalls({ method: 'tools/call' })).toEqual([]);
    expect(extractMcpToolCalls(null)).toEqual([]);
  });
});

describe('recordMcpToolCall', () => {
  it('emits one metric per invoked tool', () => {
    const metric = jest.fn();
    recordMcpToolCall(
      [
        { method: 'tools/call', params: { name: 'get_bill' } },
        { method: 'tools/call', params: { name: 'get_votes' } },
      ],
      { metric }
    );
    expect(metric).toHaveBeenCalledTimes(2);
    expect(metric).toHaveBeenCalledWith('adoption.mcp.tool_call', { toolName: 'get_bill' });
  });

  it('stays silent on a handshake-only payload', () => {
    const metric = jest.fn();
    recordMcpToolCall({ method: 'initialize', params: {} }, { metric });
    expect(metric).not.toHaveBeenCalled();
  });
});

describe('recordMcpInitialize', () => {
  it('emits a metric on a valid initialize', () => {
    const metric = jest.fn();
    recordMcpInitialize(
      {
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          clientInfo: { name: 'claude-desktop', version: '0.7.2' },
        },
      },
      { metric }
    );
    expect(metric).toHaveBeenCalledWith('adoption.mcp.initialize', {
      clientName: 'claude-desktop',
      clientVersion: '0.7.2',
      protocolVersion: '2024-11-05',
    });
  });

  it('accepts bare params (the onEvent shape)', () => {
    const metric = jest.fn();
    recordMcpInitialize(
      {
        protocolVersion: '2025-03-26',
        clientInfo: { name: 'custom-agent', version: '2.0.0' },
      },
      { metric }
    );
    expect(metric).toHaveBeenCalledWith('adoption.mcp.initialize', {
      clientName: 'custom-agent',
      clientVersion: '2.0.0',
      protocolVersion: '2025-03-26',
    });
  });

  it('no-ops for non-initialize traffic', () => {
    const metric = jest.fn();
    recordMcpInitialize({ method: 'tools/list' }, { metric });
    expect(metric).not.toHaveBeenCalled();
  });
});
