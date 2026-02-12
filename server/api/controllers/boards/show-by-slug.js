/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
};

module.exports = {
  inputs: {
    projectCode: {
      type: 'string',
      required: true,
    },
    slug: {
      type: 'string',
      required: true,
    },
    subscribe: {
      type: 'boolean',
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.qm.getOneByCode(inputs.projectCode);

    if (!project) {
      throw Errors.BOARD_NOT_FOUND;
    }

    const board = await Board.qm.getOneByProjectIdAndSlug(project.id, inputs.slug);

    if (!board) {
      throw Errors.BOARD_NOT_FOUND;
    }

    if (currentUser.role !== User.Roles.ADMIN || project.ownerProjectManagerId) {
      const isProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        project.id,
      );

      if (!isProjectManager) {
        const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
          board.id,
          currentUser.id,
        );

        if (!boardMembership) {
          throw Errors.BOARD_NOT_FOUND; // Forbidden
        }
      }
    }

    board.isSubscribed = await sails.helpers.users.isBoardSubscriber(currentUser.id, board.id);

    const boardMemberships = await BoardMembership.qm.getByBoardId(board.id);
    const labels = await Label.qm.getByBoardId(board.id);
    const lists = await List.qm.getByBoardId(board.id);

    const finiteLists = lists.filter((list) => sails.helpers.lists.isFinite(list));
    const finiteListIds = sails.helpers.utils.mapRecords(finiteLists);

    const cards = await Card.qm.getByListIds(finiteListIds);
    const cardIds = sails.helpers.utils.mapRecords(cards);
    const cardIdsSet = new Set(cardIds);
    const cardLinks = cardIds.length > 0 ? await CardLink.qm.getForCardIds(cardIds) : [];
    const extraCardIds = [];

    cardLinks.forEach((cardLink) => {
      if (!cardIdsSet.has(cardLink.cardId)) {
        extraCardIds.push(cardLink.cardId);
      }

      if (!cardIdsSet.has(cardLink.linkedCardId)) {
        extraCardIds.push(cardLink.linkedCardId);
      }
    });

    const linkedCards = extraCardIds.length > 0 ? await Card.qm.getByIds(_.uniq(extraCardIds)) : [];

    const userIds = _.union(
      sails.helpers.utils.mapRecords(boardMemberships, 'userId'),
      sails.helpers.utils.mapRecords(cards, 'creatorUserId', true, true),
    );

    const users = await User.qm.getByIds(userIds);
    const cardMemberships = await CardMembership.qm.getByCardIds(cardIds);
    const cardLabels = await CardLabel.qm.getByCardIds(cardIds);

    const taskLists = await TaskList.qm.getByCardIds(cardIds);
    const taskListIds = sails.helpers.utils.mapRecords(taskLists);

    const tasks = await Task.qm.getByTaskListIds(taskListIds);
    const attachments = await Attachment.qm.getByCardIds(cardIds);

    const boardCustomFieldGroups = await CustomFieldGroup.qm.getByBoardId(board.id);
    const cardCustomFieldGroups = await CustomFieldGroup.qm.getByCardIds(cardIds);

    const customFieldGroups = [...boardCustomFieldGroups, ...cardCustomFieldGroups];
    const customFieldGroupIds = sails.helpers.utils.mapRecords(customFieldGroups);

    const customFields = await CustomField.qm.getByCustomFieldGroupIds(customFieldGroupIds);
    const customFieldValues = await CustomFieldValue.qm.getByCardIds(cardIds);

    const cardSubscriptions = await CardSubscription.qm.getByCardIdsAndUserId(
      cardIds,
      currentUser.id,
    );

    const isSubscribedByCardId = cardSubscriptions.reduce(
      (result, cardSubscription) => ({
        ...result,
        [cardSubscription.cardId]: true,
      }),
      {},
    );

    cards.forEach((card) => {
      // eslint-disable-next-line no-param-reassign
      card.isSubscribed = isSubscribedByCardId[card.id] || false;
    });

    if (inputs.subscribe && this.req.isSocket) {
      sails.sockets.join(this.req, `board:${board.id}`);
    }

    return {
      item: board,
      included: {
        boardMemberships,
        labels,
        lists,
        cards,
        linkedCards,
        cardLinks,
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        customFieldGroups,
        customFields,
        customFieldValues,
        users: sails.helpers.users.presentMany(users, currentUser),
        projects: [project],
        attachments: sails.helpers.attachments.presentMany(attachments),
      },
    };
  },
};
