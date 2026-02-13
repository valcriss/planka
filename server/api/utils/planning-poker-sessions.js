/* eslint-disable no-param-reassign, no-use-before-define */

const NUMERIC_VOTE_VALUES = [1, 2, 3, 5, 8, 13, 21];
const VOTE_VALUES = [...NUMERIC_VOTE_VALUES.map(String), 'coffee'];
let isStorageSyncAttempted = false;
const AUTO_CLOSE_AFTER_MS = 5 * 60 * 1000;
const CLOSING_DURATION_MS = 60 * 1000;
const inactivityTimeoutByProjectId = new Map();
const finalizationTimeoutByProjectId = new Map();

const toProjectKey = (projectId) => String(projectId);
const now = () => new Date().toISOString();
const nowMs = () => Date.now();
const toTimestamp = (value) => {
  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? 0 : parsed;
};

const roundUpToAllowedScale = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }

  const greaterOrEqual = NUMERIC_VOTE_VALUES.find((allowedValue) => allowedValue >= value);

  return _.isUndefined(greaterOrEqual)
    ? NUMERIC_VOTE_VALUES[NUMERIC_VOTE_VALUES.length - 1]
    : greaterOrEqual;
};

const normalizeSession = (session) => {
  if (!session) {
    return null;
  }

  const participantUserIds = Object.keys(session.participantsByUserId);

  if (participantUserIds.length === 0 && session.phase !== 'closing') {
    return null;
  }

  if (participantUserIds.length > 0 && !session.participantsByUserId[session.hostUserId]) {
    const [nextHostUserId] = participantUserIds;
    session.hostUserId = nextHostUserId;
  }

  if (!session.lastActivityAt) {
    session.lastActivityAt = session.updatedAt || now();
  }

  return session;
};

const touchSession = (session) => {
  const timestamp = now();

  session.updatedAt = timestamp;
  session.lastActivityAt = timestamp;
};

const findOne = async (projectId) =>
  PlanningPokerSession.findOne({
    projectId: toProjectKey(projectId),
  });

