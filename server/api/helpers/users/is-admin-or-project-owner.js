/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const PROJECT_CREATION_ROLES = new Set([
  User.Roles.ADMIN,
  User.Roles.PROJECT_OWNER,
  User.Roles.PERSONAL_PROJECT_OWNER,
]);

module.exports = {
  sync: true,

  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    return PROJECT_CREATION_ROLES.has(inputs.record.role);
  },
};
