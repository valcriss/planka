const lodash = require('lodash');
const mapRecords = require('../api/helpers/utils/map-records');

const originalLodash = global._;

describe('helpers/utils/map-records', () => {
  beforeEach(() => {
    global._ = lodash;
  });

  afterAll(() => {
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });

  test('maps ids by default', () => {
    const result = mapRecords.fn({
      records: [{ id: 'a' }, { id: 'b' }],
      attribute: 'id',
    });

    expect(result).toEqual(['a', 'b']);
  });

  test('maps with attribute, unique, and withoutNull options', () => {
    const result = mapRecords.fn({
      records: [{ value: 1 }, { value: 1 }, { value: null }, { value: 2 }],
      attribute: 'value',
      unique: true,
      withoutNull: true,
    });

    expect(result).toEqual([1, 2]);
  });
});
