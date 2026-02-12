/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
  LINKED_CARD_NOT_FOUND: {
    linkedCardNotFound: 'Linked card not found',
  },
  CARD_LINK_ALREADY_EXISTS: {
    cardLinkAlreadyExists: 'Card link already exists',
  },
  CARD_CANNOT_LINK_TO_ITSELF: {
    cardCannotLinkToItself: 'Card cannot link to itself',
  },
};

module.exports = {
  inputs: {
    cardId: {
      ...idInput,
      required: true,
    },
    linkedCardId: {
      ...idInput,
      required: true,
    },
    type: {
      type: 'string',
      required: true,
      isIn: CardLink.CreatableTypes,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    linkedCardNotFound: {
      responseType: 'notFound',
    },
    cardLinkAlreadyExists: {
      responseType: 'conflict',
    },
    cardCannotLinkToItself: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (inputs.cardId === inputs.linkedCardId) {
      throw Errors.CARD_CANNOT_LINK_TO_ITSELF;
    }

    const { card, list, board, project } = await sails.helpers.cards
      .getPathToProjectById(inputs.cardId)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.CARD_NOT_FOUND; // Forbidden
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
      .getPathToProjectById(inputs.linkedCardId)
      .intercept('pathNotFound', () => Errors.LINKED_CARD_NOT_FOUND);

    const linkedBoardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      linkedBoard.id,
      currentUser.id,
    );

    if (!linkedBoardMembership) {
      throw Errors.LINKED_CARD_NOT_FOUND;
    }

    if (linkedBoardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const cardLink = await sails.helpers.cardLinks.createOne
      .with({
        sourceProject: project,
        sourceBoard: board,
        sourceList: list,
        linkedProject,
        linkedBoard,
        linkedList,
        values: {
          card,
          linkedCard,
          type: inputs.type,
        },
        actorUser: currentUser,
        request: this.req,
      })
      .intercept('cardLinkAlreadyExists', () => Errors.CARD_LINK_ALREADY_EXISTS);

    return {
      item: cardLink,
    };
  },
};
