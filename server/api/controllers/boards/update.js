/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  CARD_TYPE_NOT_FOUND: { cardTypeNotFound: 'Card type not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    position: {
      type: 'number',
      min: 0,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 128,
    },
    defaultView: {
      type: 'string',
      isIn: Object.values(Board.Views),
    },
    defaultCardType: {
      type: 'string',
      allowNull: true,
    },
    defaultCardTypeId: {
      type: 'string',
      allowNull: true,
    },
    swimlaneType: {
      type: 'string',
      isIn: Object.values(Board.SwimlaneTypes),
    },
    limitCardTypesToDefaultOne: {
      type: 'boolean',
      allowNull: true,
    },
    alwaysDisplayCardCreator: {
      type: 'boolean',
    },
    isSubscribed: {
      type: 'boolean',
    },
    showCardCount: {
      type: 'boolean',
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
    cardTypeNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const pathToProject = await sails.helpers.boards
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    let { board } = pathToProject;
    const { project } = pathToProject;

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);
    const isBoardMember = await sails.helpers.users.isBoardMember(currentUser.id, board.id);

    if (!isProjectManager && !isBoardMember) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    const availableInputKeys = ['id'];
    if (isProjectManager) {
      availableInputKeys.push(
        'position',
        'name',
        'defaultView',
        'defaultCardType',
        'defaultCardTypeId',
        'swimlaneType',
        'limitCardTypesToDefaultOne',
        'alwaysDisplayCardCreator',
        'showCardCount',
      );
    }
    if (isBoardMember) {
      availableInputKeys.push('isSubscribed');
    }

    if (_.difference(Object.keys(inputs), availableInputKeys).length > 0) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, [
      'position',
      'name',
      'defaultView',
      'defaultCardType',
      'defaultCardTypeId',
      'swimlaneType',
      'limitCardTypesToDefaultOne',
      'alwaysDisplayCardCreator',
      'isSubscribed',
      'showCardCount',
    ]);

    if (!_.isUndefined(values.showCardCount)) {
      values.showCardCount = project.useScrum ? false : values.showCardCount;
    }

    if (values.defaultCardTypeId) {
      const cardType = await sails.helpers.cardTypes.getOrCreateForProject
        .with({
          project,
          id: values.defaultCardTypeId,
          actorUser: currentUser,
          request: this.req,
        })
        .intercept('notFound', () => Errors.CARD_TYPE_NOT_FOUND);

      values.defaultCardType = cardType.name;
      values.defaultCardTypeId = cardType.id;
    }

    board = await sails.helpers.boards.updateOne.with({
      values,
      project,
      record: board,
      actorUser: currentUser,
      request: this.req,
    });

    if (!board) {
      throw Errors.BOARD_NOT_FOUND;
    }

    return {
      item: board,
    };
  },
};
