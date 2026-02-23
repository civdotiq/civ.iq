/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Structured Logger Tests
 *
 * Validates JSON-structured log output and API surface.
 */

import logger from '@/lib/logging/simple-logger';

describe('Structured Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function getLogOutput(spy: jest.SpyInstance): Record<string, unknown> {
    const raw = spy.mock.calls[0]![0] as string;
    return JSON.parse(raw) as Record<string, unknown>;
  }

  describe('API surface', () => {
    it('should expose info, error, warn, debug, metric methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.metric).toBe('function');
    });
  });

  describe('JSON structure', () => {
    it('should output valid JSON', () => {
      logger.info('test message');
      const raw = consoleSpy.log.mock.calls[0]![0] as string;
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('should include level, timestamp, and message', () => {
      logger.info('hello world');
      const output = getLogOutput(consoleSpy.log);
      expect(output.level).toBe('info');
      expect(output.message).toBe('hello world');
      expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should set correct level for each method', () => {
      logger.info('i');
      logger.error('e');
      logger.warn('w');
      logger.debug('d');

      expect(getLogOutput(consoleSpy.log).level).toBe('info');
      expect(getLogOutput(consoleSpy.error).level).toBe('error');
      expect(getLogOutput(consoleSpy.warn).level).toBe('warn');

      // debug is the second call to console.log
      const debugRaw = consoleSpy.log.mock.calls[1]![0] as string;
      const debugOutput = JSON.parse(debugRaw) as Record<string, unknown>;
      expect(debugOutput.level).toBe('debug');
    });
  });

  describe('data handling', () => {
    it('should include plain object as data field', () => {
      logger.info('request', { method: 'GET', path: '/api/v1' });
      const output = getLogOutput(consoleSpy.log);
      expect(output.data).toEqual({ method: 'GET', path: '/api/v1' });
    });

    it('should handle Error objects specially', () => {
      const err = new Error('something broke');
      logger.error('failure', err);
      const output = getLogOutput(consoleSpy.error);
      const error = output.error as Record<string, unknown>;
      expect(error.name).toBe('Error');
      expect(error.message).toBe('something broke');
      expect(error.stack).toBeDefined();
    });

    it('should handle mixed Error + data args', () => {
      const err = new Error('oops');
      logger.error('failure', err, { extra: 'context' });
      const output = getLogOutput(consoleSpy.error);
      expect(output.error).toBeDefined();
      expect(output.data).toEqual({ extra: 'context' });
    });

    it('should convert non-string message to string', () => {
      logger.info(42);
      const output = getLogOutput(consoleSpy.log);
      expect(output.message).toBe('42');
    });
  });

  describe('metric method', () => {
    it('should output metric level with data', () => {
      logger.metric('api.latency', { p50: 120, p99: 450 });
      const output = getLogOutput(consoleSpy.log);
      expect(output.level).toBe('metric');
      expect(output.message).toBe('api.latency');
      expect(output.data).toEqual({ p50: 120, p99: 450 });
    });
  });

  describe('routing to correct console method', () => {
    it('should route info to console.log', () => {
      logger.info('test');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it('should route error to console.error', () => {
      logger.error('test');
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should route warn to console.warn', () => {
      logger.warn('test');
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });

    it('should route debug to console.log', () => {
      logger.debug('test');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });
  });
});
