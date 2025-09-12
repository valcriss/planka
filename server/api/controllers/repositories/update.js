const { idInput } = require('../../../utils/inputs');

const Errors = {
  REPOSITORY_NOT_FOUND: {
    repositoryNotFound: 'Repository not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 128,
    },
    url: {
      type: 'string',
      maxLength: 2048,
    },
    accessToken: {
      type: 'string',
      allowNull: true,
      maxLength: 512,
    },
  },

  exits: {
    repositoryNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const repository = await Repository.qm.getOneById(inputs.id);
    if (!repository) {
      throw Errors.REPOSITORY_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(
      currentUser.id,
      repository.projectId,
    );
    if (!isProjectManager) {
      throw Errors.REPOSITORY_NOT_FOUND; // Forbidden
    }

    const values = {};
    if (inputs.name !== undefined) values.name = inputs.name;
    if (inputs.url !== undefined) values.url = inputs.url;
    if (Object.prototype.hasOwnProperty.call(inputs, 'accessToken')) {
      values.accessToken = inputs.accessToken;
    }

    const updated = await Repository.qm.updateOne({ id: repository.id }, values);
    return { item: updated };
  },
};
