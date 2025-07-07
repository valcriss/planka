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
    name: { type: 'string' },
    icon: { type: 'string' },
    color: { type: 'string', allowNull: true },
    hasStopwatch: { type: 'boolean' },
    hasTaskList: { type: 'boolean' },
    canLinkCards: { type: 'boolean' },
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
    const isProjectManager = await sails.helpers.users.isProjectManager(
      currentUser.id,
      project.id,
    );

    if (!isProjectManager) {
      throw Errors.CARD_TYPE_NOT_FOUND; // Forbidden
    }

    const values = _.pick(inputs, [
      'name',
      'icon',
      'color',
      'hasStopwatch',
      'hasTaskList',
      'canLinkCards',
    ]);

    const updated = await sails.helpers.cardTypes.updateOne.with({
      record: cardType,
      values,
      actorUser: currentUser,
      project,
      request: this.req,
    });

    if (!updated) {
      throw Errors.CARD_TYPE_NOT_FOUND;
    }

    return { item: updated };
  },
};
