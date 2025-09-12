/* Query methods for Repository */

const defaultFind = (criteria) => Repository.find(criteria).sort('id');

const createOne = (values) => Repository.create({ ...values }).fetch();

const getByProjectId = (projectId) => defaultFind({ projectId });

const getOneById = (id, { projectId } = {}) => {
  const criteria = { id };
  if (projectId) {
    criteria.projectId = projectId;
  }
  return Repository.findOne(criteria);
};

const updateOne = (criteria, values) => Repository.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => Repository.destroyOne(criteria);

module.exports = {
  createOne,
  getByProjectId,
  getOneById,
  updateOne,
  deleteOne,
};
