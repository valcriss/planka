/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import { Input, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import api from '../../../api';
import { useForm } from '../../../hooks';
import { ListTypes } from '../../../constants/Enums';

import styles from './StartSprintStep.module.scss';

const StartSprintStep = React.memo(({ onClose }) => {
  const [t] = useTranslation();

  const project = useSelector(selectors.selectCurrentProject);

  const [data, handleFieldChange] = useForm(() => {
    const start = new Date();
    const startDate = start.toISOString().slice(0, 10);

    const end = new Date(start);
    if (project && project.sprintDuration) {
      end.setDate(end.getDate() + project.sprintDuration * 7);
    }
    const endDate = end.toISOString().slice(0, 10);

    return { startDate, endDate };
  });

  const selectListIdBySlug = useMemo(() => selectors.makeSelectListIdBySlug(), []);
  const readyListId = useSelector((state) => selectListIdBySlug(state, 'ready-for-sprint'));

  const selectFilteredCardIdsByListId = useMemo(
    () => selectors.makeSelectFilteredCardIdsByListId(),
    [],
  );
  const readyCardIds = useSelector((state) =>
    readyListId ? selectFilteredCardIdsByListId(state, readyListId) : [],
  );

  const selectStoryPointsTotalByListId = useMemo(
    () => selectors.makeSelectStoryPointsTotalByListId(),
    [],
  );
  const readyPoints = useSelector((state) =>
    readyListId ? selectStoryPointsTotalByListId(state, readyListId) : 0,
  );

  const projectId = useSelector((state) => selectors.selectPath(state).projectId);
  const sprintBoardId = useSelector((state) => {
    const ids = selectors.selectBoardIdsByProjectId(state, projectId);
    // eslint-disable-next-line no-restricted-syntax
    for (const id of ids) {
      const board = selectors.selectBoardById(state, id);
      if (board && board.name === 'Sprint') {
        return id;
      }
    }
    return null;
  });

  const selectFiniteListIdsByBoardId = useMemo(
    () => selectors.makeSelectFiniteListIdsByBoardId(),
    [],
  );
  const sprintListIds = useSelector((state) =>
    sprintBoardId ? selectFiniteListIdsByBoardId(state, sprintBoardId) : [],
  );

  const selectListIdByTypeByBoardId = useMemo(
    () => selectors.makeSelectListIdByTypeByBoardId(),
    [],
  );
  const doneListId = useSelector((state) =>
    sprintBoardId ? selectListIdByTypeByBoardId(state, sprintBoardId, ListTypes.CLOSED) : null,
  );

  const sprintPoints = useSelector((state) => {
    const sp = selectors.makeSelectStoryPointsTotalByListId();
    return sprintListIds
      .filter((id) => id !== doneListId)
      .reduce((total, listId) => total + sp(state, listId), 0);
  });

  const totalPoints = readyPoints + sprintPoints;

  const isConfirmDisabled =
    !data.startDate || !data.endDate || data.startDate >= data.endDate || readyCardIds.length === 0;

  const handleConfirm = useCallback(() => {
    api.startSprint(projectId).catch(() => {
      /* ignore */
    });
    onClose();
  }, [projectId, onClose]);

  return (
    <>
      <Popup.Header>{t('common.startNewSprint_title')}</Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleConfirm}>
          <div className={styles.fieldBox}>
            <div className={styles.text}>{t('common.startDate')}</div>
            <Input
              type="date"
              name="startDate"
              value={data.startDate}
              className={styles.field}
              onChange={handleFieldChange}
            />
          </div>
          <div className={styles.fieldBox}>
            <div className={styles.text}>{t('common.endDate')}</div>
            <Input
              type="date"
              name="endDate"
              value={data.endDate}
              className={styles.field}
              onChange={handleFieldChange}
            />
          </div>
          {project.useStoryPoints && (
            <div className={styles.box}>
              <div className={styles.text}>{t('common.totalSprintPoints')}</div>
              <table className={styles.table}>
                <tbody>
                  <tr>
                    <td className={styles.subInfo}>{t('common.fromPreviousSprint')}</td>
                    <td className={styles.value}>{sprintPoints}</td>
                  </tr>
                  <tr>
                    <td className={styles.subInfo}>{t('common.newSprintPoints')}</td>
                    <td className={styles.value}>{readyPoints}</td>
                  </tr>
                  <tr className={styles.rowSeparator}>
                    <td className={styles.subInfo}>{t('common.total')}</td>
                    <td className={styles.value}>{totalPoints}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div className={styles.boxYellow}>
            <div className={styles.text}>{t('common.startingSprintWill')}</div>
            <div className={styles.subInfo}>{t('common.archiveFinishedCardsOnSprintBoard')}</div>
            <div className={styles.subInfo}>{t('common.moveReadyForSprintCardsOnSprintBoard')}</div>
          </div>
          <hr className={styles.separator} />
          <Button
            positive
            disabled={isConfirmDisabled}
            content={t('action.startTheSprint')}
            className={styles.button}
          />
          <Button type="button" content={t('action.cancel')} onClick={onClose} />
        </Form>
      </Popup.Content>
    </>
  );
});

StartSprintStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default StartSprintStep;
