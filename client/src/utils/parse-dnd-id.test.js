import parseDndId from './parse-dnd-id';

describe('parseDndId', () => {
  test('extracts id from prefixed string', () => {
    expect(parseDndId('card:123')).toBe('123');
  });
});
