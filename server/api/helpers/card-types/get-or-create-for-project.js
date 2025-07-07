module.exports = {
  inputs: {
    project: { type: 'ref', required: true },
    id: { type: 'string', required: true },
    actorUser: { type: 'ref', required: true },
    request: { type: 'ref' },
  },

  exits: {
    notFound: {},
  },

  async fn({ project, id, actorUser, request }) {
    let cardType = await CardType.qm.getOneById(id, { projectId: project.id });

    if (cardType) {
      return cardType;
    }

    const baseCardType = await BaseCardType.qm.getOneById(id);

    if (!baseCardType) {
      throw 'notFound';
    }

    cardType = await CardType.qm.getOneByProjectIdAndBaseCardTypeId(
      project.id,
      baseCardType.id,
    );

    if (!cardType) {
      cardType = await sails.helpers.cardTypes.createOne.with({
        values: {
          baseCardTypeId: baseCardType.id,
          name: baseCardType.name,
          icon: baseCardType.icon,
          color: baseCardType.color,
          hasStopwatch: baseCardType.hasStopwatch,
          hasTaskList: baseCardType.hasTaskList,
          canLinkCards: baseCardType.canLinkCards,
          project,
        },
        actorUser,
        request,
      });
    }

    return cardType;
  },
};
