/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Radio, Segment } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import SelectCardType from '../../../cards/SelectCardType';

import styles from './DefaultCardType.module.scss';
import {
  makeSelectCardTypeIdsByProjectId,
  makeSelectCardTypeById,
  makeSelectBaseCardTypeById,
  selectBaseCardTypeIds,
} from '../../../../selectors/card-types';

const DefaultCardType = React.memo(() => {
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);
  const selectCardTypeIdsByProjectId = useMemo(() => makeSelectCardTypeIdsByProjectId(), []);
  const selectCardTypeById = useMemo(() => makeSelectCardTypeById(), []);
  const selectBaseCardTypeById = useMemo(() => makeSelectBaseCardTypeById(), []);

  const boardId = useSelector((state) => selectors.selectCurrentModal(state).params.id);
  const board = useSelector((state) => selectBoardById(state, boardId));
  const cardTypeIds = useSelector((state) => selectCardTypeIdsByProjectId(state, board.projectId));
  const baseCardTypeIds = useSelector(selectBaseCardTypeIds);
  const cardTypes = useSelector((state) =>
    (cardTypeIds || []).map((id) => selectCardTypeById(state, id)),
  );
  const baseCardTypes = useSelector((state) =>
    (baseCardTypeIds || []).map((id) => selectBaseCardTypeById(state, id)),
  );
  const allTypes = useMemo(() => [...baseCardTypes, ...cardTypes], [baseCardTypes, cardTypes]);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  useEffect(() => {
    dispatch(entryActions.fetchBaseCardTypes());
    if (board.projectId) {
      dispatch(entryActions.fetchCardTypes(board.projectId));
    }
  }, [dispatch, board.projectId]);

  useEffect(() => {
    if (!board.defaultCardTypeId && allTypes.length > 0) {
      dispatch(
        entryActions.updateBoard(boardId, {
          defaultCardTypeId: allTypes[0].id,
        }),
      );
    }
  }, [board.defaultCardTypeId, allTypes, boardId, dispatch]);

  const handleSelect = useCallback(
    (defaultCardTypeId) => {
      dispatch(
        entryActions.updateBoard(boardId, {
          defaultCardTypeId,
        }),
      );
    },
    [boardId, dispatch],
  );

  const handleToggleChange = useCallback(
    (_, { name: fieldName, checked }) => {
      dispatch(
        entryActions.updateBoard(boardId, {
          [fieldName]: checked,
        }),
      );
    },
    [boardId, dispatch],
  );

  return (
    <>
      <SelectCardType
        projectId={board.projectId}
        value={board.defaultCardTypeId}
        onSelect={handleSelect}
      />
      <Segment basic className={styles.settings}>
        <Radio
          toggle
          name="limitCardTypesToDefaultOne"
          checked={board.limitCardTypesToDefaultOne}
          label={t('common.limitCardTypesToDefaultOne')}
          className={styles.radio}
          onChange={handleToggleChange}
        />
      </Segment>
    </>
  );
});

export default DefaultCardType;
