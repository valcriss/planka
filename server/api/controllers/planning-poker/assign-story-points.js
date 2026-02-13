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
    storyPoints: {
      type: 'number',
      required: true,
      min: 0,
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

    if (!planningPokerSessions.NUMERIC_VOTE_VALUES.includes(inputs.storyPoints)) {
      throw Errors.INVALID_VALUE;
    }

    const {
      card,
      list,
      board,
      project: cardProject,
    } = await sails.helpers.cards
      .getPathToProjectById(session.activeCardId)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    await sails.helpers.cards.updateOne.with({
      project: cardProject,
      board,
      list,
      record: card,
      values: {
        storyPoints: inputs.storyPoints,
      },
      actorUser: currentUser,
      request: this.req,
    });

    planningPokerSessions.finishActiveCard(session, {
      exclude: true,
    });

    await planningPokerSessions.saveSession(session);

    const nextSession = await broadcastSession(project.id, this.req, session);

    return buildStatePayload(nextSession, currentUser.id);
  },
};
