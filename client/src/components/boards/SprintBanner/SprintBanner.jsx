/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon, Button } from 'semantic-ui-react';

import api from '../../../api';
import selectors from '../../../selectors';
import { ListTypes } from '../../../constants/Enums';
import entryActions from '../../../entry-actions';

import styles from './SprintBanner.module.scss';

const SprintBanner = React.memo(() => {
  const { projectId } = useSelector(selectors.selectPath);
  const board = useSelector(selectors.selectCurrentBoard);
  const project = useSelector(selectors.selectCurrentProject);
  const accessToken = useSelector(selectors.selectAccessToken);
  const dispatch = useDispatch();
  const [sprint, setSprint] = useState(null);
  const [t, i18n] = useTranslation();

  useEffect(() => {
    let isMounted = true;

    api
      .getCurrentSprint(projectId, {
        Authorization: `Bearer ${accessToken}`,
      })
      .then(({ item }) => {
        if (isMounted) {
          setSprint(item);
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, accessToken]);

  const selectFiniteListIdsByBoardId = useMemo(
    () => selectors.makeSelectFiniteListIdsByBoardId(),
    [],
  );
  const listIds = useSelector((state) => selectFiniteListIdsByBoardId(state, board.id));

  const selectListIdByTypeByBoardId = useMemo(
    () => selectors.makeSelectListIdByTypeByBoardId(),
    [],
  );
  const doneListId = useSelector((state) =>
    selectListIdByTypeByBoardId(state, board.id, ListTypes.CLOSED),
  );

  const selectStoryPointsTotalByListId = useMemo(
    () => selectors.makeSelectStoryPointsTotalByListId(),
    [],
  );

  const sprintPoints = useSelector((state) =>
    listIds.reduce((total, id) => total + selectStoryPointsTotalByListId(state, id), 0),
  );
  const donePoints = useSelector((state) =>
    doneListId ? selectStoryPointsTotalByListId(state, doneListId) : 0,
  );
  const remainingPoints = sprintPoints - donePoints;

  const handleStatisticsClick = useCallback(() => {
    dispatch(entryActions.openSprintStatisticsModal());
  }, [dispatch]);

  if (!sprint) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.item}>{t('common.noActiveSprint')}</div>
      </div>
    );
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString(i18n.language);

  return (
    <div className={styles.wrapper}>
      <div className={styles.item}>{`${t('common.sprint')}: ${sprint.number}`}</div>
      <div
        className={styles.item}
      >{`${t('common.startDate')}: ${formatDate(sprint.startDate)}`}</div>
      <div className={styles.item}>{`${t('common.endDate')}: ${formatDate(sprint.endDate)}`}</div>
      {project.useStoryPoints && (
        <>
          <div className={styles.item}>{`${t('common.sprintPoints')}: ${sprintPoints}`}</div>
          <div className={styles.item}>{`${t('common.donePoints')}: ${donePoints}`}</div>
          <div className={styles.item}>{`${t('common.remainingPoints')}: ${remainingPoints}`}</div>
        </>
      )}
      <Button
        basic
        icon
        title={t('common.sprintStatistics_title')}
        className={styles.iconButton}
        onClick={handleStatisticsClick}
      >
        <Icon name="chart bar" />
      </Button>
    </div>
  );
});

export default SprintBanner;
