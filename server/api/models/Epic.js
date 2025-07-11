module.exports = {
  attributes: {
    position: { type: 'number', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string', allowNull: true },
    color: { type: 'string', allowNull: true },
    startDate: { type: 'string', columnName: 'start_date', allowNull: true },
    endDate: { type: 'string', columnName: 'end_date', allowNull: true },
    projectId: { model: 'Project', required: true, columnName: 'project_id' },
  },
  tableName: 'epic',
};
