module.exports = {
  inputs: {
    record: { type: 'ref', required: true },
    project: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const cardType = await CardType.qm.deleteOne(inputs.record.id);

    if (cardType) {
      const scoper = sails.helpers.projects.makeScoper.with({ record: inputs.project });
      const userIds = await scoper.getProjectRelatedUserIds();

      userIds.forEach((userId) => {
        sails.sockets.broadcast(
          `user:${userId}`,
          'cardTypeDelete',
          { item: cardType },
          inputs.request,
        );
      });
    }

    return cardType;
  },
};
