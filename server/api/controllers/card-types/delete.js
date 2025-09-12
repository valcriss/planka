/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  CARD_TYPE_NOT_FOUND: { cardTypeNotFound: 'Card type not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
  },

  exits: {
    cardTypeNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const cardType = await CardType.qm.getOneById(inputs.id);

    if (!cardType) {
      throw Errors.CARD_TYPE_NOT_FOUND;
    }

    const project = await Project.qm.getOneById(cardType.projectId);
    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager) {
      throw Errors.CARD_TYPE_NOT_FOUND; // Forbidden
    }

    const deleted = await sails.helpers.cardTypes.deleteOne.with({
      record: cardType,
      actorUser: currentUser,
      project,
      request: this.req,
    });

    if (!deleted) {
      throw Errors.CARD_TYPE_NOT_FOUND;
    }

    return { item: deleted };
  },
};
