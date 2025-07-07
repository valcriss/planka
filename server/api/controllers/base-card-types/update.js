/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  BASE_CARD_TYPE_NOT_FOUND: { baseCardTypeNotFound: 'Base card type not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    name: { type: 'string' },
    icon: { type: 'string' },
    color: { type: 'string', allowNull: true },
    hasStopwatch: { type: 'boolean' },
    hasTaskList: { type: 'boolean' },
    canLinkCards: { type: 'boolean' },
  },

  exits: {
    baseCardTypeNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const baseCardType = await BaseCardType.qm.getOneById(inputs.id);

    if (!baseCardType) {
      throw Errors.BASE_CARD_TYPE_NOT_FOUND;
    }

    const values = _.pick(inputs, [
      'name',
      'icon',
      'color',
      'hasStopwatch',
      'hasTaskList',
      'canLinkCards',
    ]);

    const updated = await sails.helpers.baseCardTypes.updateOne.with({
      record: baseCardType,
      values,
      actorUser: currentUser,
      request: this.req,
    });

    if (!updated) {
      throw Errors.BASE_CARD_TYPE_NOT_FOUND;
    }

    return { item: updated };
  },
};
