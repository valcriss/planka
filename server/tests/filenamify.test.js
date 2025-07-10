const filenamify = require('../utils/filenamify');

describe('filenamify', () => {
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
});
