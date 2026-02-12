import transform from '@diplodoc/transform';

import markdownToText from '../src/utils/markdown-to-text';
import plugins from '../src/configs/markdown-plugins';

jest.mock('@diplodoc/transform', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../src/configs/markdown-plugins', () => ({
  __esModule: true,
  default: ['plugin-a'],
}));

describe('markdownToText', () => {
  test('extracts only text children and joins blocks with line breaks', () => {
    transform.mockReturnValue([
      {
        children: [
          { type: 'text', content: 'Hello' },
          { type: 'link_open', content: '' },
          { type: 'text', content: ' world' },
        ],
      },
      {
        children: [{ type: 'text', content: 'Second line' }],
      },
      {
        type: 'hr',
      },
    ]);

    expect(markdownToText('# title')).toBe('Hello world\nSecond line');
    expect(transform).toHaveBeenCalledWith('# title', {
      plugins,
      tokens: true,
    });
  });
});
