jest.mock('zxcvbn');
const zxcvbn = require('zxcvbn');
const { isPassword } = require('../utils/validators');

describe('validators.isPassword', () => {
  test('returns true when zxcvbn score is high enough', () => {
    zxcvbn.mockReturnValue({ score: 3 });
    expect(isPassword('strongPass')).toBe(true);
  });

  test('returns false when score is below threshold', () => {
    zxcvbn.mockReturnValue({ score: 1 });
    expect(isPassword('weak')).toBe(false);
  });
});
