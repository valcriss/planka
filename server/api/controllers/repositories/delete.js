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

    const deleted = await Repository.qm.deleteOne({ id: repository.id });
    return { item: deleted };
  },
};
