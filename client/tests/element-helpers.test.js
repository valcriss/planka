import { focusEnd, isActiveTextElement, isUsableMarkdownElement } from '../src/utils/element-helpers';

describe('element-helpers', () => {
  beforeEach(() => {
    global.document = { activeElement: null };
  });

  test('focusEnd focuses element and moves cursor to the end', () => {
    const element = {
      value: 'hello',
      focus: jest.fn(),
      setSelectionRange: jest.fn(),
    };

    focusEnd(element);

    expect(element.focus).toHaveBeenCalledTimes(1);
    expect(element.setSelectionRange).toHaveBeenCalledWith(6, 6);
  });

  test('isActiveTextElement returns true for active input/textarea elements', () => {
    const input = { tagName: 'INPUT' };
    const textarea = { tagName: 'textarea' };
    global.document.activeElement = input;

    expect(isActiveTextElement(input)).toBe(true);
    expect(isActiveTextElement(textarea)).toBe(false);
  });

  test('isActiveTextElement returns false for non-text elements', () => {
    const div = { tagName: 'div' };
    global.document.activeElement = div;

    expect(isActiveTextElement(div)).toBe(false);
  });

  test('isUsableMarkdownElement returns true only when markdown-related ancestor exists', () => {
    const usable = { closest: jest.fn(() => ({})) };
    const notUsable = { closest: jest.fn(() => null) };

    expect(isUsableMarkdownElement(usable)).toBe(true);
    expect(isUsableMarkdownElement(notUsable)).toBe(false);
    expect(usable.closest).toHaveBeenCalledWith('.yfm a, .yfm-clipboard-button, .yfm-cut-title');
  });
});
