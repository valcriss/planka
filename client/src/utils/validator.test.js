import { isUrl, isUsername, isPassword } from './validator';
import zxcvbn from 'zxcvbn';

jest.mock('zxcvbn');

describe('validator utils', () => {
  test('isUrl', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('ftp://example.com')).toBe(false);
  });

  test('isUsername', () => {
    expect(isUsername('user123')).toBe(true);
    expect(isUsername('ab')).toBe(false);
  });

  test('isPassword', () => {
    zxcvbn.mockReturnValueOnce({ score: 3 });
    expect(isPassword('strong')).toBe(true);
    zxcvbn.mockReturnValueOnce({ score: 1 });
    expect(isPassword('weak')).toBe(false);
  });
});
