const originalGlobals = {
  sails: global.sails,
  Project: global.Project,
  Board: global.Board,
  BoardMembership: global.BoardMembership,
  List: global.List,
  Card: global.Card,
  _: global._,
};

jest.mock('../api/utils/planning-poker-sessions', () => ({
  getSession: jest.fn(),
  createSession: jest.fn(),
  saveSession: jest.fn(),
  deleteSession: jest.fn(),
  joinSession: jest.fn(),
  leaveSession: jest.fn(),
  isAllowedVoteValue: jest.fn(),
  vote: jest.fn(),
  reveal: jest.fn(),
  restartVote: jest.fn(),
  finishActiveCard: jest.fn(),
  activateCard: jest.fn(),
  transferHost: jest.fn(),
  setObserver: jest.fn(),
  startClosing: jest.fn(),
  serialize: jest.fn(),
  NUMERIC_VOTE_VALUES: [1, 2, 3],
}));

const planningPokerSessions = require('../api/utils/planning-poker-sessions');

const showController = require('../api/controllers/planning-poker/show');
const joinController = require('../api/controllers/planning-poker/join');
const leaveController = require('../api/controllers/planning-poker/leave');
const voteController = require('../api/controllers/planning-poker/vote');
const finishVoteController = require('../api/controllers/planning-poker/finish-vote');
const restartVoteController = require('../api/controllers/planning-poker/restart-vote');
const assignStoryPointsController = require('../api/controllers/planning-poker/assign-story-points');
const activateStoryController = require('../api/controllers/planning-poker/activate-story');
const skipStoryController = require('../api/controllers/planning-poker/skip-story');
const transferHostController = require('../api/controllers/planning-poker/transfer-host');
const setObserverController = require('../api/controllers/planning-poker/set-observer');
const closeSessionController = require('../api/controllers/planning-poker/close-session');

const makeInterceptable = (value, codeToThrow, shouldThrow = () => false) => ({
  intercept(code, handler) {
    if (code === codeToThrow && shouldThrow()) {
      throw handler();
    }

    return value;
  },
});

const makeSession = (overrides = {}) => ({
  id: 's1',
  projectId: 'p1',
  boardId: 'b1',
  listId: 'l1',
  hostUserId: 'u1',
  participantsByUserId: {
    u1: {
      userId: 'u1',
      isObserver: false,
    },
  },
  activeCardId: 'c1',
  phase: 'voting',
  votesByUserId: {},
  excludedCardIds: [],
  ...overrides,
});

