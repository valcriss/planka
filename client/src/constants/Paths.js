/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const ROOT = '/';
const LOGIN = '/login';
const OIDC_CALLBACK = '/oidc-callback';
const PROJECTS = '/projects/:code';
const PROJECT_EPICS = '/boards/:code/project-epics';
const BOARDS = '/boards/:code/:slug';
const CARDS = '/cards/:projectCode/:number';

export default {
  ROOT,
  LOGIN,
  OIDC_CALLBACK,
  PROJECTS,
  PROJECT_EPICS,
  BOARDS,
  CARDS,
};
