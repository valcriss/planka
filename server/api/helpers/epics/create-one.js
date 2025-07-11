/* eslint-disable prettier/prettier */
module.exports = {
  inputs: {
    values: { type: "ref", required: true },
    request: { type: "ref" },
  },
  async fn({ values, request }) {
    const epic = await Epic.qm.createOne({
      ...values,
      color: values.color || '#000000',
      projectId: values.project.id,
    });
    sails.sockets.broadcast(
      `project:${epic.projectId}`,
      "epicCreate",
      { item: epic },
      request,
    );
    return epic;
  },
};
