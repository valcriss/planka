/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

let projectCreationRoles;

module.exports = {
  sync: true,

  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    if (!projectCreationRoles) {
      projectCreationRoles = new Set([
        User.Roles.ADMIN,
        User.Roles.PROJECT_OWNER,
        User.Roles.PERSONAL_PROJECT_OWNER,
      ]);
    }

    return projectCreationRoles.has(inputs.record.role);
  },
};
