const { idInput } = require('../../../utils/inputs');

const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
};

module.exports = {
  inputs: {
    projectId: {
      ...idInput,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
      required: true,
    },
    url: {
      type: 'string',
      maxLength: 2048,
      required: true,
    },
    accessToken: {
      type: 'string',
      allowNull: true,
      maxLength: 512,
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.qm.getOneById(inputs.projectId);
    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);
    if (!isProjectManager) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    const values = {
      name: inputs.name,
      url: inputs.url,
      accessToken: inputs.accessToken,
      projectId: project.id,
    };

    const repository = await Repository.qm.createOne(values);
    return { item: repository };
  },
};
