const lodash = require('lodash');
const insertToPositionables = require('../api/helpers/utils/insert-to-positionables');

const originalLodash = global._;

describe('helpers/utils/insert-to-positionables', () => {
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

  test('returns original position when there is enough gap', () => {
    const result = insertToPositionables.fn({
      position: 1500,
      records: [
        { id: 'a', position: 1000 },
        { id: 'b', position: 2000 },
      ],
    });

    expect(result).toEqual({
      position: 1500,
      repositions: [],
    });
  });

  test('returns repositions when positions are too close', () => {
    const records = [
      { id: 'a', position: 0.1 },
      { id: 'b', position: 0.2 },
    ];

    const result = insertToPositionables.fn({
      position: 0.1,
      records,
    });

    expect(result.position).toBe(32768);
    expect(result.repositions).toEqual([
      {
        record: records[0],
        position: 16384,
      },
      {
        record: records[1],
        position: 49152,
      },
    ]);
  });
});
