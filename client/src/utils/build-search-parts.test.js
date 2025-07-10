import buildSearchParts from './build-search-parts';

describe('buildSearchParts', () => {
  test('splits and lowercases search parts', () => {
    expect(buildSearchParts('Hello, World Foo')).toEqual(['hello', 'world', 'foo']);
  });
});
