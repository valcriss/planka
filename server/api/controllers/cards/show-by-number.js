/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
};

module.exports = {
  inputs: {
    projectCode: {
      type: 'string',
      required: true,
    },
    number: {
      type: 'number',
      required: true,
    },
  },

  exits: {
    cardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const card = await Card.qm.getOneByProjectCodeAndNumber(inputs.projectCode, inputs.number);

    if (!card) {
      throw Errors.CARD_NOT_FOUND;
    }

    const { project } = await sails.helpers.cards
      .getPathToProjectById(card.id)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    if (currentUser.role !== User.Roles.ADMIN || project.ownerProjectManagerId) {
      const isProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        project.id,
      );

      if (!isProjectManager) {
        const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
          card.boardId,
          currentUser.id,
        );

        if (!boardMembership) {
          throw Errors.CARD_NOT_FOUND; // Forbidden
        }
      }
    }

    card.isSubscribed = await sails.helpers.users.isCardSubscriber(currentUser.id, card.id);

    const users = card.creatorUserId ? await User.qm.getByIds([card.creatorUserId]) : [];
    const cardMemberships = await CardMembership.qm.getByCardId(card.id);
    const cardLabels = await CardLabel.qm.getByCardId(card.id);

    const taskLists = await TaskList.qm.getByCardId(card.id);
    const taskListIds = sails.helpers.utils.mapRecords(taskLists);

    const tasks = await Task.qm.getByTaskListIds(taskListIds);
    const attachments = await Attachment.qm.getByCardId(card.id);

    const customFieldGroups = await CustomFieldGroup.qm.getByCardId(card.id);
    const customFieldGroupIds = sails.helpers.utils.mapRecords(customFieldGroups);

    const customFields = await CustomField.qm.getByCustomFieldGroupIds(customFieldGroupIds);
    const customFieldValues = await CustomFieldValue.qm.getByCardId(card.id);

    const cardLinks = await CardLink.qm.getForCardId(card.id);

    const linkedCardIds = new Set();
    cardLinks.forEach((cardLink) => {
      if (cardLink.cardId !== card.id) {
        linkedCardIds.add(cardLink.cardId);
      }

      if (cardLink.linkedCardId !== card.id) {
        linkedCardIds.add(cardLink.linkedCardId);
      }
    });

    const linkedCards = linkedCardIds.size > 0 ? await Card.qm.getByIds([...linkedCardIds]) : [];

    return {
      item: card,
      included: {
        cardLinks,
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        customFieldGroups,
        customFields,
        customFieldValues,
        linkedCards,
        users: sails.helpers.users.presentMany(users, currentUser),
        attachments: sails.helpers.attachments.presentMany(attachments),
      },
    };
  },
};
