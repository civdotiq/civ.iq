const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
  ],
  // Workspace packages (packages/*) ship with their own vitest runners and are
  // tested independently. Excluding them via testPathIgnorePatterns prevents
  // Jest from trying to execute vitest-authored specs plus their compiled
  // .js/.d.ts output in dist/.
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 14,
      statements: 14,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@civiq/civic-statistics$': '<rootDir>/packages/civic-statistics/src/index.ts',
    '^@civiq/entity-resolution$': '<rootDir>/packages/entity-resolution/src/index.ts',
    '^@civiq/entity-resolution/(.*)$': '<rootDir>/packages/entity-resolution/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/temp-nextjs/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/.*\\.spec\\.ts$',
    '<rootDir>/tests/utils/',
    '<rootDir>/tests/fixtures/',
    '<rootDir>/src/.*test-helpers.*',
    '<rootDir>/packages/',
  ],
  // Add explicit ignore for the duplicate package.json
  rootDir: '.',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};

// next/jest is async; wrap it so we can override transformIgnorePatterns after
// its defaults are applied. next/jest prepends a broad node_modules ignore that
// would otherwise mask our allowlist below.
//
// ESM-allowlist: nostr-tools (and its crypto deps @noble/*, @scure/*,
// nostr-wasm) ship ESM-only, and nostr-tools' exports map resolves to source
// .ts files under jest's customExportConditions. All must be transformed so
// CJS test files can require them.
//
// If a new dep triggers `SyntaxError: Unexpected token 'export'` from a
// /node_modules/<pkg>/ path, add <pkg> to BOTH allowlists below (plain and
// .pnpm-scoped). Keep the lists in sync.
module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)();
  jestConfig.transformIgnorePatterns = [
    '/node_modules/(?!.pnpm)(?!(geist|nostr-tools|@noble|@scure|nostr-wasm)/)',
    '/node_modules/.pnpm/(?!(geist|nostr-tools|@noble|@scure|nostr-wasm)@)',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return jestConfig;
};
