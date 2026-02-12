import getTextColor from '../src/utils/get-text-color';

describe('getTextColor', () => {
  test('returns black when hex is empty', () => {
    expect(getTextColor()).toBe('#000');
  });

  test('returns black for light colors', () => {
    expect(getTextColor('#ffffff')).toBe('#000');
  });

  test('returns white for dark colors', () => {
    expect(getTextColor('#000000')).toBe('#fff');
  });
});
