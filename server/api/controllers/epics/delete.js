/* eslint-disable prettier/prettier */
const { idInput } = require("../../../utils/inputs");

const Errors = { EPIC_NOT_FOUND: { epicNotFound: "Epic not found" } };

module.exports = {
  inputs: { id: { ...idInput, required: true } },

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

    await Epic.qm.deleteOne({ id: epic.id });
    sails.sockets.broadcast(
      `project:${epic.projectId}`,
      "epicDelete",
      { item: epic },
      this.req,
    );
    return { item: epic };
  },
};
