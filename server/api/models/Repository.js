/*!
 * Repository.js
 */

module.exports = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    url: {
      type: 'string',
      required: true,
    },
    accessToken: {
      type: 'string',
      allowNull: true,
      columnName: 'access_token',
    },
    projectId: {
      model: 'Project',
      required: true,
      columnName: 'project_id',
    },
  },

  tableName: 'repository',
};
