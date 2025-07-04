import '@testing-library/jest-dom'

// Add polyfill for TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

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

// Mock environment variables for tests
process.env.CONGRESS_API_KEY = 'test_congress_key'
process.env.FEC_API_KEY = 'test_fec_key'
process.env.OPENSTATES_API_KEY = 'test_openstates_key'

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})