const ensureStorageReady = async () => {
  if (isStorageSyncAttempted) {
    return;
  }

  isStorageSyncAttempted = true;

  await sails.sendNativeQuery(`
    CREATE TABLE IF NOT EXISTS planning_poker_session (
      id BIGINT PRIMARY KEY DEFAULT next_id(),
      project_id BIGINT NOT NULL UNIQUE REFERENCES project (id) ON DELETE CASCADE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const deleteSession = async (projectId) => {
  const projectKey = toProjectKey(projectId);
  const inactivityTimeout = inactivityTimeoutByProjectId.get(projectKey);
  const finalizationTimeout = finalizationTimeoutByProjectId.get(projectKey);

  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeoutByProjectId.delete(projectKey);
  }

  if (finalizationTimeout) {
    clearTimeout(finalizationTimeout);
    finalizationTimeoutByProjectId.delete(projectKey);
  }

  await ensureStorageReady();
  await PlanningPokerSession.destroy({
    projectId: projectKey,
  });
};

const startClosing = (session, reason = 'manual') => {
  if (session.phase === 'closing') {
    return session;
  }

  const closingStartedAt = now();
  const closingEndsAt = new Date(nowMs() + CLOSING_DURATION_MS).toISOString();

  session.phase = 'closing';
  session.activeCardId = null;
  session.votesByUserId = {};
  session.voteStats = null;
  session.closingStartedAt = closingStartedAt;
  session.closingEndsAt = closingEndsAt;
  session.closingReason = reason;
  touchSession(session);

  return session;
};

const broadcastSession = (session) => {
  sails.sockets.broadcast(`planningPoker:${session.projectId}`, 'planningPokerSessionUpdate', {
    item: serialize(session),
  });
};

const broadcastSessionClosed = (projectId) => {
  sails.sockets.broadcast(`planningPoker:${projectId}`, 'planningPokerSessionUpdate', {
    item: null,
  });
};

const scheduleTimeouts = (session) => {
  const projectId = toProjectKey(session.projectId);

  const previousInactivityTimeout = inactivityTimeoutByProjectId.get(projectId);
  const previousFinalizationTimeout = finalizationTimeoutByProjectId.get(projectId);

  if (previousInactivityTimeout) {
    clearTimeout(previousInactivityTimeout);
  }

  if (previousFinalizationTimeout) {
    clearTimeout(previousFinalizationTimeout);
  }

  inactivityTimeoutByProjectId.delete(projectId);
  finalizationTimeoutByProjectId.delete(projectId);

  if (session.phase === 'closing') {
    const finalizationDelay = Math.max(0, toTimestamp(session.closingEndsAt) - nowMs());
    const timeoutId = setTimeout(async () => {
      await deleteSession(projectId);
      broadcastSessionClosed(projectId);
    }, finalizationDelay);

    finalizationTimeoutByProjectId.set(projectId, timeoutId);

    return;
  }

  const inactivityDelay = Math.max(
    0,
    toTimestamp(session.lastActivityAt) + AUTO_CLOSE_AFTER_MS - nowMs(),
  );
  const timeoutId = setTimeout(async () => {
    const currentSession = await getSession(projectId);

    if (!currentSession || currentSession.phase === 'closing') {
      return;
    }

    if (toTimestamp(currentSession.lastActivityAt) + AUTO_CLOSE_AFTER_MS > nowMs()) {
      scheduleTimeouts(currentSession);
      return;
    }

    startClosing(currentSession, 'inactivity');
    await saveSession(currentSession);
    broadcastSession(currentSession);
  }, inactivityDelay);

  inactivityTimeoutByProjectId.set(projectId, timeoutId);
};

const saveSession = async (session) => {
  if (!session) {
    return null;
  }

  const normalizedSession = normalizeSession(session);

  if (!normalizedSession) {
    await deleteSession(session.projectId);
    return null;
  }

  const projectId = toProjectKey(normalizedSession.projectId);
  await ensureStorageReady();
  const existingRecord = await findOne(projectId);

  if (existingRecord) {
    await PlanningPokerSession.updateOne({
      id: existingRecord.id,
    }).set({
      data: normalizedSession,
    });
  } else {
    await PlanningPokerSession.create({
      projectId,
      data: normalizedSession,
    }).fetch();
  }

  scheduleTimeouts(normalizedSession);

  return normalizedSession;
};

const getSession = async (projectId) => {
  const projectKey = toProjectKey(projectId);
  await ensureStorageReady();
  const record = await findOne(projectKey);
  const session = normalizeSession(record && record.data ? record.data : null);

  if (!session) {
    return null;
  }

  if (session.phase === 'closing' && toTimestamp(session.closingEndsAt) <= nowMs()) {
    await deleteSession(projectKey);
    return null;
  }

  scheduleTimeouts(session);

  return session;
};

const createSession = async ({ projectId, boardId, listId, hostUserId }) => {
  const projectKey = toProjectKey(projectId);
  const session = {
    projectId: projectKey,
    boardId,
    listId,
    hostUserId,
    participantsByUserId: {},
    activeCardId: null,
    phase: 'idle', // idle | voting | revealed
    votesByUserId: {},
    voteStats: null,
    excludedCardIds: [],
    lastActivityAt: now(),
    createdAt: now(),
    updatedAt: now(),
  };

  await saveSession(session);

  return session;
};

const joinSession = (session, { userId, socketId }) => {
  const participant = session.participantsByUserId[userId] || {
    userId,
    isObserver: false,
    joinedAt: now(),
    socketIds: [],
  };

  if (socketId && !participant.socketIds.includes(socketId)) {
    participant.socketIds.push(socketId);
  }

  session.participantsByUserId[userId] = participant;
  touchSession(session);

  return participant;
};

const leaveSession = (session, { userId, socketId }) => {
  const participant = session.participantsByUserId[userId];

  if (!participant) {
    return normalizeSession(session);
  }

  if (socketId) {
    participant.socketIds = participant.socketIds.filter((id) => id !== socketId);
  } else {
    participant.socketIds = [];
  }

  if (participant.socketIds.length === 0) {
    delete session.participantsByUserId[userId];
    delete session.votesByUserId[userId];
  }

  if (Object.keys(session.participantsByUserId).length === 0) {
    return startClosing(session, 'empty');
  }

  touchSession(session);

  return session;
};

const setObserver = (session, userId, isObserver) => {
  const participant = session.participantsByUserId[userId];

  if (!participant) {
    return null;
  }

  participant.isObserver = isObserver;

  if (isObserver) {
    delete session.votesByUserId[userId];
  }

  touchSession(session);

  return participant;
};

const transferHost = (session, userId) => {
  if (!session.participantsByUserId[userId]) {
    return false;
  }

  session.hostUserId = userId;
  touchSession(session);

  return true;
};

const activateCard = (session, cardId) => {
  session.activeCardId = cardId;
  session.phase = 'voting';
  session.votesByUserId = {};
  session.voteStats = null;
  session.closingStartedAt = null;
  session.closingEndsAt = null;
  session.closingReason = null;
  touchSession(session);
};

const vote = (session, userId, value) => {
  session.votesByUserId[userId] = value;
  touchSession(session);
};

const reveal = (session) => {
  const activeVoters = Object.values(session.participantsByUserId).filter(
    (participant) => !participant.isObserver,
  );

  const countsByValue = VOTE_VALUES.reduce(
    (result, value) => ({
      ...result,
      [value]: 0,
    }),
    {},
  );

  const numericVotes = [];

  activeVoters.forEach((participant) => {
    const voteValue = session.votesByUserId[participant.userId];

    if (!voteValue) {
      return;
    }

    countsByValue[voteValue] += 1;

    if (voteValue !== 'coffee') {
      const numericValue = Number(voteValue);

      if (Number.isFinite(numericValue)) {
        numericVotes.push(numericValue);
      }
    }
  });

  let minimum = null;
  let maximum = null;
  let average = null;
  let suggestedStoryPoints = null;

  if (numericVotes.length > 0) {
    minimum = Math.min(...numericVotes);
    maximum = Math.max(...numericVotes);
    average = numericVotes.reduce((sum, value) => sum + value, 0) / numericVotes.length;
    suggestedStoryPoints = roundUpToAllowedScale(average);
  }

  session.phase = 'revealed';
  session.voteStats = {
    countsByValue,
    minimum,
    maximum,
    average,
    suggestedStoryPoints,
  };
  touchSession(session);
};

const restartVote = (session) => {
  session.phase = 'voting';
  session.votesByUserId = {};
  session.voteStats = null;
  touchSession(session);
};

const finishActiveCard = (session, { exclude }) => {
  if (session.activeCardId && exclude && !session.excludedCardIds.includes(session.activeCardId)) {
    session.excludedCardIds.push(session.activeCardId);
  }

  session.activeCardId = null;
  session.phase = 'idle';
  session.votesByUserId = {};
  session.voteStats = null;
  touchSession(session);
};

const isAllowedVoteValue = (value) => VOTE_VALUES.includes(String(value));

const serialize = (session) => {
  if (!session) {
    return null;
  }

  const participants = Object.values(session.participantsByUserId)
    .map((participant) => ({
      userId: participant.userId,
      isObserver: participant.isObserver,
      joinedAt: participant.joinedAt,
      isConnected: Array.isArray(participant.socketIds) && participant.socketIds.length > 0,
    }))
    .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt));

  const votedUserIds = Object.keys(session.votesByUserId);

  return {
    projectId: session.projectId,
    boardId: session.boardId,
    listId: session.listId,
    hostUserId: session.hostUserId,
    activeCardId: session.activeCardId,
    phase: session.phase,
    closingStartedAt: session.closingStartedAt || null,
    closingEndsAt: session.closingEndsAt || null,
    closingReason: session.closingReason || null,
    lastActivityAt: session.lastActivityAt || null,
    participants,
    excludedCardIds: session.excludedCardIds,
    votedUserIds,
    revealedVotes: session.phase === 'revealed' ? { ...session.votesByUserId } : null,
    voteStats: session.voteStats,
    allowedVoteValues: [...VOTE_VALUES],
    numericVoteValues: [...NUMERIC_VOTE_VALUES],
  };
};

module.exports = {
  NUMERIC_VOTE_VALUES,
  VOTE_VALUES,
  getSession,
  createSession,
  saveSession,
  deleteSession,
  joinSession,
  leaveSession,
  setObserver,
  transferHost,
  activateCard,
  vote,
  reveal,
  restartVote,
  finishActiveCard,
  startClosing,
  AUTO_CLOSE_AFTER_MS,
  CLOSING_DURATION_MS,
  isAllowedVoteValue,
  roundUpToAllowedScale,
  serialize,
};
