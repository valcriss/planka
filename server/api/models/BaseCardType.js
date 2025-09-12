module.exports = {
  attributes: {
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
  tableName: 'base_card_type',
};
