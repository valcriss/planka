module.exports = {
  inputs: {
    project: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn({ project, actorUser, request }) {
    const boards = await Board.qm.getByProjectId(project.id);
    const scrumBoards = boards.filter((b) => ['Backlog', 'Sprint'].includes(b.name));

    // eslint-disable-next-line no-restricted-syntax
    for (const board of scrumBoards) {
      // eslint-disable-next-line no-await-in-loop
      await sails.helpers.boards.deleteOne.with({
        record: board,
        project,
        actorUser,
        request,
      });
    }
  },
};
