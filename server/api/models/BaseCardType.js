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
    hasDescription: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'has_description',
    },
    hasDueDate: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'has_due_date',
    },
    hasStopwatch: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'has_stopwatch',
    },
    hasMembers: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'has_members',
    },
  },
  tableName: 'base_card_type',
};
