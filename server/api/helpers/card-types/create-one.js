module.exports = {
  inputs: {
    values: { type: 'ref', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  async fn(inputs) {
    const { values } = inputs;
    if (values.color == null) {
      values.color = '#000000';
    }

    const cardType = await CardType.qm.createOne({
      ...values,
      projectId: values.project.id,
    });

    const scoper = sails.helpers.projects.makeScoper.with({ record: values.project });
    const userIds = await scoper.getProjectRelatedUserIds();

    userIds.forEach((userId) => {
      sails.sockets.broadcast(
        `user:${userId}`,
        'cardTypeCreate',
        { item: cardType },
        inputs.request,
      );
    });

    return cardType;
  },
};
