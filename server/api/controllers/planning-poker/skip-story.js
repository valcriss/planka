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
  ensureHostOrThrow,
  ensureActiveCardOrThrow,
} = require('./helpers');

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
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
    ensureHostOrThrow(session, currentUser.id);
    ensureActiveCardOrThrow(session);

    planningPokerSessions.finishActiveCard(session, {
      exclude: true,
    });

    await planningPokerSessions.saveSession(session);

    const nextSession = await broadcastSession(project.id, this.req, session);

    return buildStatePayload(nextSession, currentUser.id);
  },
};
