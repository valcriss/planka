const getOrCreateForProject = require('../api/helpers/card-types/get-or-create-for-project');

const originalCardType = global.CardType;
const originalBaseCardType = global.BaseCardType;

describe('helpers/card-types/get-or-create-for-project', () => {
  beforeEach(() => {
    global.CardType = {
      qm: {
        getOneById: jest.fn(),
        getOneByProjectIdAndBaseCardTypeId: jest.fn(),
      },
    };

    global.BaseCardType = {
      qm: {
        getOneById: jest.fn(),
      },
    };
  });

  afterAll(() => {
    if (typeof originalCardType === 'undefined') {
      delete global.CardType;
    } else {
      global.CardType = originalCardType;
    }

    if (typeof originalBaseCardType === 'undefined') {
      delete global.BaseCardType;
    } else {
      global.BaseCardType = originalBaseCardType;
    }
  });

  test('returns card type when found by id', async () => {
    CardType.qm.getOneById.mockResolvedValue({ id: 'ct-1' });

    const result = await getOrCreateForProject.fn({
      project: { id: 'project-1' },
      id: 'ct-1',
      actorUser: { id: 'actor-1' },
    });

    expect(result).toEqual({ id: 'ct-1' });
    expect(BaseCardType.qm.getOneById).not.toHaveBeenCalled();
  });

  test('throws notFound when base card type missing', async () => {
    CardType.qm.getOneById.mockResolvedValue(null);
    BaseCardType.qm.getOneById.mockResolvedValue(null);

    await expect(
      getOrCreateForProject.fn({
        project: { id: 'project-1' },
        id: 'missing',
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('notFound');
  });

  test('returns project card type when exists', async () => {
    CardType.qm.getOneById.mockResolvedValue(null);
    BaseCardType.qm.getOneById.mockResolvedValue({ id: 'base-1' });
    CardType.qm.getOneByProjectIdAndBaseCardTypeId.mockResolvedValue({
      id: 'ct-2',
    });

    const result = await getOrCreateForProject.fn({
      project: { id: 'project-1' },
      id: 'base-1',
      actorUser: { id: 'actor-1' },
    });

    expect(result).toEqual({ id: 'ct-2' });
  });

  test('returns base card type when project one missing', async () => {
    CardType.qm.getOneById.mockResolvedValue(null);
    BaseCardType.qm.getOneById.mockResolvedValue({ id: 'base-2' });
    CardType.qm.getOneByProjectIdAndBaseCardTypeId.mockResolvedValue(null);

    const result = await getOrCreateForProject.fn({
      project: { id: 'project-1' },
      id: 'base-2',
      actorUser: { id: 'actor-1' },
    });

    expect(result).toEqual({ id: 'base-2' });
  });
});
