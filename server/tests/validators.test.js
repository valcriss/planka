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
// eslint-disable-next-line import/order
const _ = require('lodash');
// expose lodash as global for validators that rely on it
global._ = _;

const {
  isUrl,
  isId,
  isIds,
  isEmailOrUsername,
  isDueDate,
  isHexColor,
  isStopwatch,
} = require('../utils/validators');

describe('other validator functions', () => {
  test('isUrl', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('ftp://example.com')).toBe(false);
  });

  test('isId and isIds', () => {
    expect(isId('10')).toBe(true);
    expect(isId('0')).toBe(false);
    expect(isIds(['1', '2'])).toBe(true);
    expect(isIds(['1', 'x'])).toBe(false);
  });

  test('isEmailOrUsername', () => {
    expect(isEmailOrUsername('user@example.com')).toBe(true);
    expect(isEmailOrUsername('user1')).toBe(true);
    expect(isEmailOrUsername('us')).toBe(false);
  });

  test('isDueDate and isHexColor', () => {
    expect(isDueDate('2024-01-01T00:00:00Z')).toBe(true);
    expect(isDueDate('invalid')).toBe(false);
    expect(isHexColor('#aa00AA')).toBe(true);
    expect(isHexColor('123456')).toBe(false);
  });

  test('isStopwatch', () => {
    const valid = { startedAt: null, total: 0 };
    expect(isStopwatch(valid)).toBe(true);
    const invalid = { startedAt: 'not-date', total: -1 };
    expect(isStopwatch(invalid)).toBe(false);
  });
});
