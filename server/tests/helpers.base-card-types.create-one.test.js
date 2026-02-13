const createBaseCardType = require('../api/helpers/base-card-types/create-one');

const originalSails = global.sails;
const originalBaseCardType = global.BaseCardType;

describe('helpers/base-card-types/create-one', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        users: {
          getAllIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };

    global.BaseCardType = {
      qm: {
        createOne: jest.fn(),
      },
    };
  });

  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }

    if (typeof originalBaseCardType === 'undefined') {
      delete global.BaseCardType;
    } else {
      global.BaseCardType = originalBaseCardType;
    }
  });

  test('defaults color and broadcasts to users', async () => {
    BaseCardType.qm.createOne.mockResolvedValue({ id: 'bct-1' });

    const inputs = {
      values: {
        name: 'Default',
      },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    };

    await createBaseCardType.fn(inputs);

    expect(BaseCardType.qm.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        color: '#000000',
      }),
    );
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
  });
});
