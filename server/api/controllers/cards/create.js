/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { isDueDate, isStopwatch } = require('../../../utils/validators');
const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  POSITION_MUST_BE_PRESENT: {
    positionMustBePresent: 'Position must be present',
  },
  CARD_TYPE_NOT_FOUND: {
    cardTypeNotFound: 'Card type not found',
  },
};

module.exports = {
  inputs: {
    listId: {
      ...idInput,
      required: true,
    },
    type: {
      type: 'string',
      allowNull: true,
    },
    cardTypeId: {
      type: 'string',
      allowNull: true,
    },
    position: {
      type: 'number',
      min: 0,
      allowNull: true,
    },
    name: {
      type: 'string',
      maxLength: 1024,
      required: true,
    },
    description: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 1048576,
      allowNull: true,
    },
    dueDate: {
      type: 'string',
      custom: isDueDate,
    },
    ganttStartDate: {
      type: 'string',
      custom: isDueDate,
      allowNull: true,
    },
    ganttEndDate: {
      type: 'string',
      custom: isDueDate,
      allowNull: true,
    },
    stopwatch: {
      type: 'json',
      custom: isStopwatch,
    },
    storyPoints: {
      type: 'number',
      min: 0,
      allowNull: true,
    },
    epicId: {
      type: 'string',
      allowNull: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    listNotFound: {
      responseType: 'notFound',
    },
    positionMustBePresent: {
      responseType: 'unprocessableEntity',
    },
    cardTypeNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { list, board, project } = await sails.helpers.lists
      .getPathToProjectById(inputs.listId)
      .intercept('pathNotFound', () => Errors.LIST_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.LIST_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, [
      'type',
      'position',
      'name',
      'description',
      'dueDate',
      'ganttStartDate',
      'ganttEndDate',
      'stopwatch',
      'cardTypeId',
      'storyPoints',
      'epicId',
    ]);

    if (values.cardTypeId) {
      const cardType = await sails.helpers.cardTypes.getOrCreateForProject
        .with({
          project,
          id: values.cardTypeId,
          actorUser: currentUser,
          request: this.req,
        })
        .intercept('notFound', () => Errors.CARD_TYPE_NOT_FOUND);

      values.type = cardType.name;
      values.cardTypeId = cardType.id;
    }

    const card = await sails.helpers.cards.createOne
      .with({
        project,
        values: {
          ...values,
          board,
          list,
          creatorUser: currentUser,
        },
        request: this.req,
      })
      .intercept('positionMustBeInValues', () => Errors.POSITION_MUST_BE_PRESENT);

    return {
      item: card,
    };
  },
};
