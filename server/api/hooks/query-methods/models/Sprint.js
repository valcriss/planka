const defaultFind = (criteria, { sort = 'number' } = {}) =>
  Sprint.find(criteria).sort(sort);

const createOne = (values) => Sprint.create({ ...values }).fetch();

const getByProjectId = (projectId, { sort = 'number' } = {}) =>
  defaultFind({ projectId }, { sort });

const getOneCurrentByProjectId = (projectId) =>
  Sprint.findOne({ projectId, closeDate: null });

const getOneById = (id, { projectId } = {}) => {
  const criteria = { id };
  if (projectId) {
    criteria.projectId = projectId;
  }
  return Sprint.findOne(criteria);
};

const updateOne = (criteria, values) => Sprint.updateOne(criteria).set({ ...values });

const deleteOne = (criteria) => Sprint.destroyOne(criteria);

module.exports = {
  createOne,
  getByProjectId,
  getOneCurrentByProjectId,
  getOneById,
  updateOne,
  deleteOne,
};
