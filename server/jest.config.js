module.exports = {
  collectCoverageFrom: [
    '<rootDir>/app.js',
    '<rootDir>/api/**/*.js',
    '<rootDir>/config/**/*.js',
    '<rootDir>/db/**/*.js',
    '<rootDir>/scripts/**/*.js',
    '<rootDir>/utils/**/*.js',
    '!<rootDir>/tests/**',
  ],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};
