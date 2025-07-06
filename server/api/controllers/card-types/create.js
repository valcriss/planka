/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
};

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
    name: { type: 'string', required: true },
    icon: { type: 'string' },
    color: { type: 'string', allowNull: true },
    hasStopwatch: { type: 'boolean', defaultsTo: true },
    hasTaskList: { type: 'boolean', defaultsTo: true },
    canLinkCards: { type: 'boolean', defaultsTo: true },
  },

  exits: {
    projectNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(
      currentUser.id,
      project.id,
    );

    if (!isProjectManager) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    const values = _.pick(inputs, [
      'name',
      'icon',
      'color',
      'hasStopwatch',
      'hasTaskList',
      'canLinkCards',
    ]);

    const cardType = await sails.helpers.cardTypes.createOne.with({
      values: { ...values, project },
      actorUser: currentUser,
      request: this.req,
    });

    return { item: cardType };
  },
};
