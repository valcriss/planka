const { POSITION_GAP } = require('../../../constants');

module.exports = {
  inputs: {
    project: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn({ project, actorUser, request }) {
    const boards = await Board.qm.getByProjectId(project.id);
    const startPos = POSITION_GAP * (boards.length + 1);

    const { board: backlog } = await sails.helpers.boards.createOne.with({
      values: { project, position: startPos, name: 'Backlog' },
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: backlog,
        type: List.Types.ACTIVE,
        position: POSITION_GAP,
        name: 'Raw Ideas',
      },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: backlog,
        type: List.Types.ACTIVE,
        position: POSITION_GAP * 2,
        name: 'To Refine',
      },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: backlog,
        type: List.Types.ACTIVE,
        position: POSITION_GAP * 3,
        name: 'To Estimate',
      },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: backlog,
        type: List.Types.ACTIVE,
        position: POSITION_GAP * 4,
        name: 'Ready for Sprint',
      },
      project,
      actorUser,
      request,
    });

    const { board: sprint } = await sails.helpers.boards.createOne.with({
      values: { project, position: startPos + POSITION_GAP, name: 'Sprint' },
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: { board: sprint, type: List.Types.ACTIVE, position: POSITION_GAP, name: 'To Do' },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: sprint,
        type: List.Types.ACTIVE,
        position: POSITION_GAP * 2,
        name: 'In Progress',
      },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: sprint,
        type: List.Types.ACTIVE,
        position: POSITION_GAP * 3,
        name: 'Code Review',
      },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: sprint,
        type: List.Types.ACTIVE,
        position: POSITION_GAP * 4,
        name: 'Testing',
      },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: { board: sprint, type: List.Types.CLOSED, position: POSITION_GAP * 5, name: 'Done' },
      project,
      actorUser,
      request,
    });
  },
};
