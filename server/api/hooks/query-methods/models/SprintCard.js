const defaultFind = (criteria) => SprintCard.find(criteria).sort('id');

const create = (arrayOfValues) => SprintCard.createEach(arrayOfValues).fetch();

const createOne = (values) => SprintCard.create({ ...values }).fetch();

const getBySprintId = (sprintId) => defaultFind({ sprintId });

const getByCardId = (cardId) => defaultFind({ cardId });

const deleteByCardId = (cardId) => SprintCard.destroy({ cardId }).fetch();

const deleteOne = (criteria) => SprintCard.destroyOne(criteria);

module.exports = {
  create,
  createOne,
  getBySprintId,
  getByCardId,
  deleteByCardId,
  deleteOne,
};
