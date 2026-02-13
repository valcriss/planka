const planningPokerSessions = require('../../utils/planning-poker-sessions');
const {
  idInput,
  exits,
  buildStatePayload,
  broadcastSession,
  getProjectByIdOrThrow,
  ensureBoardMemberOrThrow,
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
      return buildStatePayload(null, currentUser.id);
    }

    await ensureBoardMemberOrThrow(session.boardId, currentUser.id);

    const nextSession = planningPokerSessions.leaveSession(session, {
      userId: currentUser.id,
      socketId: this.req.socket && this.req.socket.id,
    });

    if (nextSession) {
      await planningPokerSessions.saveSession(nextSession);
    } else {
      await planningPokerSessions.deleteSession(project.id);
    }

    await broadcastSession(project.id, this.req, nextSession);

    return buildStatePayload(nextSession, currentUser.id);
  },
};
