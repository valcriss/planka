const filenamify = require('../utils/filenamify');

describe('filenamify', () => {
  test('throws when input is not a string', () => {
    expect(() => filenamify(123)).toThrow(TypeError);
  });

  test('throws when replacement contains control reserved character', () => {
    expect(() => filenamify('name', { replacement: '\u0001' })).toThrow(
      'Replacement string cannot contain reserved filename characters',
    );
  });

  test('replaces reserved characters', () => {
    expect(filenamify('file:name<>')).toBe('file!name!');
  });

  test('truncates long filenames keeping extension', () => {
    const longName = `${'a'.repeat(60)}.txt`;
    const result = filenamify(longName, { maxLength: 20 });
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith('.txt')).toBe(true);
  });

  test('allows reserved replacement characters', () => {
    expect(filenamify('test', { replacement: '>' })).toBe('test');
  });

  test('truncates long filenames without extension', () => {
    const longName = 'a'.repeat(200);
    const result = filenamify(longName, { maxLength: 20 });

    expect(result.length).toBe(20);
    expect(result).toBe('a'.repeat(20));
  });
});
