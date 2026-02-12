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

    const {
      card: linkedCard,
      list: linkedList,
      board: linkedBoard,
      project: linkedProject,
    } = await sails.helpers.cards
      .getPathToProjectById(cardLink.linkedCardId)
      .intercept('pathNotFound', () => Errors.CARD_LINK_NOT_FOUND);

    const linkedBoardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      linkedBoard.id,
      currentUser.id,
    );

    if (!linkedBoardMembership) {
      throw Errors.CARD_LINK_NOT_FOUND;
    }

    if (linkedBoardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    await sails.helpers.cardLinks.deleteOne.with({
      record: cardLink,
      card,
      linkedCard,
      sourceProject: project,
      sourceBoard: board,
      sourceList: list,
      linkedProject,
      linkedBoard,
      linkedList,
      actorUser: currentUser,
      request: this.req,
    });

    return {
      item: cardLink,
    };
  },
};
