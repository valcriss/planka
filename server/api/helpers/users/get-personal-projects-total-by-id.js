/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    id: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const projectManagers = await ProjectManager.qm.getByUserId(inputs.id);

    if (projectManagers.length === 0) {
      return 0;
    }

    const ownerProjectManagerIds = projectManagers.map((projectManager) => projectManager.id);

    return Project.count({
      ownerProjectManagerId: ownerProjectManagerIds,
    });
  },
};
