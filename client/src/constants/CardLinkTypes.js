/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const CardLinkTypes = {
  RELATES_TO: 'relatesTo',
  BLOCKS: 'blocks',
  BLOCKED_BY: 'blockedBy',
  DUPLICATES: 'duplicates',
  DUPLICATED_BY: 'duplicatedBy',
};

export const CardLinkCreatableTypes = [
  CardLinkTypes.RELATES_TO,
  CardLinkTypes.BLOCKS,
  CardLinkTypes.DUPLICATES,
];

export const CardLinkInverseTypeMap = {
  [CardLinkTypes.RELATES_TO]: CardLinkTypes.RELATES_TO,
  [CardLinkTypes.BLOCKS]: CardLinkTypes.BLOCKED_BY,
  [CardLinkTypes.DUPLICATES]: CardLinkTypes.DUPLICATED_BY,
  [CardLinkTypes.BLOCKED_BY]: CardLinkTypes.BLOCKS,
  [CardLinkTypes.DUPLICATED_BY]: CardLinkTypes.DUPLICATES,
};

export const CardLinkTypeTranslationKeys = {
  [CardLinkTypes.RELATES_TO]: 'common.cardLinkTypes.relatesTo',
  [CardLinkTypes.BLOCKS]: 'common.cardLinkTypes.blocks',
  [CardLinkTypes.BLOCKED_BY]: 'common.cardLinkTypes.blockedBy',
  [CardLinkTypes.DUPLICATES]: 'common.cardLinkTypes.duplicates',
  [CardLinkTypes.DUPLICATED_BY]: 'common.cardLinkTypes.duplicatedBy',
};

export default {
  CardLinkTypes,
  CardLinkCreatableTypes,
  CardLinkInverseTypeMap,
  CardLinkTypeTranslationKeys,
};
