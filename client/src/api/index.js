/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import http from './http';
import socket from './socket';
import config from './config';
import accessTokens from './access-tokens';
import webhooks from './webhooks';
import users from './users';
import projects from './projects';
import projectManagers from './project-managers';
import backgroundImages from './background-images';
import baseCustomFieldGroups from './base-custom-field-groups';
import baseCardTypes from './base-card-types';
import cardTypes from './card-types';
import boards from './boards';
import boardMemberships from './board-memberships';
import labels from './labels';
import epics from './epics';
import lists from './lists';
import cards from './cards';
import cardMemberships from './card-memberships';
import cardLabels from './card-labels';
import cardLinks from './card-links';
import taskLists from './task-lists';
import tasks from './tasks';
import attachments from './attachments';
import customFieldGroups from './custom-field-groups';
import customFields from './custom-fields';
import customFieldValues from './custom-field-values';
import comments from './comments';
import activities from './activities';
import notifications from './notifications';
import notificationServices from './notification-services';
import repositories from './repositories';
import sprints from './sprints';
import system from './system';

export { http, socket };

export default {
  ...config,
  ...accessTokens,
  ...webhooks,
  ...users,
  ...projects,
  ...projectManagers,
  ...backgroundImages,
  ...baseCustomFieldGroups,
  ...baseCardTypes,
  ...cardTypes,
  ...boards,
  ...boardMemberships,
  ...labels,
  ...lists,
  ...cards,
  ...cardMemberships,
  ...cardLabels,
  ...cardLinks,
  ...taskLists,
  ...tasks,
  ...attachments,
  ...epics,
  ...customFieldGroups,
  ...customFields,
  ...customFieldValues,
  ...sprints,
  ...comments,
  ...activities,
  ...notifications,
  ...notificationServices,
  ...repositories,
  ...system,
};
