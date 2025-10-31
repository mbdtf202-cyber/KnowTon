/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Backend tests
    {
      displayName: 'Backend',
      testMatch: ['<rootDir>/packages/backend/src/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/packages/backend/jest.setup.js'],
      collectCoverageFrom: [
        'packages/backend/src/**/*.ts',
        '!packages/backend/src/**/*.d.ts',
        '!packages/backend/src/index.ts',
      ],
      coverageDirectory: 'coverage/backend',
      coverageReporters: ['text', 'lcov', 'html'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/packages/backend/src/$1',
      },
    },
    // Frontend tests
    {
      displayName: 'Frontend',
      testMatch: ['<rootDir>/packages/frontend/src/**/*.test.{ts,tsx}'],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/packages/frontend/src/test/setup.ts'],
      collectCoverageFrom: [
        'packages/frontend/src/**/*.{ts,tsx}',
        '!packages/frontend/src/**/*.d.ts',
        '!packages/frontend/src/main.tsx',
        '!packages/frontend/src/vite-env.d.ts',
      ],
      coverageDirectory: 'coverage/frontend',
      coverageReporters: ['text', 'lcov', 'html'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/packages/frontend/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'packages/frontend/tsconfig.json',
        }],
      },
    },
    // SDK tests
    {
      displayName: 'SDK',
      testMatch: ['<rootDir>/packages/sdk/src/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      collectCoverageFrom: [
        'packages/sdk/src/**/*.ts',
        '!packages/sdk/src/**/*.d.ts',
      ],
      coverageDirectory: 'coverage/sdk',
      coverageReporters: ['text', 'lcov', 'html'],
    },
  ],
  // Global settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Test timeout
  testTimeout: 30000,
  // Verbose output
  verbose: true,
  // Fail fast
  bail: false,
  // Max workers
  maxWorkers: '50%',
};