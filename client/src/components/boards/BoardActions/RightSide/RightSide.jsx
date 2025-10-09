/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { usePopup } from '../../../../lib/popup';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { BoardContexts, BoardSwimlaneTypes, BoardViews } from '../../../../constants/Enums';
import { BoardContextIcons, BoardViewIcons } from '../../../../constants/Icons';
import ActionsStep from './ActionsStep';
import SwimlaneTypeStep from './SwimlaneTypeStep';

import styles from './RightSide.module.scss';

const RightSide = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleSelectViewClick = useCallback(
    ({ currentTarget: { value: view } }) => {
      dispatch(entryActions.updateViewInCurrentBoard(view));
    },
    [dispatch],
  );

  const ActionsPopup = usePopup(ActionsStep);
  const SwimlaneTypePopup = usePopup(SwimlaneTypeStep);

  const views = [BoardViews.GRID, BoardViews.LIST];
  if (board.context === BoardContexts.BOARD) {
    views.unshift(BoardViews.KANBAN);
    views.push(BoardViews.CALENDAR);
  }

  const swimlaneType = board?.swimlaneType ?? BoardSwimlaneTypes.NONE;
  const swimlaneTypeLabel = useMemo(
    () => t(`common.boardSwimlaneTypes.${swimlaneType}`),
    [swimlaneType, t],
  );

  return (
    <>
      <div className={styles.action}>
        <div className={styles.buttonGroup}>
          {views.map((view) => (
            <button
              key={view}
              type="button"
              value={view}
              disabled={view === board.view}
              className={styles.button}
              onClick={handleSelectViewClick}
            >
              <Icon fitted name={BoardViewIcons[view]} />
            </button>
          ))}
        </div>
      </div>
      <div className={styles.action}>
        <SwimlaneTypePopup>
          <button type="button" className={styles.button}>
            {t('common.swimlaneType')}: {swimlaneTypeLabel}
          </button>
        </SwimlaneTypePopup>
      </div>
      <div className={styles.action}>
        <ActionsPopup>
          <button type="button" className={styles.button}>
            <Icon fitted name={BoardContextIcons[board.context]} />
          </button>
        </ActionsPopup>
      </div>
    </>
  );
});

export default RightSide;
