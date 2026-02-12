const cardTypesCreateController = require('../api/controllers/card-types/create');
const cardTypesDeleteController = require('../api/controllers/card-types/delete');
const cardTypesUpdateController = require('../api/controllers/card-types/update');
const baseCardTypesCreateController = require('../api/controllers/base-card-types/create');
const baseCardTypesDeleteController = require('../api/controllers/base-card-types/delete');
const baseCardTypesUpdateController = require('../api/controllers/base-card-types/update');

const originalSails = global.sails;
const originalProject = global.Project;
const originalCardType = global.CardType;
const originalBaseCardType = global.BaseCardType;
const originalLodash = global._;

describe('card-types/base-card-types CRUD controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
        cardTypes: {
          createOne: {
            with: jest.fn(),
          },
          deleteOne: {
            with: jest.fn(),
          },
          updateOne: {
            with: jest.fn(),
          },
        },
        baseCardTypes: {
          createOne: {
            with: jest.fn(),
          },
          deleteOne: {
            with: jest.fn(),
          },
          updateOne: {
            with: jest.fn(),
          },
        },
      },
    };

    global.Project = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.CardType = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.BaseCardType = {
      qm: {
        getOneById: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Project = originalProject;
    global.CardType = originalCardType;
    global.BaseCardType = originalBaseCardType;
    global._ = originalLodash;
  });

  test('card-types/create throws when project is missing or user is not manager', async () => {
    const req = { currentUser: { id: 'u1' } };

    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      cardTypesCreateController.fn.call({ req }, { projectId: 'p1', name: 'Bug' }),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(
      cardTypesCreateController.fn.call({ req }, { projectId: 'p1', name: 'Bug' }),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('card-types/create creates a card type with picked values', async () => {
    const req = { currentUser: { id: 'u1' } };
    const project = { id: 'p1' };
    const created = { id: 'ct1' };
    const inputs = {
      projectId: 'p1',
      name: 'Bug',
      icon: 'bug',
      color: 'red',
      hasStopwatch: true,
      hasTaskList: false,
      canLinkCards: true,
    };

    Project.qm.getOneById.mockResolvedValue(project);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.createOne.with.mockResolvedValue(created);

    const result = await cardTypesCreateController.fn.call({ req }, inputs);

    expect(sails.helpers.cardTypes.createOne.with).toHaveBeenCalledWith({
      values: {
        name: 'Bug',
        icon: 'bug',
        color: 'red',
        hasStopwatch: true,
        hasTaskList: false,
        canLinkCards: true,
        project,
      },
      actorUser: req.currentUser,
      request: req,
    });
    expect(result).toEqual({ item: created });
  });

  test('card-types/delete throws for missing card type, forbidden user and missing delete result', async () => {
    const req = { currentUser: { id: 'u1' } };

    CardType.qm.getOneById.mockResolvedValueOnce(null);
    await expect(cardTypesDeleteController.fn.call({ req }, { id: 'ct1' })).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });

    CardType.qm.getOneById.mockResolvedValueOnce({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(cardTypesDeleteController.fn.call({ req }, { id: 'ct1' })).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });

    CardType.qm.getOneById.mockResolvedValueOnce({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.cardTypes.deleteOne.with.mockResolvedValueOnce(null);
    await expect(cardTypesDeleteController.fn.call({ req }, { id: 'ct1' })).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('card-types/delete returns deleted card type', async () => {
    const req = { currentUser: { id: 'u1' } };
    const cardType = { id: 'ct1', projectId: 'p1' };
    const project = { id: 'p1' };
    const deleted = { id: 'ct1', deleted: true };

    CardType.qm.getOneById.mockResolvedValue(cardType);
    Project.qm.getOneById.mockResolvedValue(project);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.deleteOne.with.mockResolvedValue(deleted);

    const result = await cardTypesDeleteController.fn.call({ req }, { id: 'ct1' });

    expect(sails.helpers.cardTypes.deleteOne.with).toHaveBeenCalledWith({
      record: cardType,
      actorUser: req.currentUser,
      project,
      request: req,
    });
    expect(result).toEqual({ item: deleted });
  });

  test('card-types/update throws for missing card type, forbidden user and missing update result', async () => {
    const req = { currentUser: { id: 'u1' } };

    CardType.qm.getOneById.mockResolvedValueOnce(null);
    await expect(cardTypesUpdateController.fn.call({ req }, { id: 'ct1' })).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });

    CardType.qm.getOneById.mockResolvedValueOnce({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(cardTypesUpdateController.fn.call({ req }, { id: 'ct1' })).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });

    CardType.qm.getOneById.mockResolvedValueOnce({ id: 'ct1', projectId: 'p1' });
    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.cardTypes.updateOne.with.mockResolvedValueOnce(null);
    await expect(
      cardTypesUpdateController.fn.call({ req }, { id: 'ct1', hasTaskList: true }),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('card-types/update returns updated card type', async () => {
    const req = { currentUser: { id: 'u1' } };
    const cardType = { id: 'ct1', projectId: 'p1' };
    const project = { id: 'p1' };
    const updated = { id: 'ct1', name: 'Bug+' };

    CardType.qm.getOneById.mockResolvedValue(cardType);
    Project.qm.getOneById.mockResolvedValue(project);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.updateOne.with.mockResolvedValue(updated);

    const result = await cardTypesUpdateController.fn.call(
      { req },
      { id: 'ct1', name: 'Bug+', hasStopwatch: false },
    );

    expect(sails.helpers.cardTypes.updateOne.with).toHaveBeenCalledWith({
      record: cardType,
      values: {
        name: 'Bug+',
        hasStopwatch: false,
      },
      actorUser: req.currentUser,
      project,
      request: req,
    });
    expect(result).toEqual({ item: updated });
  });

  test('base-card-types/create creates a base card type', async () => {
    const req = { currentUser: { id: 'u1' } };
    const created = { id: 'bct1' };

    sails.helpers.baseCardTypes.createOne.with.mockResolvedValue(created);

    const result = await baseCardTypesCreateController.fn.call(
      { req },
      { name: 'Task', icon: 'check', color: null, hasTaskList: true },
    );

    expect(sails.helpers.baseCardTypes.createOne.with).toHaveBeenCalledWith({
      values: {
        name: 'Task',
        icon: 'check',
        color: null,
        hasTaskList: true,
      },
      actorUser: req.currentUser,
      request: req,
    });
    expect(result).toEqual({ item: created });
  });

  test('base-card-types/delete throws when base card type is missing or delete result is empty', async () => {
    const req = { currentUser: { id: 'u1' } };

    BaseCardType.qm.getOneById.mockResolvedValueOnce(null);
    await expect(baseCardTypesDeleteController.fn.call({ req }, { id: 'bct1' })).rejects.toEqual({
      baseCardTypeNotFound: 'Base card type not found',
    });

    BaseCardType.qm.getOneById.mockResolvedValueOnce({ id: 'bct1' });
    sails.helpers.baseCardTypes.deleteOne.with.mockResolvedValueOnce(null);
    await expect(baseCardTypesDeleteController.fn.call({ req }, { id: 'bct1' })).rejects.toEqual({
      baseCardTypeNotFound: 'Base card type not found',
    });
  });

  test('base-card-types/delete returns deleted base card type', async () => {
    const req = { currentUser: { id: 'u1' } };
    const record = { id: 'bct1' };
    const deleted = { id: 'bct1', deleted: true };

    BaseCardType.qm.getOneById.mockResolvedValue(record);
    sails.helpers.baseCardTypes.deleteOne.with.mockResolvedValue(deleted);

    const result = await baseCardTypesDeleteController.fn.call({ req }, { id: 'bct1' });

    expect(sails.helpers.baseCardTypes.deleteOne.with).toHaveBeenCalledWith({
      record,
      actorUser: req.currentUser,
      request: req,
    });
    expect(result).toEqual({ item: deleted });
  });

  test('base-card-types/update throws when missing or update returns null', async () => {
    const req = { currentUser: { id: 'u1' } };

    BaseCardType.qm.getOneById.mockResolvedValueOnce(null);
    await expect(baseCardTypesUpdateController.fn.call({ req }, { id: 'bct1' })).rejects.toEqual({
      baseCardTypeNotFound: 'Base card type not found',
    });

    BaseCardType.qm.getOneById.mockResolvedValueOnce({ id: 'bct1' });
    sails.helpers.baseCardTypes.updateOne.with.mockResolvedValueOnce(null);
    await expect(
      baseCardTypesUpdateController.fn.call({ req }, { id: 'bct1', name: 'Task+' }),
    ).rejects.toEqual({
      baseCardTypeNotFound: 'Base card type not found',
    });
  });

  test('base-card-types/update returns updated base card type', async () => {
    const req = { currentUser: { id: 'u1' } };
    const record = { id: 'bct1' };
    const updated = { id: 'bct1', name: 'Task+' };

    BaseCardType.qm.getOneById.mockResolvedValue(record);
    sails.helpers.baseCardTypes.updateOne.with.mockResolvedValue(updated);

    const result = await baseCardTypesUpdateController.fn.call(
      { req },
      { id: 'bct1', name: 'Task+', canLinkCards: false },
    );

    expect(sails.helpers.baseCardTypes.updateOne.with).toHaveBeenCalledWith({
      record,
      values: {
        name: 'Task+',
        canLinkCards: false,
      },
      actorUser: req.currentUser,
      request: req,
    });
    expect(result).toEqual({ item: updated });
  });
});
