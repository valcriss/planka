const createCardType = require('../api/helpers/card-types/create-one');
const deleteCardType = require('../api/helpers/card-types/delete-one');
const updateCardType = require('../api/helpers/card-types/update-one');

const originalSails = global.sails;
const originalCardType = global.CardType;

describe('helpers/card-types create/delete/update', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        projects: {
          makeScoper: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };

    global.CardType = {
      qm: {
        createOne: jest.fn(),
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

    if (typeof originalCardType === 'undefined') {
      delete global.CardType;
    } else {
      global.CardType = originalCardType;
    }
  });

  test('create defaults color and broadcasts to project users', async () => {
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    CardType.qm.createOne.mockResolvedValue({ id: 'ct-1' });

    const result = await createCardType.fn({
      values: { name: 'Type', color: null, project: { id: 'project-1' } },
      actorUser: { id: 'actor-1' },
    });

    expect(result).toEqual({ id: 'ct-1' });
    expect(CardType.qm.createOne).toHaveBeenCalledWith({
      name: 'Type',
      color: '#000000',
      project: { id: 'project-1' },
      projectId: 'project-1',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
  });

  test('delete broadcasts when card type exists', async () => {
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    CardType.qm.deleteOne.mockResolvedValue({ id: 'ct-2' });

    const result = await deleteCardType.fn({
      record: { id: 'ct-2' },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });

    expect(result).toEqual({ id: 'ct-2' });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(1);
  });

  test('update defaults color and broadcasts', async () => {
    const scoper = {
      getProjectRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    CardType.qm.updateOne.mockResolvedValue({ id: 'ct-3' });

    const result = await updateCardType.fn({
      record: { id: 'ct-3' },
      values: { name: 'Type', color: null },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
    });

    expect(result).toEqual({ id: 'ct-3' });
    expect(CardType.qm.updateOne).toHaveBeenCalledWith('ct-3', {
      name: 'Type',
      color: '#000000',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
  });
});
