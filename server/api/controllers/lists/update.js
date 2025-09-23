/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  CARD_TYPE_NOT_FOUND: { cardTypeNotFound: 'Card type not found' },
  INVALID_CARD_LIMIT: { invalidCardLimit: 'Invalid card limit' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    type: {
      type: 'string',
      isIn: List.FINITE_TYPES,
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
    color: {
      type: 'string',
      custom: (value) => HEX_COLOR_REGEX.test(value) || List.COLORS.includes(value),
      allowNull: true,
    },
    slug: {
      type: 'string',
      allowNull: true,
    },
    defaultCardTypeId: {
      type: 'string',
      allowNull: true,
    },
    defaultCardType: {
      type: 'string',
      allowNull: true,
    },
    cardLimit: {
      type: 'ref',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    listNotFound: {
      responseType: 'notFound',
    },
    cardTypeNotFound: { responseType: 'notFound' },
    invalidCardLimit: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const pathToProject = await sails.helpers.lists
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.LIST_NOT_FOUND);

    let { list } = pathToProject;
    const { board, project } = pathToProject;

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.LIST_NOT_FOUND; // Forbidden
    }

    if (!sails.helpers.lists.isFinite(list)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, [
      'type',
      'position',
      'name',
      'color',
      'defaultCardType',
      'defaultCardTypeId',
      'cardLimit',
    ]);

    if (!_.isUndefined(inputs.cardLimit)) {
      if (inputs.cardLimit === null) {
        throw Errors.INVALID_CARD_LIMIT;
      }

      if (_.isString(inputs.cardLimit) && inputs.cardLimit.trim() === '') {
        throw Errors.INVALID_CARD_LIMIT;
      }

      const parsedCardLimit = Number(inputs.cardLimit);

      if (!Number.isInteger(parsedCardLimit) || parsedCardLimit < 0) {
        throw Errors.INVALID_CARD_LIMIT;
      }

      values.cardLimit = parsedCardLimit;
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

    list = await sails.helpers.lists.updateOne.with({
      values,
      project,
      board,
      record: list,
      actorUser: currentUser,
      request: this.req,
    });

    if (!list) {
      throw Errors.LIST_NOT_FOUND;
    }

    return {
      item: list,
    };
  },
};
