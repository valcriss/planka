const { idInput } = require('../../../utils/inputs');

const Errors = {
  SPRINT_NOT_FOUND: { sprintNotFound: 'Sprint not found' },
};

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
  },

  exits: {
    sprintNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const sprint = await Sprint.qm.getOneById(inputs.id);

    if (!sprint) {
      throw Errors.SPRINT_NOT_FOUND;
    }

    const project = await Project.qm.getOneById(sprint.projectId);

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager) {
      const boardMemberships = await BoardMembership.qm.getByProjectIdAndUserId(
        project.id,
        currentUser.id,
      );

      if (boardMemberships.length === 0) {
        throw Errors.SPRINT_NOT_FOUND; // Forbidden
      }
    }

    const sprintCards = await SprintCard.qm.getBySprintId(sprint.id);
    const cardIds = sails.helpers.utils.mapRecords(sprintCards, 'cardId');
    const cards = cardIds.length > 0 ? await Card.qm.getByIds(cardIds) : [];

    return {
      item: sprint,
      included: {
        cards,
      },
    };
  },
};
