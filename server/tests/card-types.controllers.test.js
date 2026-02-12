const lodash = require('lodash');

const cardTypesCreateController = require('../api/controllers/card-types/create');
const cardTypesUpdateController = require('../api/controllers/card-types/update');
const cardTypesDeleteController = require('../api/controllers/card-types/delete');
const cardTypesIndexController = require('../api/controllers/card-types/index');

const originalGlobals = {
  sails: global.sails,
  Project: global.Project,
  CardType: global.CardType,
  User: global.User,
  BoardMembership: global.BoardMembership,
  _: global._,
};

describe('card-types controllers', () => {
  beforeEach(() => {
    global._ = lodash;

    global.Project = {
      qm: { getOneById: jest.fn() },
    };

    global.CardType = {
      qm: { getOneById: jest.fn(), getByProjectId: jest.fn() },
    };

    global.User = {
      Roles: { ADMIN: 'admin' },
    };

    global.BoardMembership = {
      qm: { getByProjectIdAndUserId: jest.fn() },
    };

    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
        cardTypes: {
          createOne: { with: jest.fn() },
          updateOne: { with: jest.fn() },
          deleteOne: { with: jest.fn() },
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalGlobals.sails;
    global.Project = originalGlobals.Project;
    global.CardType = originalGlobals.CardType;
    global.User = originalGlobals.User;
    global.BoardMembership = originalGlobals.BoardMembership;
    global._ = originalGlobals._;
  });

  test('card-types/create throws when project is missing', async () => {
    Project.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardTypesCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1', name: 'Type A' },
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('card-types/create throws when not a project manager', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      cardTypesCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1', name: 'Type A' },
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('card-types/create returns created card type', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.createOne.with.mockResolvedValue({ id: 'ct1' });

    const result = await cardTypesCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      {
        projectId: 'p1',
        name: 'Type A',
        icon: 'icon',
        color: null,
        hasStopwatch: false,
        hasTaskList: true,
        canLinkCards: false,
      },
    );

    expect(sails.helpers.cardTypes.createOne.with).toHaveBeenCalledWith({
      values: {
        name: 'Type A',
        icon: 'icon',
        color: null,
        hasStopwatch: false,
        hasTaskList: true,
        canLinkCards: false,
        project: { id: 'p1' },
      },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'ct1' } });
  });

  test('card-types/update throws when card type missing', async () => {
    CardType.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardTypesUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'ct1', name: 'Updated' },
      ),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('card-types/update throws when not a project manager', async () => {
    CardType.qm.getOneById.mockResolvedValue({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      cardTypesUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'ct1', name: 'Updated' },
      ),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('card-types/update throws when update returns null', async () => {
    CardType.qm.getOneById.mockResolvedValue({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.updateOne.with.mockResolvedValue(null);

    await expect(
      cardTypesUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'ct1', name: 'Updated' },
      ),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('card-types/update returns updated card type', async () => {
    CardType.qm.getOneById.mockResolvedValue({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.updateOne.with.mockResolvedValue({ id: 'ct1' });

    const result = await cardTypesUpdateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'ct1', name: 'Updated', hasStopwatch: true },
    );

    expect(sails.helpers.cardTypes.updateOne.with).toHaveBeenCalledWith({
      record: { id: 'ct1', projectId: 'p1' },
      values: { name: 'Updated', hasStopwatch: true },
      actorUser: { id: 'u1' },
      project: { id: 'p1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'ct1' } });
  });

  test('card-types/delete throws when card type missing', async () => {
    CardType.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardTypesDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'ct1' }),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('card-types/delete throws when not a project manager', async () => {
    CardType.qm.getOneById.mockResolvedValue({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      cardTypesDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'ct1' }),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('card-types/delete throws when delete returns null', async () => {
    CardType.qm.getOneById.mockResolvedValue({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.deleteOne.with.mockResolvedValue(null);

    await expect(
      cardTypesDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'ct1' }),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('card-types/delete returns deleted card type', async () => {
    CardType.qm.getOneById.mockResolvedValue({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.deleteOne.with.mockResolvedValue({ id: 'ct1' });

    const result = await cardTypesDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'ct1' },
    );

    expect(sails.helpers.cardTypes.deleteOne.with).toHaveBeenCalledWith({
      record: { id: 'ct1', projectId: 'p1' },
      actorUser: { id: 'u1' },
      project: { id: 'p1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'ct1' } });
  });

  test('card-types/index throws when project missing', async () => {
    Project.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardTypesIndexController.fn.call(
        { req: { currentUser: { id: 'u1', role: User.Roles.ADMIN } } },
        { projectId: 'p1' },
      ),
    ).rejects.toBe('projectNotFound');
  });

  test('card-types/index throws when user lacks access', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1', ownerProjectManagerId: 'u2' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValue(null);

    await expect(
      cardTypesIndexController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { projectId: 'p1' },
      ),
    ).rejects.toBe('projectNotFound');
  });

  test('card-types/index returns items for board member', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1', ownerProjectManagerId: 'u2' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValue({ id: 'bm1' });
    CardType.qm.getByProjectId.mockResolvedValue([{ id: 'ct1' }]);

    const result = await cardTypesIndexController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'user' } } },
      { projectId: 'p1' },
    );

    expect(result).toEqual({ items: [{ id: 'ct1' }] });
  });

  test('card-types/index returns items for admin without owner manager', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1', ownerProjectManagerId: null });
    CardType.qm.getByProjectId.mockResolvedValue([{ id: 'ct1' }]);

    const result = await cardTypesIndexController.fn.call(
      { req: { currentUser: { id: 'u1', role: User.Roles.ADMIN } } },
      { projectId: 'p1' },
    );

    expect(result).toEqual({ items: [{ id: 'ct1' }] });
  });
});
