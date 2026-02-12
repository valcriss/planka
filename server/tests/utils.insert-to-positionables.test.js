const _ = require('lodash');

const originalUnderscore = global._;
const insertToPositionables = require('../api/helpers/utils/insert-to-positionables');

describe('utils/insert-to-positionables helper', () => {
  beforeEach(() => {
    global._ = _;
  });

  afterAll(() => {
    if (typeof originalUnderscore === 'undefined') {
      delete global._;
    } else {
      global._ = originalUnderscore;
    }
  });

  test('keeps position when gap is available', () => {
    const result = insertToPositionables.fn({
      position: 2,
      records: [{ position: 1 }, { position: 3 }],
    });

    expect(result).toEqual({
      position: 2,
      repositions: [],
    });
  });

  test('repositions upper record when gap is too small', () => {
    const record = { id: 'card-1', position: 1.05 };

    const result = insertToPositionables.fn({
      position: 1,
      records: [record],
    });

    expect(result.position).toBe(1);
    expect(result.repositions).toHaveLength(1);
    expect(result.repositions[0]).toEqual({
      record,
      position: 1 + 2 ** 14,
    });
  });

  test('falls back to full reposition map for huge positions', () => {
    const result = insertToPositionables.fn({
      position: 2 ** 50 + 1,
      records: [],
    });

    expect(result).toEqual({
      position: 2 ** 14,
      repositions: [],
    });
  });
});
