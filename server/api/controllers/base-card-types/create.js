/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    name: { type: 'string', required: true },
    icon: { type: 'string' },
    color: { type: 'string' },
    hasStopwatch: { type: 'boolean', defaultsTo: true },
    hasTaskList: { type: 'boolean', defaultsTo: true },
    canLinkCards: { type: 'boolean', defaultsTo: true },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const values = _.pick(inputs, [
      'name',
      'icon',
      'color',
      'hasStopwatch',
      'hasTaskList',
      'canLinkCards',
    ]);

    const baseCardType = await sails.helpers.baseCardTypes.createOne.with({
      values,
      actorUser: currentUser,
      request: this.req,
    });

    return { item: baseCardType };
  },
};
