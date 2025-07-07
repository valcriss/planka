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

  // eslint-disable-next-line no-unused-vars
  async fn({ project, id, actorUser, request }) {
    const cardType = await CardType.qm.getOneById(id, { projectId: project.id });

    if (cardType) {
      return cardType;
    }

    const baseCardType = await BaseCardType.qm.getOneById(id);

    if (!baseCardType) {
      throw 'notFound';
    }

    const projectCardType = await CardType.qm.getOneByProjectIdAndBaseCardTypeId(
      project.id,
      baseCardType.id,
    );

    return projectCardType || baseCardType;
  },
};
