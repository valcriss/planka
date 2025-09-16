/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const canUserCreateProjects = sails.helpers.users.isAdminOrProjectOwner;

module.exports = async function canCreateProjects(req, res, proceed) {
  if (!canUserCreateProjects(req.currentUser)) {
    return res.notFound(); // Forbidden
  }

  return proceed();
};
