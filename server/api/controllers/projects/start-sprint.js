const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  PROJECT_NOT_FOUND: { projectNotFound: 'Project not found' },
  SCRUM_NOT_ENABLED: { scrumNotEnabled: 'Scrum not enabled for project' },
};

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
  },

  exits: {
    notEnoughRights: { responseType: 'forbidden' },
    projectNotFound: { responseType: 'notFound' },
    scrumNotEnabled: { responseType: 'unprocessableEntity' },
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
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    if (!project.useScrum) {
      throw Errors.SCRUM_NOT_ENABLED;
    }

    const sprint = await sails.helpers.projects.startSprint.with({
      project,
      actorUser: currentUser,
      request: this.req,
    });

    return { item: sprint };
  },
};
