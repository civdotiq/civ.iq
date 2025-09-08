// Set test environment
process.env.NODE_ENV = 'test';

import '@testing-library/jest-dom';

// Comprehensive React DOM environment setup
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Set up ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Set up IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// React DOM compatibility fix for testing-library/react 16.x with React 18.x
if (typeof window !== 'undefined') {
  // Fix for React DOM compatibility issue
  if (!window.location.pathname) {
    window.location.pathname = '/';
  }

  // Set up basic window properties
  if (!window.HTMLCanvasElement) {
    window.HTMLCanvasElement = HTMLCanvasElement;
  }

  // Fix React DOM version compatibility
  if (!global.IS_REACT_ACT_ENVIRONMENT) {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  }

  // Ensure window.location is fully defined only if not already defined
  if (!window.location) {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        protocol: 'http:',
        host: 'localhost:3000',
        hostname: 'localhost',
        port: '3000',
        pathname: '/',
        search: '',
        hash: '',
        assign: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
        toString: jest.fn(() => 'http://localhost:3000'),
      },
      writable: true,
    });
  } else {
    // Ensure required methods exist on existing location
    if (!window.location.assign) window.location.assign = jest.fn();
    if (!window.location.replace) window.location.replace = jest.fn();
    if (!window.location.reload) window.location.reload = jest.fn();
  }
}

// Additional React DOM environment setup
if (typeof document !== 'undefined') {
  // Ensure document is fully set up for React DOM
  Object.defineProperty(document, 'createRange', {
    value: () => ({
      selectNodeContents: jest.fn(),
      setStart: jest.fn(),
      setEnd: jest.fn(),
      commonAncestorContainer: document.createElement('div'),
      startContainer: document.createElement('div'),
      endContainer: document.createElement('div'),
      startOffset: 0,
      endOffset: 0,
      collapsed: true,
      cloneContents: jest.fn(() => document.createElement('div')),
      deleteContents: jest.fn(),
      extractContents: jest.fn(() => document.createElement('div')),
      insertNode: jest.fn(),
      surroundContents: jest.fn(),
      compareBoundaryPoints: jest.fn(() => 0),
      cloneRange: jest.fn(),
      detach: jest.fn(),
      toString: jest.fn(() => ''),
    }),
    writable: true,
  });
}

// Ensure document.body exists
if (!global.document.body) {
  global.document.body = global.document.createElement('body');
}

// Mock performance.now for cardGenerator
let mockTime = 0;
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => {
      mockTime += 1; // Increment each time to simulate passage of time
      return mockTime;
    }),
  },
  writable: true,
});

// Mock next/server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((input, init) => {
    return {
      url: input,
      method: 'GET',
      headers: new Map(),
      nextUrl: new URL(input),
      ...init,
    };
  }),
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Map(),
    })),
  },
}));

// Mock React cache function and React DOM fixes
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: jest.fn().mockImplementation(fn => fn),
}));

// Add experimental fix for React DOM compatibility - temporarily disabled to debug
// /* eslint-disable no-console */
// const originalError = console.error;
// console.error = (...args) => {
//   if (
//     (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is deprecated'))
//   ) {
//     return;
//   }
//   originalError.call(console, ...args);
// };
// /* eslint-enable no-console */

// Mock environment variables for tests
process.env.CONGRESS_API_KEY = 'test_congress_key';
process.env.FEC_API_KEY = 'test_fec_key';
process.env.OPENSTATES_API_KEY = 'test_openstates_key';

