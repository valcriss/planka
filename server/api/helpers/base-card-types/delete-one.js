module.exports = {
  inputs: {
    record: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const baseCardType = await BaseCardType.qm.deleteOne(inputs.record.id);

    if (baseCardType) {
      const userIds = await sails.helpers.users.getAllIds();
      userIds.forEach((userId) => {
        sails.sockets.broadcast(
          `user:${userId}`,
          'baseCardTypeDelete',
          { item: baseCardType },
          inputs.request,
        );
      });
    }

    return baseCardType;
  },
};
