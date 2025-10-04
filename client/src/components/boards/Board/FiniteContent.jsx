/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { BoardViews } from '../../../constants/Enums';
import GridView from './GridView';
import ListView from './ListView';
import CalendarView from './CalendarView';

const FiniteContent = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);
  const cardIds = useSelector(selectors.selectFilteredCardIdsForCurrentBoard);
  const hasAnyFiniteList = useSelector((state) => !!selectors.selectFirstFiniteListId(state));

  const dispatch = useDispatch();

  const handleCardCreate = useCallback(
    (data, autoOpen) => {
      dispatch(entryActions.createCardInFirstFiniteList(data, autoOpen));
    },
    [dispatch],
  );

  let View;
  switch (board.view) {
    case BoardViews.GRID:
      View = GridView;

      break;
    case BoardViews.LIST:
      View = ListView;

      break;
    case BoardViews.CALENDAR:
      View = CalendarView;

      break;
    default:
  }

  return <View cardIds={cardIds} onCardCreate={hasAnyFiniteList ? handleCardCreate : undefined} />;
});

export default FiniteContent;
