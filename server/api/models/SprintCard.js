module.exports = {
  attributes: {
    sprintId: {
      model: 'Sprint',
      required: true,
      columnName: 'sprint_id',
    },
    cardId: {
      model: 'Card',
      required: true,
      columnName: 'card_id',
    },
    addedAt: {
      type: 'ref',
      columnName: 'added_at',
    },
  },
  tableName: 'sprint_card',
};
