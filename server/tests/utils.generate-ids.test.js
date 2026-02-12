const originalSails = global.sails;

const generateIdsHelper = require('../api/helpers/utils/generate-ids');

describe('utils/generate-ids helper', () => {
  beforeEach(() => {
    global.sails = {
      sendNativeQuery: jest.fn().mockResolvedValue({
        rows: [{ id: '1' }, { id: '2' }],
      }),
      helpers: {
        utils: {
          mapRecords: jest.fn().mockReturnValue(['1', '2']),
        },
      },
    };
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
  });

  test('requests ids and maps resulting rows', async () => {
    const result = await generateIdsHelper.fn({
      total: 2,
    });

    expect(sails.sendNativeQuery).toHaveBeenCalledWith(
      'SELECT next_id() as id from generate_series(1, $1) ORDER BY id',
      [2],
    );
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalledWith([{ id: '1' }, { id: '2' }]);
    expect(result).toEqual(['1', '2']);
  });
});
