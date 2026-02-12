import mergeRecords from '../src/utils/merge-records';

describe('mergeRecords', () => {
  test('returns target when no source is provided', () => {
    const target = [{ id: 1, name: 'first' }];

    expect(mergeRecords(target)).toBe(target);
  });

  test('handles nullish sources and targets', () => {
    expect(mergeRecords(null, [{ id: 1 }])).toEqual([{ id: 1 }]);
    expect(mergeRecords([{ id: 1 }], null, [{ id: 2 }])).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test('merges existing records by id and appends new ones', () => {
    const first = [
      { id: 1, name: 'alpha', done: false },
      { id: 2, name: 'beta' },
    ];
    const second = [
      { id: 1, done: true },
      { id: 3, name: 'gamma' },
    ];
    const third = [{ id: 2, title: 'updated' }];

    expect(mergeRecords(first, second, third)).toEqual([
      { id: 1, name: 'alpha', done: true },
      { id: 2, name: 'beta', title: 'updated' },
      { id: 3, name: 'gamma' },
    ]);
  });
});
