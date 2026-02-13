const deleteBaseCardType = require('../api/helpers/base-card-types/delete-one');
const updateBaseCardType = require('../api/helpers/base-card-types/update-one');

const originalSails = global.sails;
const originalBaseCardType = global.BaseCardType;

describe('helpers/base-card-types delete/update', () => {
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
        deleteOne: jest.fn(),
        updateOne: jest.fn(),
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

  test('delete broadcasts when base card type exists', async () => {
    const record = { id: 'bct-1' };
    BaseCardType.qm.deleteOne.mockResolvedValue(record);

    const result = await deleteBaseCardType.fn({
      record,
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });

    expect(result).toBe(record);
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
  });

  test('update defaults color and broadcasts', async () => {
    const record = { id: 'bct-2' };
    BaseCardType.qm.updateOne.mockResolvedValue(record);

    const result = await updateBaseCardType.fn({
      record,
      values: { name: 'Updated', color: null },
      actorUser: { id: 'actor-1' },
    });

    expect(result).toBe(record);
    expect(BaseCardType.qm.updateOne).toHaveBeenCalledWith('bct-2', {
      name: 'Updated',
      color: '#000000',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
  });

  test('update does not broadcast when record missing', async () => {
    BaseCardType.qm.updateOne.mockResolvedValue(null);

    const result = await updateBaseCardType.fn({
      record: { id: 'bct-3' },
      values: { name: 'Nope' },
      actorUser: { id: 'actor-1' },
    });

    expect(result).toBeNull();
    expect(sails.sockets.broadcast).not.toHaveBeenCalled();
  });
});
