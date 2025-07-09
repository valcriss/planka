/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import ModalTypes from '../../../constants/ModalTypes';
import { BoardContexts, BoardViews } from '../../../constants/Enums';
import KanbanContent from './KanbanContent';
import FiniteContent from './FiniteContent';
import EndlessContent from './EndlessContent';
import CardModal from '../../cards/CardModal';
import BoardActivitiesModal from '../../activities/BoardActivitiesModal';
import SprintStatisticsModal from '../../sprints/SprintStatisticsModal';
import SprintBanner from '../SprintBanner';
import styles from './Board.module.scss';

const Board = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);
  const modal = useSelector(selectors.selectCurrentModal);
  const isCardModalOpened = useSelector((state) => !!selectors.selectPath(state).cardId);

  const project = useSelector(selectors.selectCurrentProject);

  let Content;
  if (board.view === BoardViews.KANBAN) {
    Content = KanbanContent;
  } else {
    switch (board.context) {
      case BoardContexts.BOARD:
        Content = FiniteContent;

        break;
      case BoardContexts.ARCHIVE:
      case BoardContexts.TRASH:
        Content = EndlessContent;

        break;
      default:
    }
  }

  let modalNode = null;
  if (isCardModalOpened) {
    modalNode = <CardModal />;
  } else if (modal) {
    switch (modal.type) {
      case ModalTypes.BOARD_ACTIVITIES:
        modalNode = <BoardActivitiesModal />;

        break;
      case ModalTypes.SPRINT_STATISTICS:
        modalNode = <SprintStatisticsModal />;

        break;
      default:
    }
  }

  return (
    <div className={styles.wrapper}>
      {project && project.useScrum && board.name === 'Sprint' && <SprintBanner />}
      <Content />
      {modalNode}
    </div>
  );
});

export default Board;
