/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';

import entryActions from '../../../entry-actions';
import { useClosableModal } from '../../../hooks';

import styles from './SprintStatisticsModal.module.scss';

const SprintStatisticsModal = React.memo(() => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleClose = useCallback(() => {
    dispatch(entryActions.closeModal());
  }, [dispatch]);

  const [ClosableModal] = useClosableModal();

  return (
    <ClosableModal closeIcon centered={false} className={styles.wrapper} onClose={handleClose}>
      <ClosableModal.Header>
        {t('common.sprintStatistics', { context: 'title' })}
      </ClosableModal.Header>
      <ClosableModal.Content />
      <ClosableModal.Actions>
        <Button onClick={handleClose} content={t('action.close')} />
      </ClosableModal.Actions>
    </ClosableModal>
  );
});

export default SprintStatisticsModal;
