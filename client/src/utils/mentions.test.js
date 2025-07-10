import { formatTextWithMentions } from './mentions';

describe('formatTextWithMentions', () => {
  test('replaces mention markup with username', () => {
    expect(formatTextWithMentions('Hi @[User](u1)')).toBe('Hi @User');
  });
});
