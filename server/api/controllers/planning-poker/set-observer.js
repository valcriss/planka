const planningPokerSessions = require('../../utils/planning-poker-sessions');
const {
  idInput,
  exits,
  Errors,
  parseBooleanInput,
  buildStatePayload,
  broadcastSession,
  getProjectByIdOrThrow,
  ensureBoardMemberOrThrow,
  ensureParticipantOrThrow,
} = require('./helpers');

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    isObserver: {
      type: 'json',
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

    const isObserver = parseBooleanInput(inputs.isObserver);

    if (_.isNull(isObserver)) {
      throw Errors.INVALID_VALUE;
    }

    planningPokerSessions.setObserver(session, currentUser.id, isObserver);

    await planningPokerSessions.saveSession(session);

    const nextSession = await broadcastSession(project.id, this.req, session);

    return buildStatePayload(nextSession, currentUser.id);
  },
};
