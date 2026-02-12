const currentController = require('../api/controllers/sprints/current');
const indexController = require('../api/controllers/sprints/index');
const showController = require('../api/controllers/sprints/show');

const originalSails = global.sails;
const originalProject = global.Project;
const originalBoardMembership = global.BoardMembership;
const originalSprint = global.Sprint;
const originalSprintCard = global.SprintCard;
const originalCard = global.Card;

describe('sprints controllers', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
        utils: {
          mapRecords: jest.fn((records, field) => records.map((r) => r[field])),
        },
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
    global.Sprint = {
      qm: {
        getOneCurrentByProjectId: jest.fn(),
        getByProjectId: jest.fn(),
        getOneById: jest.fn(),
      },
    };
    global.SprintCard = {
      qm: {
        getBySprintId: jest.fn(),
      },
    };
    global.Card = {
      qm: {
        getByIds: jest.fn(),
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
    global.Sprint = originalSprint;
    global.SprintCard = originalSprintCard;
    global.Card = originalCard;
  });

  test('current: throws projectNotFound when project does not exist', async () => {
    Project.qm.getOneById.mockResolvedValue(null);

    await expect(
      currentController.fn.call({ req: { currentUser: { id: 'u1' } } }, { projectId: 'p1' }),
    ).rejects.toEqual({ projectNotFound: 'Project not found' });
  });

  test('current: throws notEnoughRights when user is neither manager nor member', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValue([]);

    await expect(
      currentController.fn.call({ req: { currentUser: { id: 'u1' } } }, { projectId: 'p1' }),
    ).rejects.toEqual({ notEnoughRights: 'Not enough rights' });
  });

  test('current: returns current sprint for manager or member', async () => {
    const sprint = { id: 's1' };
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Sprint.qm.getOneCurrentByProjectId.mockResolvedValue(sprint);

    const result = await currentController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { projectId: 'p1' },
    );

    expect(result).toEqual({ item: sprint });
    expect(Sprint.qm.getOneCurrentByProjectId).toHaveBeenCalledWith('p1');
  });

  test('index: returns project sprints ordered by startDate desc', async () => {
    const sprints = [{ id: 's1' }, { id: 's2' }];
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValue([{ id: 'bm1' }]);
    Sprint.qm.getByProjectId.mockResolvedValue(sprints);

    const result = await indexController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { projectId: 'p1' },
    );

    expect(Sprint.qm.getByProjectId).toHaveBeenCalledWith('p1', {
      sort: ['startDate DESC'],
    });
    expect(result).toEqual({ items: sprints });
  });

  test('show: throws sprintNotFound when sprint does not exist', async () => {
    Sprint.qm.getOneById.mockResolvedValue(null);

    await expect(
      showController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 's1' }),
    ).rejects.toEqual({
      sprintNotFound: 'Sprint not found',
    });
  });

  test('show: returns sprint with included cards (empty and non-empty)', async () => {
    const sprint = { id: 's1', projectId: 'p1' };
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    Sprint.qm.getOneById.mockResolvedValue(sprint);
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getByProjectIdAndUserId.mockResolvedValue([{ id: 'bm1' }]);

    SprintCard.qm.getBySprintId.mockResolvedValue([]);
    let result = await showController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 's1' });
    expect(result).toEqual({
      item: sprint,
      included: { cards: [] },
    });
    expect(Card.qm.getByIds).not.toHaveBeenCalled();

    SprintCard.qm.getBySprintId.mockResolvedValue([{ cardId: 'c1' }, { cardId: 'c2' }]);
    Card.qm.getByIds.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    result = await showController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 's1' });
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalledWith(
      [{ cardId: 'c1' }, { cardId: 'c2' }],
      'cardId',
    );
    expect(Card.qm.getByIds).toHaveBeenCalledWith(['c1', 'c2']);
    expect(result).toEqual({
      item: sprint,
      included: { cards: [{ id: 'c1' }, { id: 'c2' }] },
    });
  });
});
