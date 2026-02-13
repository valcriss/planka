const repositoriesCreateController = require('../api/controllers/repositories/create');
const repositoriesDeleteController = require('../api/controllers/repositories/delete');
const repositoriesUpdateController = require('../api/controllers/repositories/update');
const epicsCreateController = require('../api/controllers/epics/create');
const epicsDeleteController = require('../api/controllers/epics/delete');
const epicsIndexController = require('../api/controllers/epics/index');
const epicsUpdateController = require('../api/controllers/epics/update');

const originalSails = global.sails;
const originalProject = global.Project;
const originalRepository = global.Repository;
const originalEpic = global.Epic;
const originalLodash = global._;

describe('repositories and epics controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
        epics: {
          createOne: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };

    global.Project = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.Repository = {
      qm: {
        createOne: jest.fn(),
        getOneById: jest.fn(),
        deleteOne: jest.fn(),
        updateOne: jest.fn(),
      },
    };

    global.Epic = {
      qm: {
        getByProjectId: jest.fn(),
        getOneById: jest.fn(),
        deleteOne: jest.fn(),
        updateOne: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Project = originalProject;
    global.Repository = originalRepository;
    global.Epic = originalEpic;
    global._ = originalLodash;
  });

  test('repositories/create enforces project existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      repositoriesCreateController.fn.call(
        { req },
        { projectId: 'p1', name: 'Repo', url: 'https://example.com/repo.git' },
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(
      repositoriesCreateController.fn.call(
        { req },
        { projectId: 'p1', name: 'Repo', url: 'https://example.com/repo.git' },
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('repositories/create creates repository', async () => {
    const req = { currentUser: { id: 'u1' } };
    const created = { id: 'r1' };

    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Repository.qm.createOne.mockResolvedValue(created);

    const result = await repositoriesCreateController.fn.call(
      { req },
      {
        projectId: 'p1',
        name: 'Repo',
        url: 'https://example.com/repo.git',
        accessToken: 'token',
      },
    );

    expect(Repository.qm.createOne).toHaveBeenCalledWith({
      name: 'Repo',
      url: 'https://example.com/repo.git',
      accessToken: 'token',
      projectId: 'p1',
    });
    expect(result).toEqual({ item: created });
  });

  test('repositories/delete enforces existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Repository.qm.getOneById.mockResolvedValueOnce(null);
    await expect(repositoriesDeleteController.fn.call({ req }, { id: 'r1' })).rejects.toEqual({
      repositoryNotFound: 'Repository not found',
    });

    Repository.qm.getOneById.mockResolvedValueOnce({ id: 'r1', projectId: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(repositoriesDeleteController.fn.call({ req }, { id: 'r1' })).rejects.toEqual({
      repositoryNotFound: 'Repository not found',
    });
  });

  test('repositories/delete deletes repository', async () => {
    const req = { currentUser: { id: 'u1' } };
    const repository = { id: 'r1', projectId: 'p1' };
    const deleted = { id: 'r1' };

    Repository.qm.getOneById.mockResolvedValue(repository);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Repository.qm.deleteOne.mockResolvedValue(deleted);

    const result = await repositoriesDeleteController.fn.call({ req }, { id: 'r1' });

    expect(Repository.qm.deleteOne).toHaveBeenCalledWith({ id: 'r1' });
    expect(result).toEqual({ item: deleted });
  });

  test('repositories/update enforces existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Repository.qm.getOneById.mockResolvedValueOnce(null);
    await expect(repositoriesUpdateController.fn.call({ req }, { id: 'r1' })).rejects.toEqual({
      repositoryNotFound: 'Repository not found',
    });

    Repository.qm.getOneById.mockResolvedValueOnce({ id: 'r1', projectId: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(repositoriesUpdateController.fn.call({ req }, { id: 'r1' })).rejects.toEqual({
      repositoryNotFound: 'Repository not found',
    });
  });

  test('repositories/update updates only provided values and supports null access token', async () => {
    const req = { currentUser: { id: 'u1' } };
    const repository = { id: 'r1', projectId: 'p1' };
    const updated = { id: 'r1', name: 'Repo+' };

    Repository.qm.getOneById.mockResolvedValue(repository);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Repository.qm.updateOne.mockResolvedValue(updated);

    const result = await repositoriesUpdateController.fn.call(
      { req },
      { id: 'r1', name: 'Repo+', accessToken: null },
    );

    expect(Repository.qm.updateOne).toHaveBeenCalledWith(
      { id: 'r1' },
      {
        name: 'Repo+',
        accessToken: null,
      },
    );
    expect(result).toEqual({ item: updated });
  });

  test('epics/create enforces project existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      epicsCreateController.fn.call({ req }, { projectId: 'p1', position: 0, name: 'Epic 1' }),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(
      epicsCreateController.fn.call({ req }, { projectId: 'p1', position: 0, name: 'Epic 1' }),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('epics/create creates epic with picked values', async () => {
    const req = { currentUser: { id: 'u1' } };
    const project = { id: 'p1' };
    const created = { id: 'e1' };

    Project.qm.getOneById.mockResolvedValue(project);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.epics.createOne.with.mockResolvedValue(created);

    const result = await epicsCreateController.fn.call(
      { req },
      {
        projectId: 'p1',
        position: 1,
        name: 'Epic 1',
        description: null,
        icon: 'rocket',
        color: '#000',
      },
    );

    expect(sails.helpers.epics.createOne.with).toHaveBeenCalledWith({
      values: {
        position: 1,
        name: 'Epic 1',
        description: null,
        icon: 'rocket',
        color: '#000',
        project,
      },
      actorUser: req.currentUser,
      request: req,
    });
    expect(result).toEqual({ item: created });
  });

  test('epics/index enforces project existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(epicsIndexController.fn.call({ req }, { projectId: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(epicsIndexController.fn.call({ req }, { projectId: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('epics/index returns project epics for manager', async () => {
    const req = { currentUser: { id: 'u1' } };
    const project = { id: 'p1' };
    const epics = [{ id: 'e1' }, { id: 'e2' }];

    Project.qm.getOneById.mockResolvedValue(project);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Epic.qm.getByProjectId.mockResolvedValue(epics);

    const result = await epicsIndexController.fn.call({ req }, { projectId: 'p1' });

    expect(Epic.qm.getByProjectId).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ items: epics });
  });

  test('epics/update enforces existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Epic.qm.getOneById.mockResolvedValueOnce(null);
    await expect(epicsUpdateController.fn.call({ req }, { id: 'e1' })).rejects.toEqual({
      epicNotFound: 'Epic not found',
    });

    Epic.qm.getOneById.mockResolvedValueOnce({ id: 'e1', projectId: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(epicsUpdateController.fn.call({ req }, { id: 'e1' })).rejects.toEqual({
      epicNotFound: 'Epic not found',
    });
  });

  test('epics/update updates epic and broadcasts', async () => {
    const req = { currentUser: { id: 'u1' } };
    const epic = { id: 'e1', projectId: 'p1' };
    const updated = { id: 'e1', name: 'Epic 1+' };

    Epic.qm.getOneById.mockResolvedValue(epic);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Epic.qm.updateOne.mockResolvedValue(updated);

    const result = await epicsUpdateController.fn.call(
      { req },
      { id: 'e1', name: 'Epic 1+', position: 2 },
    );

    expect(Epic.qm.updateOne).toHaveBeenCalledWith(
      { id: 'e1' },
      {
        name: 'Epic 1+',
        position: 2,
      },
    );
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'project:p1',
      'epicUpdate',
      { item: updated },
      req,
    );
    expect(result).toEqual({ item: updated });
  });

  test('epics/delete enforces existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Epic.qm.getOneById.mockResolvedValueOnce(null);
    await expect(epicsDeleteController.fn.call({ req }, { id: 'e1' })).rejects.toEqual({
      epicNotFound: 'Epic not found',
    });

    Epic.qm.getOneById.mockResolvedValueOnce({ id: 'e1', projectId: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(epicsDeleteController.fn.call({ req }, { id: 'e1' })).rejects.toEqual({
      epicNotFound: 'Epic not found',
    });
  });

  test('epics/delete removes epic and broadcasts', async () => {
    const req = { currentUser: { id: 'u1' } };
    const epic = { id: 'e1', projectId: 'p1' };

    Epic.qm.getOneById.mockResolvedValue(epic);
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Epic.qm.deleteOne.mockResolvedValue(epic);

    const result = await epicsDeleteController.fn.call({ req }, { id: 'e1' });

    expect(Epic.qm.deleteOne).toHaveBeenCalledWith({ id: 'e1' });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'project:p1',
      'epicDelete',
      { item: epic },
      req,
    );
    expect(result).toEqual({ item: epic });
  });
});
