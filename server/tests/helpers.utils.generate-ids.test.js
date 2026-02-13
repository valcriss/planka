const generateIds = require('../api/helpers/utils/generate-ids');

const originalSails = global.sails;

describe('helpers/utils/generate-ids', () => {
  beforeEach(() => {
    global.sails = {
      sendNativeQuery: jest.fn().mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }],
      }),
      helpers: {
        utils: {
          mapRecords: jest.fn().mockReturnValue([1, 2]),
        },
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
  });

  test('returns generated ids from native query', async () => {
    const result = await generateIds.fn({ total: 2 });

    expect(sails.sendNativeQuery).toHaveBeenCalledWith(
      'SELECT next_id() as id from generate_series(1, $1) ORDER BY id',
      [2],
    );
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
    expect(result).toEqual([1, 2]);
  });
});
