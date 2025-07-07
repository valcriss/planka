/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { isLocalId } from '../utils/local-id';

export const makeSelectCardTypeById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ CardType }, id) => {
      const model = CardType.withId(id);

      if (!model) {
        return model;
      }

      return {
        ...model.ref,
        isPersisted: !isLocalId(model.id),
      };
    },
  );

export const selectCardTypeById = makeSelectCardTypeById();

export const makeSelectCardTypeIdsByProjectId = () =>
  createSelector(
    orm,
    (_, projectId) => projectId,
    ({ CardType }, projectId) => {
      if (!projectId) {
        return projectId;
      }

      return CardType.filter({ projectId })
        .toRefArray()
        .map((cardType) => cardType.id);
    },
  );

export const selectCardTypeIdsByProjectId = makeSelectCardTypeIdsByProjectId();

export const makeSelectBaseCardTypeById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ BaseCardType }, id) => {
      const model = BaseCardType.withId(id);

      if (!model) {
        return model;
      }

      return {
        ...model.ref,
        isPersisted: !isLocalId(model.id),
      };
    },
  );

export const selectBaseCardTypeById = makeSelectBaseCardTypeById();

export const selectBaseCardTypeIds = createSelector(
  orm,
  ({ BaseCardType }) => BaseCardType.all()
    .toRefArray()
    .map((item) => item.id),
);

export default {
  makeSelectCardTypeById,
  selectCardTypeById,
  makeSelectCardTypeIdsByProjectId,
  selectCardTypeIdsByProjectId,
  makeSelectBaseCardTypeById,
  selectBaseCardTypeById,
  selectBaseCardTypeIds,
};
