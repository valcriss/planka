const _ = require('lodash');

const originalUnderscore = global._;
const mapRecordsHelper = require('../api/helpers/utils/map-records');

describe('utils/map-records helper', () => {
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

  test('maps records by default id attribute', () => {
    const result = mapRecordsHelper.fn({
      records: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      attribute: 'id',
    });

    expect(result).toEqual([1, 2]);
  });

  test('supports custom attribute and unique values', () => {
    const result = mapRecordsHelper.fn({
      records: [{ cardId: 1 }, { cardId: 1 }, { cardId: 2 }],
      attribute: 'cardId',
      unique: true,
    });

    expect(result).toEqual([1, 2]);
  });

  test('removes null values when withoutNull is true', () => {
    const result = mapRecordsHelper.fn({
      records: [{ cardId: 1 }, { cardId: null }, { cardId: 2 }],
      attribute: 'cardId',
      withoutNull: true,
    });

    expect(result).toEqual([1, 2]);
  });
});
