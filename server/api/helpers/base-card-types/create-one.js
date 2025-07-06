module.exports = {
  inputs: {
    values: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const { values } = inputs;

    const baseCardType = await BaseCardType.qm.createOne(values);

    const userIds = await sails.helpers.users.getAllIds();

    userIds.forEach((userId) => {
      sails.sockets.broadcast(
        `user:${userId}`,
        'baseCardTypeCreate',
        { item: baseCardType },
        inputs.request,
      );
    });

    return baseCardType;
  },
};
