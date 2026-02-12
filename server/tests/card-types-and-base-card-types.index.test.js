const cardTypesIndexController = require('../api/controllers/card-types/index');
const baseCardTypesIndexController = require('../api/controllers/base-card-types/index');

const originalSails = global.sails;
const originalProject = global.Project;
const originalBoardMembership = global.BoardMembership;
const originalCardType = global.CardType;
const originalBaseCardType = global.BaseCardType;
const originalUser = global.User;

describe('card-types/base-card-types index controllers', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
      },
    };

    global.Project = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.BoardMembership = {
      qm: {
        getByProjectIdAndUserId: jest.fn(),
      },
    };

    global.CardType = {
      qm: {
        getByProjectId: jest.fn(),
      },
    };

    global.BaseCardType = {
      qm: {
        getAll: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Project = originalProject;
    global.BoardMembership = originalBoardMembership;
    global.CardType = originalCardType;
    global.BaseCardType = originalBaseCardType;
    global.User = originalUser;
  });

  test('base-card-types index returns all base card types', async () => {
    BaseCardType.qm.getAll.mockResolvedValue([{ id: 'bct1' }]);

    const result = await baseCardTypesIndexController.fn.call({}, {});

    expect(BaseCardType.qm.getAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ items: [{ id: 'bct1' }] });
  });

  test('card-types index throws projectNotFound when project does not exist', async () => {
    Project.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardTypesIndexController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { projectId: 'p1' },
      ),
    ).rejects.toBe('projectNotFound');
  });

  test('card-types index returns card types for admin with no project owner', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1', ownerProjectManagerId: null });
    CardType.qm.getByProjectId.mockResolvedValue([{ id: 'ct1' }]);

    const result = await cardTypesIndexController.fn.call(
      { req: { currentUser: { id: 'u1', role: User.Roles.ADMIN } } },
      { projectId: 'p1' },
    );

    expect(CardType.qm.getByProjectId).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ items: [{ id: 'ct1' }] });
  });

  test('card-types index checks manager then membership and throws when not allowed', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1', ownerProjectManagerId: 'pm1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValue(null);

    await expect(
      cardTypesIndexController.fn.call(
        { req: { currentUser: { id: 'u1', role: User.Roles.ADMIN } } },
        { projectId: 'p1' },
      ),
    ).rejects.toBe('projectNotFound');
  });

  test('card-types index allows non-admin project manager and board member', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1', ownerProjectManagerId: 'pm1' });
    CardType.qm.getByProjectId.mockResolvedValue([{ id: 'ct1' }, { id: 'ct2' }]);

    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    let result = await cardTypesIndexController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'member' } } },
      { projectId: 'p1' },
    );
    expect(result).toEqual({ items: [{ id: 'ct1' }, { id: 'ct2' }] });

    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValue({ id: 'bm1' });
    result = await cardTypesIndexController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'member' } } },
      { projectId: 'p1' },
    );
    expect(result).toEqual({ items: [{ id: 'ct1' }, { id: 'ct2' }] });
  });
});
