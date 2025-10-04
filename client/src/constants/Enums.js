/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const SortOrders = {
  ASC: 'asc',
  DESC: 'desc',
};

export const EditorModes = {
  WYSIWYG: 'wysiwyg',
  MARKUP: 'markup',
};

export const HomeViews = {
  GRID_PROJECTS: 'gridProjects',
  GROUPED_PROJECTS: 'groupedProjects',
};

export const UserRoles = {
  ADMIN: 'admin',
  PROJECT_OWNER: 'projectOwner',
  PERSONAL_PROJECT_OWNER: 'personalProjectOwner',
  BOARD_USER: 'boardUser',
};

export const ProjectOrders = {
  BY_DEFAULT: 'byDefault',
  ALPHABETICALLY: 'alphabetically',
  BY_CREATION_TIME: 'byCreationTime',
};

export const ProjectGroups = {
  MY_OWN: 'myOwn',
  TEAM: 'team',
  SHARED_WITH_ME: 'sharedWithMe',
  OTHERS: 'others',
};

export const ProjectTypes = {
  PRIVATE: 'private',
  SHARED: 'shared',
};

export const ProjectTemplates = {
  NONE: 'none',
  KABAN: 'kaban',
  SCRUM: 'scrum',
};

export const ProjectBackgroundTypes = {
  GRADIENT: 'gradient',
  IMAGE: 'image',
};

export const BoardViews = {
  KANBAN: 'kanban',
  GRID: 'grid',
  LIST: 'list',
};

export const BoardContexts = {
  BOARD: 'board',
  ARCHIVE: 'archive',
  TRASH: 'trash',
};

export const BoardMembershipRoles = {
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

export const ListTypes = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVE: 'archive',
  TRASH: 'trash',
};

export const ListSortFieldNames = {
  NAME: 'name',
  DUE_DATE: 'dueDate',
  CREATED_AT: 'createdAt',
};

export const CardTypes = {
  PROJECT: 'project',
  STORY: 'story',
};

export const AttachmentTypes = {
  FILE: 'file',
  LINK: 'link',
};

export const CardLinkTypes = {
  RELATED: 'relatesTo',
  BLOCKS: 'blocks',
  BLOCKED_BY: 'blockedBy',
  DEPENDS_ON: 'dependsOn',
  DUPLICATES: 'duplicates',
  DUPLICATED_BY: 'duplicatedBy',
};

export const CardLinkCreatableTypes = [
  CardLinkTypes.RELATED,
  CardLinkTypes.BLOCKS,
  CardLinkTypes.DEPENDS_ON,
  CardLinkTypes.DUPLICATES,
  // Newly added inverse types to allow selecting direction explicitly
  CardLinkTypes.BLOCKED_BY,
  CardLinkTypes.DUPLICATED_BY,
];

export const CardLinkInverseTypeMap = {
  [CardLinkTypes.RELATED]: CardLinkTypes.RELATED,
  [CardLinkTypes.BLOCKS]: CardLinkTypes.BLOCKED_BY,
  [CardLinkTypes.DUPLICATES]: CardLinkTypes.DUPLICATED_BY,
  [CardLinkTypes.DEPENDS_ON]: CardLinkTypes.BLOCKS,
  [CardLinkTypes.BLOCKED_BY]: CardLinkTypes.BLOCKS,
  [CardLinkTypes.DUPLICATED_BY]: CardLinkTypes.DUPLICATES,
};

export const CardLinkTypeTranslationKeys = {
  [CardLinkTypes.RELATED]: 'common.cardLinkTypes.related',
  [CardLinkTypes.BLOCKS]: 'common.cardLinkTypes.blocks',
  [CardLinkTypes.BLOCKED_BY]: 'common.cardLinkTypes.blockedBy',
  [CardLinkTypes.DEPENDS_ON]: 'common.cardLinkTypes.dependsOn',
  [CardLinkTypes.DUPLICATES]: 'common.cardLinkTypes.duplicates',
  [CardLinkTypes.DUPLICATED_BY]: 'common.cardLinkTypes.duplicatedBy',
};

// More explicit labels for creation context (directional phrasing)
export const CardLinkTypeCreationTranslationKeys = {
  [CardLinkTypes.RELATED]: 'common.cardLinkCreateOptions.related',
  [CardLinkTypes.BLOCKS]: 'common.cardLinkCreateOptions.blocks',
  [CardLinkTypes.BLOCKED_BY]: 'common.cardLinkCreateOptions.blockedBy',
  [CardLinkTypes.DEPENDS_ON]: 'common.cardLinkCreateOptions.dependsOn',
  [CardLinkTypes.DUPLICATES]: 'common.cardLinkCreateOptions.duplicates',
  [CardLinkTypes.DUPLICATED_BY]: 'common.cardLinkCreateOptions.duplicatedBy',
};

export const ActivityTypes = {
  CREATE_CARD: 'createCard',
  MOVE_CARD: 'moveCard',
  ADD_MEMBER_TO_CARD: 'addMemberToCard',
  REMOVE_MEMBER_FROM_CARD: 'removeMemberFromCard',
  ADD_CARD_LINK_TO_CARD: 'addCardLinkToCard',
  REMOVE_CARD_LINK_FROM_CARD: 'removeCardLinkFromCard',
  COMPLETE_TASK: 'completeTask',
  UNCOMPLETE_TASK: 'uncompleteTask',
};

export const NotificationTypes = {
  MOVE_CARD: 'moveCard',
  COMMENT_CARD: 'commentCard',
  ADD_MEMBER_TO_CARD: 'addMemberToCard',
  MENTION_IN_COMMENT: 'mentionInComment',
};

export const NotificationServiceFormats = {
  TEXT: 'text',
  MARKDOWN: 'markdown',
  HTML: 'html',
};
