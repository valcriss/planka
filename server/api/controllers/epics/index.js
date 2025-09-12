/* eslint-disable prettier/prettier */
const { idInput } = require("../../../utils/inputs");

const Errors = { PROJECT_NOT_FOUND: { projectNotFound: "Project not found" } };

module.exports = {
  inputs: { projectId: { ...idInput, required: true } },

  exits: { projectNotFound: { responseType: "notFound" } },

  async fn({ projectId }) {
    const { currentUser } = this.req;
    const project = await Project.qm.getOneById(projectId);
    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }
    const isProjectManager = await sails.helpers.users.isProjectManager(
      currentUser.id,
      project.id,
    );
    if (!isProjectManager) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const epics = await Epic.qm.getByProjectId(project.id);
    return { items: epics };
  },
};
