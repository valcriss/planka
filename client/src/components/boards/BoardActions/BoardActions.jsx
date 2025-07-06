/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import Filters from './Filters';
import RightSide from './RightSide';
import BoardMemberships from '../../board-memberships/BoardMemberships';

import styles from './BoardActions.module.scss';

const BoardActions = React.memo(() => {
  const { ownerProjectManagerId } = useSelector(selectors.selectCurrentProject);

  const withMemberships = useSelector((state) => {
    const boardMemberships = selectors.selectMembershipsForCurrentBoard(state);

    if (boardMemberships.length > 0) {
      return true;
    }

    return selectors.selectIsCurrentUserManagerForCurrentProject(state);
  });

  const showMemberships = withMemberships && !ownerProjectManagerId;

  return (
    <div className={styles.wrapper}>
      <div className={styles.actions}>
        {showMemberships && (
          <div className={styles.action}>
            <BoardMemberships />
          </div>
        )}
        <div className={styles.action}>
          <Filters />
        </div>
        <div className={classNames(styles.action, styles.actionRightSide)}>
          <RightSide />
        </div>
      </div>
    </div>
  );
});

export default BoardActions;
