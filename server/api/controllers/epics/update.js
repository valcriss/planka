/* eslint-disable prettier/prettier */
const { idInput } = require("../../../utils/inputs");

const Errors = { EPIC_NOT_FOUND: { epicNotFound: "Epic not found" } };

module.exports = {
  inputs: {
    id: { ...idInput, required: true },
    name: { type: "string" },
    description: { type: "string" },
    color: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    position: { type: "number", min: 0 },
  },

  exits: { epicNotFound: { responseType: "notFound" } },

  async fn(inputs) {
    const { currentUser } = this.req;
    const epic = await Epic.qm.getOneById(inputs.id);
    if (!epic) {
      throw Errors.EPIC_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(
      currentUser.id,
      epic.projectId,
    );
    if (!isProjectManager) {
      throw Errors.EPIC_NOT_FOUND;
    }

    const values = _.pick(inputs, [
      "name",
      "description",
      "color",
      "startDate",
      "endDate",
      "position",
    ]);
    const updated = await Epic.qm.updateOne({ id: epic.id }, values);
    sails.sockets.broadcast(
      `project:${epic.projectId}`,
      "epicUpdate",
      { item: updated },
      this.req,
    );
    return { item: updated };
  },
};
