import parseDndId from '../src/utils/parse-dnd-id';

describe('parseDndId', () => {
  test('returns null metadata for falsy input', () => {
    expect(parseDndId('')).toEqual({ type: null, id: null, laneKey: null });
  });

  test('extracts type and id from prefixed string', () => {
    expect(parseDndId('card:123')).toEqual({ type: 'card', id: '123', laneKey: null });
  });

  test('extracts lane key suffix when present', () => {
    expect(parseDndId('card:123:lane:user:42')).toEqual({
      type: 'card',
      id: '123',
      laneKey: 'user:42',
    });
  });

  test('ignores segments prior to lane descriptor', () => {
    expect(parseDndId('list:1:card:123:lane:unassigned')).toEqual({
      type: 'list',
      id: '1',
      laneKey: 'unassigned',
    });
  });
});
