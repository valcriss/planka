module.exports = {
  attributes: {
    projectId: {
      model: 'Project',
      required: true,
      columnName: 'project_id',
    },
    baseCardTypeId: {
      model: 'BaseCardType',
      columnName: 'base_card_type_id',
      allowNull: true,
    },
    name: {
      type: 'string',
      required: true,
    },
    icon: {
      type: 'string',
      allowNull: true,
    },
    color: {
      type: 'string',
      allowNull: true,
    },
    hasStopwatch: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'has_stopwatch',
    },
    hasTaskList: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'has_tasklist',
    },
    canLinkCards: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'can_link_cards',
    },
  },
  tableName: 'card_type',
};
