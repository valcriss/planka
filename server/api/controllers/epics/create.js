/* eslint-disable prettier/prettier */
const { idInput } = require("../../../utils/inputs");

const Errors = { PROJECT_NOT_FOUND: { projectNotFound: "Project not found" } };

module.exports = {
  inputs: {
    projectId: { ...idInput, required: true },
    position: { type: "number", min: 0, required: true },
    name: { type: "string", required: true },
    description: { type: "string", allowNull: true },
    icon: { type: "string", allowNull: true },
    color: { type: "string", allowNull: true },
    startDate: { type: "string", allowNull: true },
    endDate: { type: "string", allowNull: true },
  },

  exits: { projectNotFound: { responseType: "notFound" } },

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
      throw Errors.PROJECT_NOT_FOUND;
    }

    const values = _.pick(inputs, [
      "position",
      "name",
      "description",
      "icon",
      "color",
      "startDate",
      "endDate",
    ]);
    const epic = await sails.helpers.epics.createOne.with({
      values: { ...values, project },
      actorUser: currentUser,
      request: this.req,
    });
    return { item: epic };
  },
};
