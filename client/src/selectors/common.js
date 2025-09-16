/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const selectIsSocketDisconnected = ({ socket: { isDisconnected } }) => isDisconnected;

export const selectIsInitializing = ({ common: { isInitializing } }) => isInitializing;

export const selectConfig = ({ common: { config } }) => config;

export const selectOidcConfig = (state) => selectConfig(state).oidc;

export const selectActiveUsersLimit = (state) => selectConfig(state).activeUsersLimit;

const hasOwnProperty = (object, property) => Object.prototype.hasOwnProperty.call(object, property);

export const selectPersonalProjectOwnerLimit = (state) => {
  const config = selectConfig(state);

  if (!config) {
    return null;
  }

  if (hasOwnProperty(config, 'personalProjectOwnerLimit')) {
    return config.personalProjectOwnerLimit;
  }

  if (hasOwnProperty(config, 'personnalProjectOwnerLimit')) {
    return config.personnalProjectOwnerLimit;
  }

  return null;
};

export const selectAccessToken = ({ auth: { accessToken } }) => accessToken;

export const selectAuthenticateForm = ({ ui: { authenticateForm } }) => authenticateForm;

export const selectUserCreateForm = ({ ui: { userCreateForm } }) => userCreateForm;

export const selectProjectCreateForm = ({ ui: { projectCreateForm } }) => projectCreateForm;

export default {
  selectIsSocketDisconnected,
  selectIsInitializing,
  selectConfig,
  selectOidcConfig,
  selectActiveUsersLimit,
  selectPersonalProjectOwnerLimit,
  selectAccessToken,
  selectAuthenticateForm,
  selectUserCreateForm,
  selectProjectCreateForm,
};
