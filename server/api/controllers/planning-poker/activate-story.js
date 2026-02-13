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
} = require('./helpers');

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    cardId: {
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

    if (session.phase === 'closing') {
      throw Errors.INVALID_STATE;
    }

    let card = await Card.qm.getOneById(inputs.cardId, {
      listId: session.listId,
    });

    if (!card) {
      card = await Card.qm.getOneById(inputs.cardId);
    }

    const cardStoryPoints = Number(card && card.storyPoints);
    const isCardEstimated = Number.isFinite(cardStoryPoints) && cardStoryPoints > 0;
    const isCardInSessionBoard = !!card && card.boardId === session.boardId;
    const isCardInSessionList = !!card && (!session.listId || card.listId === session.listId);

    if (
      !card ||
      !isCardInSessionBoard ||
      !isCardInSessionList ||
      isCardEstimated ||
      session.excludedCardIds.includes(card.id)
    ) {
      throw Errors.CARD_NOT_FOUND;
    }

    planningPokerSessions.activateCard(session, card.id);

    await planningPokerSessions.saveSession(session);

    const nextSession = await broadcastSession(project.id, this.req, session);

    return buildStatePayload(nextSession, currentUser.id);
  },
};