describe('planning poker controllers', () => {
  let currentUser;
  let projectRecord;
  let boardRecord;
  let listRecord;
  let cardRecord;
  let cardPathNotFound;

  beforeEach(() => {
    jest.resetAllMocks();
    global._ = require('lodash'); // eslint-disable-line global-require

    currentUser = { id: 'u1' };
    projectRecord = { id: 'p1' };
    boardRecord = { id: 'b1', projectId: 'p1' };
    listRecord = { id: 'l1', boardId: 'b1', name: 'To estimate', slug: 'to-estimate' };
    cardRecord = { id: 'c1', boardId: 'b1', listId: 'l1', storyPoints: 0 };
    cardPathNotFound = false;

    global.sails = {
      sockets: {
        broadcast: jest.fn(),
        join: jest.fn(),
      },
      helpers: {
        users: {
          isProjectManager: jest.fn().mockResolvedValue(true),
        },
        cards: {
          getPathToProjectById: jest.fn(() =>
            makeInterceptable(
              {
                card: cardRecord,
                list: listRecord,
                board: boardRecord,
                project: projectRecord,
              },
              'pathNotFound',
              () => cardPathNotFound,
            ),
          ),
          updateOne: {
            with: jest.fn().mockResolvedValue(cardRecord),
          },
        },
      },
    };

    global.Project = {
      qm: {
        getOneById: jest.fn().mockResolvedValue(projectRecord),
      },
    };

    global.Board = {
      qm: {
        getOneById: jest.fn().mockResolvedValue(boardRecord),
      },
    };

    global.BoardMembership = {
      qm: {
        getOneByBoardIdAndUserId: jest.fn().mockResolvedValue({ id: 'bm1' }),
      },
    };

    global.List = {
      qm: {
        getOneById: jest.fn().mockResolvedValue(listRecord),
      },
    };

    global.Card = {
      qm: {
        getOneById: jest.fn().mockResolvedValue(cardRecord),
      },
    };

    planningPokerSessions.getSession.mockResolvedValue(null);
    planningPokerSessions.createSession.mockResolvedValue(makeSession());
    planningPokerSessions.saveSession.mockResolvedValue(makeSession());
    planningPokerSessions.leaveSession.mockReturnValue(makeSession());
    planningPokerSessions.isAllowedVoteValue.mockReturnValue(true);
    planningPokerSessions.serialize.mockImplementation((session) =>
      session ? { id: session.id } : null,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalGlobals.sails;
    global.Project = originalGlobals.Project;
    global.Board = originalGlobals.Board;
    global.BoardMembership = originalGlobals.BoardMembership;
    global.List = originalGlobals.List;
    global.Card = originalGlobals.Card;
    global._ = originalGlobals._;
  });

  const call = (controller, inputs, reqOverrides = {}) =>
    controller.fn.call(
      {
        req: {
          currentUser: { ...currentUser, ...(reqOverrides.currentUser || {}) },
          isSocket: true,
          socket: { id: 'socket-1' },
          ...reqOverrides,
        },
      },
      inputs,
    );

  test('show handles missing project and membership checks', async () => {
    Project.qm.getOneById.mockResolvedValueOnce(null);
    await expect(call(showController, { projectId: 'p1', boardId: 'b1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValueOnce(projectRecord);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(call(showController, { projectId: 'p1', boardId: 'b1' })).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('show returns session payload and joins socket room', async () => {
    const session = makeSession({ votesByUserId: { u1: '5' } });
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(showController, { projectId: 'p1', boardId: 'b1' });

    expect(sails.sockets.join).toHaveBeenCalledWith(expect.any(Object), 'planningPoker:p1');
    expect(result).toEqual({
      item: { id: 's1' },
      myVote: '5',
    });
  });

  test('join enforces rights and list checks', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(null);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(
      call(joinController, { projectId: 'p1', boardId: 'b1', listId: 'l1' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    planningPokerSessions.getSession.mockResolvedValueOnce(null);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    await expect(call(joinController, { projectId: 'p1', boardId: 'b1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    planningPokerSessions.getSession.mockResolvedValueOnce(null);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    List.qm.getOneById.mockResolvedValueOnce({
      id: 'l2',
      boardId: 'b1',
      name: 'Done',
      slug: 'done',
    });
    await expect(
      call(joinController, { projectId: 'p1', boardId: 'b1', listId: 'l2' }),
    ).rejects.toEqual({
      listNotFound: 'List not found',
    });
  });

  test('join creates or joins session and broadcasts update', async () => {
    const session = makeSession();
    planningPokerSessions.getSession.mockResolvedValueOnce(null);
    planningPokerSessions.createSession.mockResolvedValueOnce(session);

    const result = await call(joinController, { projectId: 'p1', boardId: 'b1', listId: 'l1' });

    expect(planningPokerSessions.joinSession).toHaveBeenCalledWith(session, {
      userId: 'u1',
      socketId: 'socket-1',
    });
    expect(planningPokerSessions.saveSession).toHaveBeenCalledWith(session);
    expect(sails.sockets.broadcast).toHaveBeenCalled();
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('join rejects when session board membership is missing', async () => {
    const session = makeSession({ boardId: 'b2' });
    planningPokerSessions.getSession.mockResolvedValueOnce(session);
    BoardMembership.qm.getOneByBoardIdAndUserId
      .mockResolvedValueOnce({ id: 'bm1' })
      .mockResolvedValueOnce(null);

    await expect(
      call(joinController, { projectId: 'p1', boardId: 'b1', listId: 'l1' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('leave returns null payload when session is missing', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(null);

    const result = await call(leaveController, { projectId: 'p1' });

    expect(result).toEqual({ item: null, myVote: null });
  });

  test('leave deletes empty session and broadcasts update', async () => {
    const session = makeSession();
    planningPokerSessions.getSession.mockResolvedValueOnce(session).mockResolvedValueOnce(null);
    planningPokerSessions.leaveSession.mockReturnValueOnce(null);

    const result = await call(leaveController, { projectId: 'p1' });

    expect(planningPokerSessions.deleteSession).toHaveBeenCalledWith('p1');
    expect(sails.sockets.broadcast).toHaveBeenCalled();
    expect(result).toEqual({ item: null, myVote: null });
  });

  test('leave saves remaining session and broadcasts update', async () => {
    const session = makeSession();
    planningPokerSessions.getSession.mockResolvedValueOnce(session);
    planningPokerSessions.leaveSession.mockReturnValueOnce(session);

    const result = await call(leaveController, { projectId: 'p1' });

    expect(planningPokerSessions.saveSession).toHaveBeenCalledWith(session);
    expect(sails.sockets.broadcast).toHaveBeenCalled();
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('vote enforces session access, phase, and value constraints', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(null);
    await expect(call(voteController, { projectId: 'p1', value: '3' })).rejects.toEqual({
      planningPokerSessionNotFound: 'Planning poker session not found',
    });

    const session = makeSession();
    planningPokerSessions.getSession.mockResolvedValueOnce(session);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(call(voteController, { projectId: 'p1', value: '3' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    planningPokerSessions.getSession.mockResolvedValueOnce(
      makeSession({ participantsByUserId: {} }),
    );
    await expect(call(voteController, { projectId: 'p1', value: '3' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession({ activeCardId: null }));
    await expect(call(voteController, { projectId: 'p1', value: '3' })).rejects.toEqual({
      invalidPlanningPokerState: 'Invalid planning poker state',
    });

    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession({ phase: 'idle' }));
    await expect(call(voteController, { projectId: 'p1', value: '3' })).rejects.toEqual({
      invalidPlanningPokerState: 'Invalid planning poker state',
    });

    planningPokerSessions.getSession.mockResolvedValueOnce(
      makeSession({
        participantsByUserId: {
          u1: {
            userId: 'u1',
            isObserver: true,
          },
        },
      }),
    );
    await expect(call(voteController, { projectId: 'p1', value: '3' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession());
    planningPokerSessions.isAllowedVoteValue.mockReturnValueOnce(false);
    await expect(call(voteController, { projectId: 'p1', value: '99' })).rejects.toEqual({
      invalidPlanningPokerValue: 'Invalid planning poker value',
    });
  });

  test('vote records value and broadcasts update', async () => {
    const session = makeSession({ votesByUserId: { u1: '3' } });
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(voteController, { projectId: 'p1', value: '3' });

    expect(planningPokerSessions.vote).toHaveBeenCalledWith(session, 'u1', '3');
    expect(planningPokerSessions.saveSession).toHaveBeenCalledWith(session);
    expect(sails.sockets.broadcast).toHaveBeenCalled();
    expect(result).toEqual({ item: { id: 's1' }, myVote: '3' });
  });

  test('finish-vote returns not found or current state when idempotent', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(null);
    await expect(call(finishVoteController, { projectId: 'p1' })).rejects.toEqual({
      planningPokerSessionNotFound: 'Planning poker session not found',
    });

    const session = makeSession({ activeCardId: null, phase: 'voting' });
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(finishVoteController, { projectId: 'p1' });

    expect(planningPokerSessions.reveal).not.toHaveBeenCalled();
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('finish-vote reveals cards and broadcasts update', async () => {
    const session = makeSession({ phase: 'voting' });
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(finishVoteController, { projectId: 'p1' });

    expect(planningPokerSessions.reveal).toHaveBeenCalledWith(session);
    expect(planningPokerSessions.saveSession).toHaveBeenCalledWith(session);
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('restart-vote requires revealed phase', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession({ phase: 'voting' }));
    await expect(call(restartVoteController, { projectId: 'p1' })).rejects.toEqual({
      invalidPlanningPokerState: 'Invalid planning poker state',
    });
  });

  test('restart-vote resets session and broadcasts update', async () => {
    const session = makeSession({ phase: 'revealed' });
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(restartVoteController, { projectId: 'p1' });

    expect(planningPokerSessions.restartVote).toHaveBeenCalledWith(session);
    expect(planningPokerSessions.saveSession).toHaveBeenCalledWith(session);
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('assign-story-points enforces allowed values and card existence', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession());
    await expect(
      call(assignStoryPointsController, { projectId: 'p1', storyPoints: 4 }),
    ).rejects.toEqual({
      invalidPlanningPokerValue: 'Invalid planning poker value',
    });

    cardPathNotFound = true;
    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession());
    await expect(
      call(assignStoryPointsController, { projectId: 'p1', storyPoints: 3 }),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('assign-story-points updates card and finishes active card', async () => {
    const session = makeSession({ activeCardId: 'c1', phase: 'revealed' });
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(assignStoryPointsController, { projectId: 'p1', storyPoints: 3 });

    expect(sails.helpers.cards.updateOne.with).toHaveBeenCalledWith({
      project: projectRecord,
      board: boardRecord,
      list: listRecord,
      record: cardRecord,
      values: {
        storyPoints: 3,
      },
      actorUser: currentUser,
      request: expect.anything(),
    });
    expect(planningPokerSessions.finishActiveCard).toHaveBeenCalledWith(session, { exclude: true });
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('activate-story enforces closing phase and card presence', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession({ phase: 'closing' }));
    await expect(call(activateStoryController, { projectId: 'p1', cardId: 'c1' })).rejects.toEqual({
      invalidPlanningPokerState: 'Invalid planning poker state',
    });

    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession());
    Card.qm.getOneById.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(call(activateStoryController, { projectId: 'p1', cardId: 'c1' })).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('activate-story activates a valid card', async () => {
    const session = makeSession();
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(activateStoryController, { projectId: 'p1', cardId: 'c1' });

    expect(planningPokerSessions.activateCard).toHaveBeenCalledWith(session, 'c1');
    expect(planningPokerSessions.saveSession).toHaveBeenCalledWith(session);
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('skip-story enforces active card and finishes it', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession({ activeCardId: null }));
    await expect(call(skipStoryController, { projectId: 'p1' })).rejects.toEqual({
      invalidPlanningPokerState: 'Invalid planning poker state',
    });

    const session = makeSession();
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(skipStoryController, { projectId: 'p1' });

    expect(planningPokerSessions.finishActiveCard).toHaveBeenCalledWith(session, { exclude: true });
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('transfer-host enforces participant and updates session', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession());
    await expect(call(transferHostController, { projectId: 'p1', userId: 'u2' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    const session = makeSession({
      participantsByUserId: {
        u1: { userId: 'u1', isObserver: false },
        u2: { userId: 'u2', isObserver: false },
      },
    });
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(transferHostController, { projectId: 'p1', userId: 'u2' });

    expect(planningPokerSessions.transferHost).toHaveBeenCalledWith(session, 'u2');
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('set-observer validates input and updates session', async () => {
    planningPokerSessions.getSession.mockResolvedValueOnce(makeSession());
    await expect(
      call(setObserverController, { projectId: 'p1', isObserver: 'maybe' }),
    ).rejects.toEqual({
      invalidPlanningPokerValue: 'Invalid planning poker value',
    });

    const session = makeSession();
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(setObserverController, { projectId: 'p1', isObserver: 'true' });

    expect(planningPokerSessions.setObserver).toHaveBeenCalledWith(session, 'u1', true);
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });

  test('close-session starts closing and broadcasts update', async () => {
    const session = makeSession();
    planningPokerSessions.getSession.mockResolvedValueOnce(session);

    const result = await call(closeSessionController, { projectId: 'p1' });

    expect(planningPokerSessions.startClosing).toHaveBeenCalledWith(session, 'manual');
    expect(result).toEqual({ item: { id: 's1' }, myVote: null });
  });
});
