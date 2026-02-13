const planningPokerSessions = require('../../utils/planning-poker-sessions');
const {
  idInput,
  Errors,
  exits,
  isToEstimateList,
  buildStatePayload,
  broadcastSession,
  getProjectByIdOrThrow,
  getBoardByIdOrThrow,
  ensureBoardMemberOrThrow,
  ensureProjectManagerOrThrow,
  getListByIdOrThrow,
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
    listId: idInput,
  },

  exits,

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await getProjectByIdOrThrow(inputs.projectId);
    const board = await getBoardByIdOrThrow(inputs.boardId, project.id);

    await ensureBoardMemberOrThrow(board.id, currentUser.id);

    let session = await planningPokerSessions.getSession(project.id);

    if (!session) {
      await ensureProjectManagerOrThrow(project.id, currentUser.id);

      if (!inputs.listId) {
        throw Errors.LIST_NOT_FOUND;
      }

      const list = await getListByIdOrThrow(inputs.listId, board.id);

      if (!isToEstimateList(list)) {
        throw Errors.LIST_NOT_FOUND;
      }

      session = await planningPokerSessions.createSession({
        projectId: project.id,
        boardId: board.id,
        listId: list.id,
        hostUserId: currentUser.id,
      });
    } else {
      await ensureBoardMemberOrThrow(session.boardId, currentUser.id, Errors.NOT_ENOUGH_RIGHTS);
    }

    maybeJoinSocketRoom(this.req, `planningPoker:${project.id}`);

    planningPokerSessions.joinSession(session, {
      userId: currentUser.id,
      socketId: this.req.socket && this.req.socket.id,
    });

    await planningPokerSessions.saveSession(session);

    session = await broadcastSession(project.id, this.req, session);

    return buildStatePayload(session, currentUser.id);
  },
};
