import { formatTextWithMentions } from '../src/utils/mentions';

describe('formatTextWithMentions', () => {
  test('replaces mention markup with username', () => {
    expect(formatTextWithMentions('Hi @[User](u1)')).toBe('Hi @User');
  });
});
