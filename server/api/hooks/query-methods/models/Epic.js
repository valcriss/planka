const defaultFind = (criteria, { sort = ['position', 'id'] } = {}) =>
  Epic.find(criteria).sort(sort);

const createOne = (values) => Epic.create({ ...values }).fetch();

const getByProjectId = (projectId, { exceptIdOrIds, sort = ['position', 'id'] } = {}) => {
  const criteria = { projectId };
  if (exceptIdOrIds) {
    criteria.id = { '!=': exceptIdOrIds };
  }
  return defaultFind(criteria, { sort });
};

const getOneById = (id, { projectId } = {}) => {
  const criteria = { id };
  if (projectId) {
    criteria.projectId = projectId;
  }
  return Epic.findOne(criteria);
};

const updateOne = (criteria, values) => Epic.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => Epic.destroyOne(criteria);

module.exports = {
  createOne,
  getByProjectId,
  getOneById,
  updateOne,
  deleteOne,
};
