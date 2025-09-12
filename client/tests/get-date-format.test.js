import getDateFormat from '../src/utils/get-date-format';

describe('getDateFormat', () => {
  test('returns longDateFormat for current year', () => {
    const now = new Date();
    expect(getDateFormat(now)).toBe('longDateTime');
  });

  test('returns fullDateFormat for previous year', () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    expect(getDateFormat(past)).toBe('fullDateTime');
  });
});
