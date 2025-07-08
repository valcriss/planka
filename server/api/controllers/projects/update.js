/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
  OWNER_PROJECT_MANAGER_NOT_FOUND: {
    ownerProjectManagerNotFound: 'Owner project manager not found',
  },
  BACKGROUND_IMAGE_NOT_FOUND: {
    backgroundImageNotFound: 'Background image not found',
  },
  PROJECT_ALREADY_HAS_OWNER_PROJECT_MANAGER: {
    projectAlreadyHasOwnerProjectManager: 'Project already has owner project manager',
  },
  OWNER_PROJECT_MANAGER_MUST_BE_LAST_MANAGER: {
    ownerProjectManagerMustBeLastManager: 'Owner project manager must be last manager',
  },
  BACKGROUND_IMAGE_MUST_BE_PRESENT: {
    backgroundImageMustBePresent: 'Background image must be present',
  },
  BACKGROUND_GRADIENT_MUST_BE_PRESENT: {
    backgroundGradientMustBePresent: 'Background gradient must be present',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    ownerProjectManagerId: {
      ...idInput,
      allowNull: true,
    },
    backgroundImageId: {
      ...idInput,
      allowNull: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 128,
    },
    description: {
      type: 'string',
      isNotEmptyString: true,
      maxLength: 1024,
      allowNull: true,
    },
    backgroundType: {
      type: 'string',
      isIn: Object.values(Project.BackgroundTypes),
      allowNull: true,
    },
    backgroundGradient: {
      type: 'string',
      isIn: Project.BACKGROUND_GRADIENTS,
      allowNull: true,
    },
    useScrum: {
      type: 'boolean',
    },
    sprintDuration: {
      type: 'number',
      isIn: [1, 2, 3, 4],
    },
    useStoryPoints: {
      type: 'boolean',
    },
    isHidden: {
      type: 'boolean',
    },
    isFavorite: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    projectNotFound: {
      responseType: 'notFound',
    },
    ownerProjectManagerNotFound: {
      responseType: 'notFound',
    },
    backgroundImageNotFound: {
      responseType: 'notFound',
    },
    projectAlreadyHasOwnerProjectManager: {
      responseType: 'conflict',
    },
    ownerProjectManagerMustBeLastManager: {
      responseType: 'unprocessableEntity',
    },
    backgroundImageMustBePresent: {
      responseType: 'unprocessableEntity',
    },
    backgroundGradientMustBePresent: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let project = await Project.qm.getOneById(inputs.id);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const prevUseScrum = project.useScrum;

    const projectManager = await ProjectManager.qm.getOneByProjectIdAndUserId(
      project.id,
      currentUser.id,
    );

    const availableInputKeys = ['id', 'isFavorite'];
    if (project.ownerProjectManagerId) {
      if (projectManager) {
        if (!_.isNil(inputs.ownerProjectManagerId)) {
          throw Errors.NOT_ENOUGH_RIGHTS;
        }

        availableInputKeys.push(
          'ownerProjectManagerId',
          'isHidden',
          'useStoryPoints',
          'useScrum',
          'sprintDuration',
        );
      }
    } else if (currentUser.role === User.Roles.ADMIN) {
      availableInputKeys.push(
        'ownerProjectManagerId',
        'isHidden',
        'useStoryPoints',
        'useScrum',
        'sprintDuration',
      );
    } else if (projectManager) {
      availableInputKeys.push('isHidden', 'useStoryPoints', 'useScrum', 'sprintDuration');
    }

    if (projectManager) {
      availableInputKeys.push(
        'backgroundImageId',
        'name',
        'description',
        'backgroundType',
        'backgroundGradient',
        'useStoryPoints',
        'useScrum',
        'sprintDuration',
      );
    }

    if (_.difference(Object.keys(inputs), availableInputKeys).length > 0) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let nextOwnerProjectManager;
    if (inputs.ownerProjectManagerId) {
      nextOwnerProjectManager = await ProjectManager.qm.getOneById(inputs.ownerProjectManagerId, {
        projectId: project.id,
      });

      if (!nextOwnerProjectManager) {
        throw Errors.OWNER_PROJECT_MANAGER_NOT_FOUND;
      }

      delete inputs.ownerProjectManagerId; // eslint-disable-line no-param-reassign
    }

    let nextBackgroundImage;
    if (inputs.backgroundImageId) {
      nextBackgroundImage = await BackgroundImage.qm.getOneById(inputs.backgroundImageId, {
        projectId: project.id,
      });

      if (!nextBackgroundImage) {
        throw Errors.BACKGROUND_IMAGE_NOT_FOUND;
      }

      delete inputs.backgroundImageId; // eslint-disable-line no-param-reassign
    }

    if (!_.isUndefined(inputs.isFavorite)) {
      if (currentUser.role !== User.Roles.ADMIN || project.ownerProjectManagerId) {
        if (!projectManager) {
          const boardMembershipsTotal =
            await sails.helpers.projects.getBoardMembershipsTotalByIdAndUserId(
              project.id,
              currentUser.id,
            );

          if (boardMembershipsTotal === 0) {
            throw Errors.PROJECT_NOT_FOUND; // Forbidden
          }
        }
      }
    }

    const values = _.pick(inputs, [
      'ownerProjectManagerId',
      'backgroundImageId',
      'name',
      'description',
      'backgroundType',
      'backgroundGradient',
      'isHidden',
      'useStoryPoints',
      'useScrum',
      'sprintDuration',
      'isFavorite',
    ]);

    project = await sails.helpers.projects.updateOne
      .with({
        record: project,
        values: {
          ...values,
          ownerProjectManager: nextOwnerProjectManager,
          backgroundImage: nextBackgroundImage,
        },
        actorUser: currentUser,
        request: this.req,
      })
      .intercept(
        'ownerProjectManagerInValuesMustBeLastManager',
        () => Errors.OWNER_PROJECT_MANAGER_MUST_BE_LAST_MANAGER,
      )
      .intercept(
        'backgroundImageInValuesMustBePresent',
        () => Errors.BACKGROUND_IMAGE_MUST_BE_PRESENT,
      )
      .intercept(
        'backgroundGradientInValuesMustBePresent',
        () => Errors.BACKGROUND_GRADIENT_MUST_BE_PRESENT,
      )
      .intercept(
        'alreadyHasOwnerProjectManager',
        () => Errors.PROJECT_ALREADY_HAS_OWNER_PROJECT_MANAGER,
      );

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    if (!prevUseScrum && project.useScrum) {
      await sails.helpers.projects.deleteScrumBoards.with({
        project,
        actorUser: currentUser,
        request: this.req,
      });

      await sails.helpers.projects.createScrumBoards.with({
        project,
        actorUser: currentUser,
        request: this.req,
      });
    } else if (prevUseScrum && !project.useScrum) {
      await sails.helpers.projects.deleteScrumBoards.with({
        project,
        actorUser: currentUser,
        request: this.req,
      });
    }

    return {
      item: project,
    };
  },
};
