/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { POSITION_GAP } = require('../../../constants');

module.exports = {
  inputs: {
    type: {
      type: 'string',
      isIn: Object.values(Project.Types),
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
    description: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 1024,
      allowNull: true,
    },
    template: {
      type: 'string',
      isIn: ['none', 'kaban', 'scrum'],
      defaultsTo: 'none',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const t = sails.helpers.utils.makeTranslator(currentUser.language || this.req.getLocale());

    const values = _.pick(inputs, ['type', 'name', 'description']);
    if (inputs.template === 'scrum') {
      values.useStoryPoints = true;
      values.useScrum = true;
    }

    const { project, projectManager } = await sails.helpers.projects.createOne.with({
      values,
      actorUser: currentUser,
      request: this.req,
    });

    if (inputs.template === 'kaban') {
      const { board } = await sails.helpers.boards.createOne.with({
        values: {
          project,
          position: POSITION_GAP,
          name: t('Board'),
        },
        actorUser: currentUser,
        request: this.req,
      });

      await sails.helpers.lists.createOne.with({
        values: {
          board,
          type: List.Types.ACTIVE,
          position: POSITION_GAP,
          name: t('To do'),
        },
        project,
        actorUser: currentUser,
        request: this.req,
      });

      await sails.helpers.lists.createOne.with({
        values: {
          board,
          type: List.Types.ACTIVE,
          position: POSITION_GAP * 2,
          name: t('Ongoing'),
        },
        project,
        actorUser: currentUser,
        request: this.req,
      });

      await sails.helpers.lists.createOne.with({
        values: {
          board,
          type: List.Types.CLOSED,
          position: POSITION_GAP * 3,
          name: t('Done'),
        },
        project,
        actorUser: currentUser,
        request: this.req,
      });
    } else if (inputs.template === 'scrum') {
      await sails.helpers.projects.createScrumBoards.with({
        project,
        actorUser: currentUser,
        request: this.req,
      });
    }

    return {
      item: project,
      included: {
        projectManagers: [projectManager],
      },
    };
  },
};
