/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    values: {
      type: 'ref',
      required: true,
    },
    sourceProject: {
      type: 'ref',
      required: true,
    },
    sourceBoard: {
      type: 'ref',
      required: true,
    },
    sourceList: {
      type: 'ref',
      required: true,
    },
    linkedProject: {
      type: 'ref',
      required: true,
    },
    linkedBoard: {
      type: 'ref',
      required: true,
    },
    linkedList: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  exits: {
    cardLinkAlreadyExists: {},
  },

  async fn(inputs) {
    const { values } = inputs;

    let cardLink;
    try {
      cardLink = await CardLink.qm.createOne({
        type: values.type,
        cardId: values.card.id,
        linkedCardId: values.linkedCard.id,
      });
    } catch (error) {
      if (error.code === 'E_UNIQUE') {
        throw 'cardLinkAlreadyExists';
      }

      throw error;
    }

    _.uniq([inputs.sourceBoard.id, inputs.linkedBoard.id]).forEach((boardId) => {
      sails.sockets.broadcast(
        `board:${boardId}`,
        'cardLinkCreate',
        {
          item: cardLink,
        },
        inputs.request,
      );
    });

    const webhooks = await Webhook.qm.getAll();

    const projects = _.uniqBy([inputs.sourceProject, inputs.linkedProject], 'id');
    const boards = _.uniqBy([inputs.sourceBoard, inputs.linkedBoard], 'id');
    const lists = _.uniqBy([inputs.sourceList, inputs.linkedList], 'id');
    const cards = _.uniqBy([values.card, values.linkedCard], 'id');

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.CARD_LINK_CREATE,
      buildData: () => ({
        item: cardLink,
        included: {
          projects,
          boards,
          lists,
          cards,
        },
      }),
      user: inputs.actorUser,
    });

    await sails.helpers.actions.createOne.with({
      webhooks,
      values: {
        type: Action.Types.ADD_CARD_LINK_TO_CARD,
        data: {
          card: _.pick(values.card, ['id', 'name']),
          linkedCard: _.pick(values.linkedCard, ['id', 'name']),
          type: cardLink.type,
        },
        user: inputs.actorUser,
        card: values.card,
      },
      project: inputs.sourceProject,
      board: inputs.sourceBoard,
      list: inputs.sourceList,
    });

    return cardLink;
  },
};
