/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true,
        noImplicitAny: false,
        types: ['jest', 'node']
      }
    }
  }
};
