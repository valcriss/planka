const { POSITION_GAP } = require('../../../constants');

module.exports = {
  inputs: {
    project: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn({ project, actorUser, request }) {
    const t = sails.helpers.utils.makeTranslator(actorUser.language || request.getLocale());
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
        name: t('Raw Ideas'),
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
        name: t('To Refine'),
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
        name: t('To Estimate'),
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
        name: t('Ready for Sprint'),
        slug: 'ready-for-sprint',
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
      values: {
        board: sprint,
        type: List.Types.ACTIVE,
        position: POSITION_GAP,
        name: t('To Do'),
        slug: 'sprint-todo',
      },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: sprint,
        type: List.Types.ACTIVE,
        position: POSITION_GAP * 2,
        name: t('In Progress'),
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
        name: t('Code Review'),
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
        name: t('Testing'),
      },
      project,
      actorUser,
      request,
    });

    await sails.helpers.lists.createOne.with({
      values: {
        board: sprint,
        type: List.Types.CLOSED,
        position: POSITION_GAP * 5,
        name: t('Done'),
      },
      project,
      actorUser,
      request,
    });
  },
};
