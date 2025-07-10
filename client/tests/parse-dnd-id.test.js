import parseDndId from '../src/utils/parse-dnd-id';

describe('parseDndId', () => {
  test('extracts id from prefixed string', () => {
    expect(parseDndId('card:123')).toBe('123');
  });
});
