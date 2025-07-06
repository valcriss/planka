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

    const deleted = await sails.helpers.baseCardTypes.deleteOne.with({
      record: baseCardType,
      actorUser: currentUser,
      request: this.req,
    });

    if (!deleted) {
      throw Errors.BASE_CARD_TYPE_NOT_FOUND;
    }

    return { item: deleted };
  },
};
