import matchPaths from '../src/utils/match-paths';

describe('matchPaths', () => {
  test('returns match for existing path', () => {
    const match = matchPaths('/board/1', ['/board/:id', '/']);
    expect(match).not.toBeNull();
    expect(match.params.id).toBe('1');
  });

  test('returns null for unmatched path', () => {
    expect(matchPaths('/foo', ['/bar'])).toBeNull();
  });
});
