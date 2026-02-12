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

  async fn(inputs) {
    const cardLink = await CardLink.qm.deleteOne(inputs.record.id);

    if (!cardLink) {
      return cardLink;
    }

    _.uniq([inputs.sourceBoard.id, inputs.linkedBoard.id]).forEach((boardId) => {
      sails.sockets.broadcast(
        `board:${boardId}`,
        'cardLinkDelete',
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
    const cards = _.uniqBy([inputs.card, inputs.linkedCard], 'id');

    sails.helpers.utils.sendWebhooks.with({
      webhooks,
      event: Webhook.Events.CARD_LINK_DELETE,
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
        type: Action.Types.REMOVE_CARD_LINK_FROM_CARD,
        data: {
          card: _.pick(inputs.card, ['id', 'name']),
          linkedCard: _.pick(inputs.linkedCard, ['id', 'name']),
          type: cardLink.type,
        },
        user: inputs.actorUser,
        card: inputs.card,
      },
      project: inputs.sourceProject,
      board: inputs.sourceBoard,
      list: inputs.sourceList,
    });

    return cardLink;
  },
};
