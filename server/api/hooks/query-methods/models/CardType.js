const defaultFind = (criteria) => CardType.find(criteria).sort('id');

const createOne = (values) => CardType.create({ ...values }).fetch();

const getByIds = (ids) => defaultFind(ids);

const getByProjectId = (projectId) =>
  defaultFind({
    projectId,
  });

const getByProjectIds = (projectIds) =>
  defaultFind({
    projectId: projectIds,
  });

const getOneById = (id, { projectId } = {}) => {
  const criteria = {
    id,
  };

  if (projectId) {
    criteria.projectId = projectId;
  }

  return CardType.findOne(criteria);
};

const getOneByProjectIdAndBaseCardTypeId = (projectId, baseCardTypeId) =>
  CardType.findOne({ projectId, baseCardTypeId });

const updateOne = (criteria, values) => CardType.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => CardType.destroy(criteria).fetch();

const deleteOne = (criteria) => CardType.destroyOne(criteria);

module.exports = {
  createOne,
  getByIds,
  getByProjectId,
  getByProjectIds,
  getOneById,
  getOneByProjectIdAndBaseCardTypeId,
  updateOne,
  deleteOne,
  delete: delete_,
};
