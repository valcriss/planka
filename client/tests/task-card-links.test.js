import {
  buildTaskCardLink,
  getTaskCardLinks,
  hasTaskCardLinks,
} from '../src/utils/task-card-links';

describe('taskCardLinks', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  test('extracts canonical card links', () => {
    expect(getTaskCardLinks('/cards/PRJ/42')).toEqual([
      {
        projectCode: 'PRJ',
        number: 42,
      },
    ]);
  });

  test('extracts legacy id-based card links', () => {
    expect(getTaskCardLinks('See /cards/abc123')).toEqual([
      {
        id: 'abc123',
      },
    ]);
  });

  test('detects whether a task contains an internal card link', () => {
    expect(hasTaskCardLinks('Plain text task')).toBe(false);
    expect(hasTaskCardLinks('Linked task /cards/PRJ/7')).toBe(true);
  });

  test('builds canonical task card links', () => {
    globalThis.window = {
      location: {
        origin: 'https://projects.incub.cnavts.fr',
      },
    };

    expect(buildTaskCardLink('OPS', 13)).toBe('https://projects.incub.cnavts.fr/cards/OPS/13');
  });

  test('falls back to a relative path outside the browser', () => {
    globalThis.window = undefined;

    expect(buildTaskCardLink('OPS', 13)).toBe('/cards/OPS/13');
  });
});
