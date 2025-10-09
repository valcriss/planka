/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Dropdown, Radio, Segment } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { BoardSwimlaneTypes } from '../../../../constants/Enums';

import styles from './Others.module.scss';

const Others = React.memo(() => {
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);

  const boardId = useSelector((state) => selectors.selectCurrentModal(state).params.id);
  const board = useSelector((state) => selectBoardById(state, boardId));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const swimlaneType = board?.swimlaneType ?? BoardSwimlaneTypes.NONE;

  const swimlaneOptions = useMemo(
    () =>
      Object.values(BoardSwimlaneTypes).map((value) => ({
        key: value,
        value,
        text: t(`common.boardSwimlaneTypes.${value}`),
      })),
    [t],
  );

  const handleChange = useCallback(
    (_, { name: fieldName, checked }) => {
      dispatch(
        entryActions.updateBoard(boardId, {
          [fieldName]: checked,
        }),
      );
    },
    [boardId, dispatch],
  );

  const handleSwimlaneTypeChange = useCallback(
    (_, { value }) => {
      dispatch(
        entryActions.updateBoard(boardId, {
          swimlaneType: value,
        }),
      );
    },
    [boardId, dispatch],
  );

  return (
    <Segment basic>
      <div className={styles.field}>
        <div className={styles.text}>{t('common.swimlaneType')}</div>
        <Dropdown
          fluid
          selection
          options={swimlaneOptions}
          value={swimlaneType}
          className={styles.dropdown}
          onChange={handleSwimlaneTypeChange}
        />
      </div>
      <Radio
        toggle
        name="alwaysDisplayCardCreator"
        checked={board.alwaysDisplayCardCreator}
        label={t('common.alwaysDisplayCardCreator')}
        className={styles.radio}
        onChange={handleChange}
      />
    </Segment>
  );
});

export default Others;
