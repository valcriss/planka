const planningPokerSessions = require('../../utils/planning-poker-sessions');
const {
  idInput,
  exits,
  buildStatePayload,
  getProjectByIdOrThrow,
  ensureBoardMemberOrThrow,
  maybeJoinSocketRoom,
} = require('./helpers');

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    boardId: {
      ...idInput,
      required: true,
    },
  },

  exits,

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await getProjectByIdOrThrow(inputs.projectId);

    await ensureBoardMemberOrThrow(inputs.boardId, currentUser.id);

    const session = await planningPokerSessions.getSession(project.id);

    if (session) {
      await ensureBoardMemberOrThrow(session.boardId, currentUser.id);
    }

    maybeJoinSocketRoom(this.req, `planningPoker:${project.id}`);

    return buildStatePayload(session, currentUser.id);
  },
};
