const { POSITION_GAP } = require('../../../constants');

module.exports = {
  inputs: {
    project: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn({ project, actorUser, request }) {
    if (!project.useScrum) {
      return null;
    }

    const boards = await Board.qm.getByProjectId(project.id);
    const backlog = boards.find((b) => b.name === 'Backlog');
    const sprintBoard = boards.find((b) => b.name === 'Sprint');

    if (!backlog || !sprintBoard) {
      return null;
    }

    const backlogLists = await List.qm.getByBoardId(backlog.id);
    const readyList = backlogLists.find((l) => l.slug === 'ready-for-sprint');

    const sprintLists = await List.qm.getByBoardId(sprintBoard.id);
    const todoList = sprintLists.find((l) => l.slug === 'sprint-todo');
    const doneList = sprintLists.find((l) => l.type === List.Types.CLOSED);
    const archiveList = sprintLists.find((l) => l.type === List.Types.ARCHIVE);

    if (!readyList || !todoList || !doneList || !archiveList) {
      return null;
    }

    await sails.helpers.lists.moveCards.with({
      project,
      board: sprintBoard,
      record: doneList,
      values: { list: archiveList },
      actorUser,
      request,
    });

    const readyCards = await Card.qm.getByListId(readyList.id);
    const todoCards = await Card.qm.getByListId(todoList.id);
    let position = todoCards.reduce((max, c) => Math.max(max, c.position), 0);

    const webhooks = await Webhook.qm.getAll();

    const movedCards = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const card of readyCards) {
      position += POSITION_GAP;
      // eslint-disable-next-line no-await-in-loop
      const updated = await sails.helpers.cards.updateOne.with({
        webhooks,
        record: card,
        values: { board: sprintBoard, list: todoList, position },
        project,
        board: backlog,
        list: readyList,
        actorUser,
        request,
      });
      movedCards.push(updated);
    }

    let sprint = await Sprint.qm.getOneCurrentByProjectId(project.id);
    const now = new Date();

    if (sprint) {
      await Sprint.qm.updateOne(sprint.id, { closeDate: now.toISOString() });
    }

    const last = (await Sprint.qm.getByProjectId(project.id, { sort: ['number DESC'] }))[0];
    const number = last ? last.number + 1 : 1;
    const endDate = new Date(now.getTime() + project.sprintDuration * 7 * 24 * 60 * 60 * 1000);

    sprint = await Sprint.qm.createOne({
      projectId: project.id,
      number,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
    });

    await SprintCard.qm.create(
      movedCards.map((card) => ({
        sprintId: sprint.id,
        cardId: card.id,
        addedAt: now.toISOString(),
      })),
    );

    return sprint;
  },
};
