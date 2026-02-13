module.exports = {
  tableName: 'planning_poker_session',

  attributes: {
    projectId: {
      type: 'string',
      required: true,
      unique: true,
      columnName: 'project_id',
    },
    data: {
      type: 'json',
      required: true,
    },
  },

  beforeCreate(valuesToSet, proceed) {
    const timestamp = new Date().toISOString();

    if (!valuesToSet.createdAt) {
      valuesToSet.createdAt = timestamp; // eslint-disable-line no-param-reassign
    }

    if (!valuesToSet.updatedAt) {
      valuesToSet.updatedAt = timestamp; // eslint-disable-line no-param-reassign
    }

    proceed();
  },
};