// Mock fetch globally with dynamic responses
global.fetch = jest.fn().mockImplementation(url => {
  const urlStr = typeof url === 'string' ? url : url.toString();

  // Check for validation error scenarios
  if (
    urlStr.includes('state=INVALID') ||
    urlStr.includes('district=-1') ||
    urlStr.includes('district=999') ||
    (urlStr.includes('district=') && !urlStr.includes('state='))
  ) {
    const isMissingState = urlStr.includes('district=') && !urlStr.includes('state=');
    const isInvalidDistrict = urlStr.includes('district=-1') || urlStr.includes('district=999');

    return Promise.resolve({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: urlStr.includes('state=INVALID')
            ? 'INVALID_STATE_CODE'
            : isInvalidDistrict
              ? 'INVALID_DISTRICT_NUMBER'
              : 'MISSING_PARAMETERS',
          message: isMissingState
            ? 'Missing required parameter: state'
            : 'Invalid parameters provided',
          details: 'Validation failed',
        },
      }),
    });
  }

  // Check for empty results scenario
  if (urlStr.includes('state=XX')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: jest.fn().mockImplementation(key => {
          const headers = {
            'cache-control': 'max-age=3600',
            'x-data-source': 'congress-legislators',
          };
          return headers[key.toLowerCase()];
        }),
      },
      json: jest.fn().mockResolvedValue({
        success: true,
        data: [],
        count: 0,
        pagination: {
          total: 0,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          totalCount: 0,
          dataSource: 'congress-legislators',
          dataQuality: 'high',
          freshness: 'Retrieved in 100ms',
          cacheable: true,
          processingTime: 150,
        },
      }),
      text: jest.fn().mockResolvedValue(''),
      blob: jest.fn().mockResolvedValue(new Blob()),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    });
  }

  // Create mock representative data with format support
  const createMockRep = (id, name, isSimpleFormat = false, overrides = {}) => {
    const baseRep = {
      bioguideId: id,
      name,
      party: 'Democrat',
      state: 'CA',
      ...overrides,
    };

    if (isSimpleFormat) {
      // Simple format: only basic fields
      return baseRep;
    }

    // Detailed format: all fields
    return {
      ...baseRep,
      chamber: 'House',
      title: 'Representative',
      district: '12',
      contactInfo: {
        phone: '202-225-0000',
        office: 'Rayburn House Office Building',
      },
      committees: [],
      terms: [],
      currentTerm: {
        start: '2023-01-03',
        end: '2025-01-03',
        type: 'rep',
      },
      ...overrides,
    };
  };

  // Check if simple format is requested
  const isSimpleFormat = urlStr.includes('format=simple');

  // Default successful response
  let mockData = [];

  if (urlStr.includes('includeAll=true')) {
    mockData = [
      createMockRep('A000001', 'Test Rep 1', isSimpleFormat),
      createMockRep('A000002', 'Test Rep 2', isSimpleFormat),
    ];
  } else if (urlStr.includes('chamber=Senate')) {
    mockData = [
      createMockRep('S000001', 'Test Sen 1', isSimpleFormat, {
        chamber: 'Senate',
        title: 'Senator',
        district: null,
      }),
    ];
  } else if (urlStr.includes('party=Democrat') && !urlStr.includes('Republican')) {
    mockData = [createMockRep('D000001', 'Test Democrat 1', isSimpleFormat, { party: 'Democrat' })];
  } else if (urlStr.includes('party=Democrat,Republican')) {
    mockData = [
      createMockRep('D000001', 'Test Democrat 1', isSimpleFormat, { party: 'Democrat' }),
      createMockRep('R000001', 'Test Republican 1', isSimpleFormat, { party: 'Republican' }),
    ];
  } else {
    mockData = [createMockRep('A000001', 'Test Rep 1', isSimpleFormat)];
  }

  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: jest.fn().mockImplementation(key => {
        const headers = {
          'cache-control': 'max-age=3600',
          'x-data-source': 'congress-legislators',
        };
        return headers[key.toLowerCase()];
      }),
    },
    json: jest.fn().mockResolvedValue({
      success: true,
      data: mockData,
      count: mockData.length,
      pagination: {
        total: mockData.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        totalCount: mockData.length,
        dataSource: 'congress-legislators',
        dataQuality: 'high',
        freshness: 'Retrieved in 100ms',
        cacheable: true,
        processingTime: 150,
      },
    }),
    text: jest.fn().mockResolvedValue(''),
    blob: jest.fn().mockResolvedValue(new Blob()),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  });
});

// Mock browser APIs for cardGenerator tests
if (!global.window.devicePixelRatio) {
  global.window.devicePixelRatio = 2;
}

// Mock HTML Canvas for cardGenerator tests
Object.defineProperty(global.HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn().mockImplementation(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  })),
  writable: true,
});

Object.defineProperty(global.HTMLAnchorElement.prototype, 'download', {
  value: '',
  writable: true,
});

// Mock navigator APIs for sharing tests
Object.defineProperty(global, 'navigator', {
  value: {
    ...global.navigator,
    clipboard: {
      writeText: jest.fn(() => Promise.resolve()),
    },
    share: jest.fn(() => Promise.resolve()),
  },
  writable: true,
});

// Mock html2canvas
jest.mock('html2canvas', () => {
  return jest.fn().mockImplementation(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 500;
    return Promise.resolve(canvas);
  });
});

// Mock console methods to reduce noise in tests (but preserve original methods for React DOM)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  // Keep original error for React DOM compatibility
  error: originalConsole.error,
};

// Add setImmediate polyfill for Winston logger
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
