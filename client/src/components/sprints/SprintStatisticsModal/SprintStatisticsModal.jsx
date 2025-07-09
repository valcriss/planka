/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';

import api from '../../../api';
import selectors from '../../../selectors';

import entryActions from '../../../entry-actions';
import { useClosableModal } from '../../../hooks';

import styles from './SprintStatisticsModal.module.scss';

const SprintStatisticsModal = React.memo(() => {
  const { projectId } = useSelector(selectors.selectPath);
  const accessToken = useSelector(selectors.selectAccessToken);
  const project = useSelector(selectors.selectCurrentProject);
  const dispatch = useDispatch();
  const [t, i18n] = useTranslation();

  const [sprints, setSprints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getSprints(projectId, { Authorization: `Bearer ${accessToken}` })
      .then(({ items }) => {
        if (isMounted) {
          setSprints(items);
          if (items.length > 0) {
            setSelectedId(items[0].id);
          }
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, accessToken]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    api
      .getSprint(selectedId, { Authorization: `Bearer ${accessToken}` })
      .then(({ item, included }) => {
        if (isMounted) {
          setDetail({ sprint: item, cards: included.cards || [] });
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId, accessToken]);

  const handleClose = useCallback(() => {
    dispatch(entryActions.closeModal());
  }, [dispatch]);

  const [ClosableModal] = useClosableModal();

  const formatDate = useCallback((iso) => new Date(iso).toLocaleDateString(i18n.language), [i18n.language]);

  const totalPoints = useMemo(
    () =>
      detail && project.useStoryPoints
        ? detail.cards.reduce((sum, c) => sum + c.storyPoints, 0)
        : 0,
    [detail, project.useStoryPoints],
  );

  const burndownData = useMemo(() => {
    if (!detail || !project.useStoryPoints) {
      return [];
    }

    const start = new Date(detail.sprint.startDate);
    const end = new Date(detail.sprint.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const sorted = detail.cards
      .filter((c) => c.closedAt)
      .sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt));

    let remaining = totalPoints;
    let index = 0;
    const result = [];
    for (let i = 0; i <= days; i += 1) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      while (index < sorted.length && new Date(sorted[index].closedAt) <= date) {
        remaining -= sorted[index].storyPoints;
        index += 1;
      }
      result.push({ date, remaining: Math.max(remaining, 0) });
    }
    return result;
  }, [detail, project.useStoryPoints, totalPoints]);

  const chart = useMemo(() => {
    if (burndownData.length === 0 || totalPoints === 0) {
      return null;
    }

    const width = 400;
    const height = 200;
    const stepX = width / (burndownData.length - 1);
    const points = burndownData
      .map((p, i) => {
        const x = i * stepX;
        const y = height - (p.remaining / totalPoints) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return { width, height, points };
  }, [burndownData, totalPoints]);

  return (
    <ClosableModal
      closeIcon
      centered={false}
      size="fullscreen"
      className={styles.wrapper}
      onClose={handleClose}
    >
      <ClosableModal.Header>
        {t('common.sprintStatistics_title')}
      </ClosableModal.Header>
      <ClosableModal.Content>
        <div className={styles.content}>
          <div className={styles.sidebar}>
            {sprints.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                className={
                  s.id === selectedId ? styles.activeItem : styles.item
                }
                onClick={() => setSelectedId(s.id)}
                onKeyPress={() => setSelectedId(s.id)}
              >
                {`Sprint ${s.number}`}
              </div>
            ))}
          </div>
          <div className={styles.details}>
            {detail && (
              <>
                <div className={styles.field}>{`Sprint ${detail.sprint.number}`}</div>
                <div className={styles.field}>{`${t('common.startDate')}: ${formatDate(detail.sprint.startDate)}`}</div>
                <div className={styles.field}>{`${t('common.endDate')}: ${formatDate(detail.sprint.endDate)}`}</div>
                {project.useStoryPoints && (
                  <>
                    <div className={styles.field}>{`${t('common.totalSprintPoints')}: ${totalPoints}`}</div>
                    {chart && (
                      <svg
                        className={styles.chart}
                        width={chart.width}
                        height={chart.height}
                      >
                        <polyline
                          points={chart.points}
                          fill="none"
                          stroke="orange"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </ClosableModal.Content>
      <ClosableModal.Actions>
        <Button onClick={handleClose} content={t('action.close')} />
      </ClosableModal.Actions>
    </ClosableModal>
  );
});

export default SprintStatisticsModal;
