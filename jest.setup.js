// Set test environment
process.env.NODE_ENV = 'test'

import '@testing-library/jest-dom'

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

// React DOM compatibility fix
if (typeof window !== 'undefined') {
  // Set up basic window properties
  if (!window.HTMLCanvasElement) {
    window.HTMLCanvasElement = HTMLCanvasElement;
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
      writable: true
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
  global.document.body = global.document.createElement('body')
}

// Mock performance.now for cardGenerator
let mockTime = 0;
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => {
      mockTime += 1; // Increment each time to simulate passage of time
      return mockTime;
    })
  },
  writable: true
})

// Mock next/server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((input, init) => {
    return {
      url: input,
      method: 'GET',
      headers: new Map(),
      nextUrl: new URL(input),
      ...init
    }
  }),
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Map()
    }))
  }
}))

// Mock React cache function and React DOM fixes
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: jest.fn().mockImplementation((fn) => fn)
}))

// Add experimental fix for React DOM compatibility
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    args[0].includes('Warning: ReactDOM.render is deprecated') ||
    args[0].includes('Cannot read properties of undefined (reading \'indexOf\')')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Mock environment variables for tests
process.env.CONGRESS_API_KEY = 'test_congress_key'
process.env.FEC_API_KEY = 'test_fec_key'
process.env.OPENSTATES_API_KEY = 'test_openstates_key'

// Mock fetch globally
global.fetch = jest.fn()

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
  writable: true
})

// Mock navigator APIs for sharing tests
Object.defineProperty(global, 'navigator', {
  value: {
    ...global.navigator,
    clipboard: {
      writeText: jest.fn(() => Promise.resolve())
    },
    share: jest.fn(() => Promise.resolve())
  },
  writable: true
})

// Mock html2canvas
jest.mock('html2canvas', () => {
  return jest.fn().mockImplementation(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 500
    return Promise.resolve(canvas)
  })
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Add setImmediate polyfill for Winston logger
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})