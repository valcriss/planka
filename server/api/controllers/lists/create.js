/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  CARD_TYPE_NOT_FOUND: { cardTypeNotFound: 'Card type not found' },
};

module.exports = {
  inputs: {
    boardId: {
      ...idInput,
      required: true,
    },
    type: {
      type: 'string',
      isIn: List.FINITE_TYPES,
      required: true,
    },
    position: {
      type: 'number',
      min: 0,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
    defaultCardTypeId: {
      type: 'string',
      allowNull: true,
    },
    defaultCardType: {
      type: 'string',
      allowNull: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    boardNotFound: {
      responseType: 'notFound',
    },
    cardTypeNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board, project } = await sails.helpers.boards
      .getPathToProjectById(inputs.boardId)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, [
      'type',
      'position',
      'name',
      'defaultCardType',
      'defaultCardTypeId',
    ]);

    if (values.defaultCardTypeId) {
      const cardType = await sails.helpers.cardTypes
        .getOrCreateForProject({
          project,
          id: values.defaultCardTypeId,
          actorUser: currentUser,
          request: this.req,
        })
        .intercept('notFound', () => Errors.CARD_TYPE_NOT_FOUND);

      values.defaultCardType = cardType.name;
      values.defaultCardTypeId = cardType.id;
    }

    const list = await sails.helpers.lists.createOne.with({
      project,
      values: {
        ...values,
        board,
      },
      actorUser: currentUser,
      request: this.req,
    });

    return {
      item: list,
    };
  },
};
