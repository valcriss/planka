/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    linkedCard: {
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

  async fn(inputs) {
    const cardLink = await CardLink.qm.deleteOne(inputs.record.id);

    if (!cardLink) {
      return cardLink;
    }

    sails.sockets.broadcast(
      `board:${inputs.board.id}`,
      'cardLinkDelete',
      {
        item: cardLink,
      },
      inputs.request,
    );

    const webhooks = await Webhook.qm.getAll();

    const lists = _.uniqBy([inputs.list, inputs.linkedList], 'id');
    const cards = _.uniqBy([inputs.card, inputs.linkedCard], 'id');

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.CARD_LINK_DELETE,
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
        type: Action.Types.REMOVE_CARD_LINK_FROM_CARD,
        data: {
          card: _.pick(inputs.card, ['id', 'name']),
          linkedCard: _.pick(inputs.linkedCard, ['id', 'name']),
          type: cardLink.type,
        },
        user: inputs.actorUser,
        card: inputs.card,
      },
      project: inputs.project,
      board: inputs.board,
      list: inputs.list,
    });

    return cardLink;
  },
};
