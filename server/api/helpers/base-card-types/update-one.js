module.exports = {
  inputs: {
    record: { type: 'ref', required: true },
    values: { type: 'json', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const values = { ...inputs.values };

    if (Object.prototype.hasOwnProperty.call(values, 'color') && values.color == null) {
      values.color = '#000000';
    }

    const baseCardType = await BaseCardType.qm.updateOne(inputs.record.id, values);

    if (baseCardType) {
      const userIds = await sails.helpers.users.getAllIds();
      userIds.forEach((userId) => {
        sails.sockets.broadcast(
          `user:${userId}`,
          'baseCardTypeUpdate',
          { item: baseCardType },
          inputs.request,
        );
      });
    }

    return baseCardType;
  },
};
