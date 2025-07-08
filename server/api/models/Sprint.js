module.exports = {
  attributes: {
    number: {
      type: 'number',
      required: true,
    },
    startDate: {
      type: 'ref',
      columnName: 'start_date',
      required: true,
    },
    endDate: {
      type: 'ref',
      columnName: 'end_date',
      required: true,
    },
    closeDate: {
      type: 'ref',
      columnName: 'close_date',
    },
    projectId: {
      model: 'Project',
      required: true,
      columnName: 'project_id',
    },
    cards: {
      collection: 'Card',
      via: 'sprintId',
      through: 'SprintCard',
    },
  },
  tableName: 'sprint',
};
