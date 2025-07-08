const { expect } = require('chai');

// This test covers moving cards between active lists

describe('helpers/lists.moveCards', () => {
  let user;
  let project;
  let board;
  let listA;
  let listB;

  before(async () => {
    user = await User.qm.createOne({
      email: 'move-cards@test.test',
      password: 'test',
      role: User.Roles.ADMIN,
      name: 'tester',
    });

    project = await Project.qm.createOne({
      name: 'Move Cards Project',
      type: Project.Types.SHARED,
    });

    board = await Board.qm.createOne({
      projectId: project.id,
      name: 'Board',
      position: 1,
    });

    await BoardMembership.qm.createOne({
      projectId: project.id,
      boardId: board.id,
      userId: user.id,
      role: BoardMembership.Roles.EDITOR,
    });

    listA = await List.qm.createOne({
      boardId: board.id,
      type: List.Types.ACTIVE,
      position: 1,
      name: 'List A',
    });

    listB = await List.qm.createOne({
      boardId: board.id,
      type: List.Types.ACTIVE,
      position: 2,
      name: 'List B',
    });

    card1 = await Card.qm.createOne({
      boardId: board.id,
      listId: listA.id,
      name: 'Card 1',
      type: Card.Types.PROJECT,
    });

    card2 = await Card.qm.createOne({
      boardId: board.id,
      listId: listA.id,
      name: 'Card 2',
      type: Card.Types.PROJECT,
    });
  });

  it('moves cards and creates actions', async () => {
    const { cards, actions } = await sails.helpers.lists.moveCards.with({
      project,
      board,
      record: listA,
      values: { list: listB },
      actorUser: user,
      allowFiniteList: true,
    });

    expect(cards).to.have.lengthOf(2);
    cards.forEach((card) => {
      expect(card.listId).to.equal(listB.id);
    });

    expect(actions).to.have.lengthOf(2);
    actions.forEach((action) => {
      expect(action.type).to.equal(Action.Types.MOVE_CARD);
      expect(action.data.fromList.id).to.equal(listA.id);
      expect(action.data.toList.id).to.equal(listB.id);
    });
  });
});
