const { idInput } = require('../../../utils/inputs');
const planningPokerSessions = require('../../utils/planning-poker-sessions');

const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  SESSION_NOT_FOUND: {
    planningPokerSessionNotFound: 'Planning poker session not found',
  },
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  INVALID_STATE: {
    invalidPlanningPokerState: 'Invalid planning poker state',
  },
  INVALID_VALUE: {
    invalidPlanningPokerValue: 'Invalid planning poker value',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
};

const exits = {
  projectNotFound: {
    responseType: 'notFound',
  },
  boardNotFound: {
    responseType: 'notFound',
  },
  listNotFound: {
    responseType: 'notFound',
  },
  planningPokerSessionNotFound: {
    responseType: 'notFound',
  },
  notEnoughRights: {
    responseType: 'forbidden',
  },
  invalidPlanningPokerState: {
    responseType: 'unprocessableEntity',
  },
  invalidPlanningPokerValue: {
    responseType: 'unprocessableEntity',
  },
  cardNotFound: {
    responseType: 'notFound',
  },
};

const parseBooleanInput = (value) => {
  if (_.isBoolean(value)) {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
};

const isToEstimateList = (list) => {
  const normalizedName = (list.name || '').toLowerCase();

  return (
    list.slug === 'to-estimate' ||
    normalizedName.includes('estimate') ||
    normalizedName.includes('estimer')
  );
};

const buildStatePayload = (session, currentUserId) => ({
  item: planningPokerSessions.serialize(session),
  myVote: session ? session.votesByUserId[currentUserId] || null : null,
});

const broadcastSession = async (projectId, req, session = null) => {
  const currentSession = session || (await planningPokerSessions.getSession(projectId));

  sails.sockets.broadcast(
    `planningPoker:${projectId}`,
    'planningPokerSessionUpdate',
    {
      item: planningPokerSessions.serialize(currentSession),
    },
    req,
  );

  return currentSession;
};

const getProjectByIdOrThrow = async (projectId) => {
  const project = await Project.qm.getOneById(projectId);

  if (!project) {
    throw Errors.PROJECT_NOT_FOUND;
  }

  return project;
};

const getBoardByIdOrThrow = async (boardId, projectId) => {
  const board = await Board.qm.getOneById(boardId);

  if (!board || board.projectId !== projectId) {
    throw Errors.BOARD_NOT_FOUND;
  }

  return board;
};

const ensureBoardMemberOrThrow = async (boardId, userId, error = Errors.BOARD_NOT_FOUND) => {
  const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(boardId, userId);

  if (!boardMembership) {
    throw error;
  }

  return boardMembership;
};

const ensureProjectManagerOrThrow = async (projectId, userId, error = Errors.NOT_ENOUGH_RIGHTS) => {
  const isProjectManager = await sails.helpers.users.isProjectManager(userId, projectId);

  if (!isProjectManager) {
    throw error;
  }
};

const getListByIdOrThrow = async (listId, boardId) => {
  const list = await List.qm.getOneById(listId, {
    boardId,
  });

  if (!list) {
    throw Errors.LIST_NOT_FOUND;
  }

  return list;
};

const maybeJoinSocketRoom = (req, room) => {
  if (req.isSocket) {
    sails.sockets.join(req, room);
  }
};

const ensureHostOrThrow = (session, userId) => {
  if (session.hostUserId !== userId) {
    throw Errors.NOT_ENOUGH_RIGHTS;
  }
};

const ensureParticipantOrThrow = (session, userId) => {
  if (!session.participantsByUserId[userId]) {
    throw Errors.NOT_ENOUGH_RIGHTS;
  }
};

const ensureActiveCardOrThrow = (session) => {
  if (!session.activeCardId) {
    throw Errors.INVALID_STATE;
  }
};

module.exports = {
  idInput,
  Errors,
  exits,
  isToEstimateList,
  parseBooleanInput,
  buildStatePayload,
  broadcastSession,
  getProjectByIdOrThrow,
  getBoardByIdOrThrow,
  ensureBoardMemberOrThrow,
  ensureProjectManagerOrThrow,
  getListByIdOrThrow,
  maybeJoinSocketRoom,
  ensureHostOrThrow,
  ensureParticipantOrThrow,
  ensureActiveCardOrThrow,
};
