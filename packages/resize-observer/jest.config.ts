import type { Config } from 'jest';

const config: Config = {
  displayName: 'resize-observer',
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  // The Vitest suite lives next to the Jest one; make sure Jest never picks it up.
  testPathIgnorePatterns: ['/node_modules/', '\\.vitest\\.spec\\.ts$'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        isolatedModules: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|rxjs|@angular))'],
  coverageDirectory: '<rootDir>/../../coverage/packages/resize-observer/jest',
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    '!src/lib/**/*.spec.ts',
    '!src/lib/**/*.shared-spec.ts',
    '!src/lib/**/*.types.ts',
    '!src/lib/testing/**',
  ],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95,
    },
  },
};

export default config;
