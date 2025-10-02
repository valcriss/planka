/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_LINK_NOT_FOUND: {
    cardLinkNotFound: 'Card link not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardLinkNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const cardLink = await CardLink.qm.getOneById(inputs.id);

    if (!cardLink) {
      throw Errors.CARD_LINK_NOT_FOUND;
    }

    const { card, list, board, project } = await sails.helpers.cards
      .getPathToProjectById(cardLink.cardId)
      .intercept('pathNotFound', () => Errors.CARD_LINK_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.CARD_LINK_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const linkedCard = await Card.qm.getOneById(cardLink.linkedCardId);

    if (!linkedCard || linkedCard.boardId !== board.id) {
      throw Errors.CARD_LINK_NOT_FOUND;
    }

    const linkedList = await List.qm.getOneById(linkedCard.listId, {
      boardId: board.id,
    });

    if (!linkedList) {
      throw Errors.CARD_LINK_NOT_FOUND;
    }

    await sails.helpers.cardLinks.deleteOne.with({
      record: cardLink,
      card,
      linkedCard,
      project,
      board,
      list,
      linkedList,
      actorUser: currentUser,
      request: this.req,
    });

    return {
      item: cardLink,
    };
  },
};
