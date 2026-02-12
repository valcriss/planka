module.exports = {
  collectCoverageFrom: [
    '<rootDir>/api/**/*.js',
    '<rootDir>/utils/**/*.js',
    '!<rootDir>/tests/**',
    '!<rootDir>/config/**',
    '!<rootDir>/config/env/**',
    '!<rootDir>/db/**',
    '!<rootDir>/db/migrations/**',
    '!<rootDir>/db/seeds/**',
    '!<rootDir>/scripts/**',
    '!<rootDir>/app.js',
  ],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};
