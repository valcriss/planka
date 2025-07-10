const { extractMentionIds, formatTextWithMentions } = require('../utils/mentions');

describe('mentions utilities', () => {
  test('extractMentionIds returns ids from mention syntax', () => {
    const text = 'Hello @[User One](u1) and @[User Two](u2)!';
    expect(extractMentionIds(text)).toEqual(['u1', 'u2']);
  });

  test('formatTextWithMentions replaces mention markup with names', () => {
    const text = 'Comment by @[User](123)';
    expect(formatTextWithMentions(text)).toBe('Comment by @User');
  });
});
