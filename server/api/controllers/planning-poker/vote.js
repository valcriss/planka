const planningPokerSessions = require('../../utils/planning-poker-sessions');
const {
  idInput,
  exits,
  Errors,
  buildStatePayload,
  broadcastSession,
  getProjectByIdOrThrow,
  ensureBoardMemberOrThrow,
  ensureParticipantOrThrow,
  ensureActiveCardOrThrow,
} = require('./helpers');

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    value: {
      type: 'string',
      required: true,
    },
  },

  exits,

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await getProjectByIdOrThrow(inputs.projectId);

    const session = await planningPokerSessions.getSession(project.id);

    if (!session) {
      throw Errors.SESSION_NOT_FOUND;
    }

    await ensureBoardMemberOrThrow(session.boardId, currentUser.id, Errors.NOT_ENOUGH_RIGHTS);

    ensureParticipantOrThrow(session, currentUser.id);
    ensureActiveCardOrThrow(session);

    if (session.phase !== 'voting') {
      throw Errors.INVALID_STATE;
    }

    const participant = session.participantsByUserId[currentUser.id];

    if (participant.isObserver) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const normalizedValue = String(inputs.value);

    if (!planningPokerSessions.isAllowedVoteValue(normalizedValue)) {
      throw Errors.INVALID_VALUE;
    }

    planningPokerSessions.vote(session, currentUser.id, normalizedValue);

    await planningPokerSessions.saveSession(session);

    const nextSession = await broadcastSession(project.id, this.req, session);

    return buildStatePayload(nextSession, currentUser.id);
  },
};
