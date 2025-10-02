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
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
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

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'cardLinkCreate',
      {
        item: cardLink,
      },
      inputs.request,
    );

    const webhooks = await Webhook.qm.getAll();

    const lists = _.uniqBy([inputs.list, inputs.linkedList], 'id');
    const cards = _.uniqBy([values.card, values.linkedCard], 'id');

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.CARD_LINK_CREATE,
      buildData: () => ({
        item: cardLink,
        included: {
          projects: [inputs.project],
          boards: [inputs.board],
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
      project: inputs.project,
      board: inputs.board,
      list: inputs.list,
    });

    return cardLink;
  },
};
