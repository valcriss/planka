module.exports = {
  inputs: {
    projectId: { type: 'string', required: true },
  },

  exits: {
    projectNotFound: { responseType: 'notFound' },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.qm.getOneById(inputs.projectId);

    if (!project) {
      throw 'projectNotFound';
    }

    if (currentUser.role !== User.Roles.ADMIN || project.ownerProjectManagerId) {
      const isProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        project.id,
      );

      if (!isProjectManager) {
        const membership = await BoardMembership.qm.getByProjectIdAndUserId(
          project.id,
          currentUser.id,
        );

        if (!membership) {
          throw 'projectNotFound'; // Forbidden
        }
      }
    }

    const cardTypes = await CardType.qm.getByProjectId(project.id);

    return { items: cardTypes };
  },
};
