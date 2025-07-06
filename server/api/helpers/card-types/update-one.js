module.exports = {
  inputs: {
    record: { type: 'ref', required: true },
    values: { type: 'json', required: true },
    project: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const values = { ...inputs.values };

    if (Object.prototype.hasOwnProperty.call(values, 'color') && values.color == null) {
      values.color = '#000000';
    }

    const cardType = await CardType.qm.updateOne(inputs.record.id, values);

    if (cardType) {
      const scoper = sails.helpers.projects.makeScoper.with({ record: inputs.project });
      const userIds = await scoper.getProjectRelatedUserIds();

      userIds.forEach((userId) => {
        sails.sockets.broadcast(
          `user:${userId}`,
          'cardTypeUpdate',
          { item: cardType },
          inputs.request,
        );
      });
    }

    return cardType;
  },
};
