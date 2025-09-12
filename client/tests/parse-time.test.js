import parseTime from '../src/utils/parse-time';

describe('parseTime', () => {
  const ref = new Date('2024-01-01T00:00:00Z');

  test('parses 24h format', () => {
    const date = parseTime('13:45', ref);
    expect(date.getHours()).toBe(13);
    expect(date.getMinutes()).toBe(45);
  });

  test('parses 12h format with meridiem', () => {
    const date = parseTime('2pm', ref);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(0);
  });

  test('returns invalid date for bad input', () => {
    const date = parseTime('bad');
    expect(date.toString()).toBe('Invalid Date');
  });
});
