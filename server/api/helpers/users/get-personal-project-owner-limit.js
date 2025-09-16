/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: true,

  fn() {
    if (!_.isNil(sails.config.custom.personalProjectOwnerLimit)) {
      return sails.config.custom.personalProjectOwnerLimit;
    }

    if (!_.isNil(sails.config.custom.personnalProjectOwnerLimit)) {
      return sails.config.custom.personnalProjectOwnerLimit;
    }

    return null;
  },
};
