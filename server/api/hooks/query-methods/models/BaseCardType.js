const defaultFind = (criteria) => BaseCardType.find(criteria).sort('id');

const createOne = (values) => BaseCardType.create({ ...values }).fetch();

const getByIds = (ids) => defaultFind(ids);

const getOneById = (id) => BaseCardType.findOne(id);

const updateOne = (criteria, values) => BaseCardType.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => BaseCardType.destroy(criteria).fetch();

const deleteOne = (criteria) => BaseCardType.destroyOne(criteria);

module.exports = {
  createOne,
  getByIds,
  getOneById,
  updateOne,
  deleteOne,
  delete: delete_,
};
