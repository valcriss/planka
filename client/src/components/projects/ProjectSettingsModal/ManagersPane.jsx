/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Header, Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { usePopupInClosableContext } from '../../../hooks';
import ConfirmationStep from '../../common/ConfirmationStep';
import ProjectManagers from '../../project-managers/ProjectManagers';

import styles from './ManagersPane.module.scss';

const ManagersPane = React.memo(() => {
  // TODO: rename?
  const projectManagers = useSelector(selectors.selectManagersForCurrentProject);
  const managerUserIds = useSelector(selectors.selectManagerUserIdsForCurrentProject);
  const memberUserIds = useSelector(selectors.selectMemberUserIdsForCurrentProject);
  const currentUserId = useSelector(selectors.selectCurrentUserId);

  const isShared = useSelector(
    (state) => !selectors.selectCurrentProject(state).ownerProjectManagerId,
  );

  const canMakePrivate =
    isShared &&
    projectManagers.length === 1 &&
    managerUserIds.length === 1 &&
    memberUserIds.length === 1 &&
    managerUserIds[0] === currentUserId &&
    memberUserIds[0] === currentUserId;

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleMakeSharedConfirm = useCallback(() => {
    dispatch(
      entryActions.updateCurrentProject({
        ownerProjectManagerId: null,
      }),
    );
  }, [dispatch]);

  const handleMakePrivateConfirm = useCallback(() => {
    if (projectManagers.length > 0) {
      dispatch(
        entryActions.updateCurrentProject({
          ownerProjectManagerId: projectManagers[0].id,
        }),
      );
    }
  }, [dispatch, projectManagers]);

  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <ProjectManagers />
      {!isShared && (
        <>
          <Divider horizontal section>
            <Header as="h4">
              {t('common.dangerZone', {
                context: 'title',
              })}
            </Header>
          </Divider>
          <div className={styles.action}>
            <ConfirmationPopup
              title="common.makeProjectShared"
              content="common.areYouSureYouWantToMakeThisProjectShared"
              buttonType="positive"
              buttonContent="action.makeProjectShared"
              onConfirm={handleMakeSharedConfirm}
            >
              <Button className={styles.actionButton}>
                {t('action.makeProjectShared', {
                  context: 'title',
                })}
              </Button>
            </ConfirmationPopup>
          </div>
        </>
      )}
      {canMakePrivate && (
        <>
          <Divider horizontal section>
            <Header as="h4">
              {t('common.dangerZone', {
                context: 'title',
              })}
            </Header>
          </Divider>
          <div className={styles.action}>
            <ConfirmationPopup
              title="common.makeProjectPrivate"
              content="common.areYouSureYouWantToMakeThisProjectPrivate"
              buttonType="negative"
              buttonContent="action.makeProjectPrivate"
              onConfirm={handleMakePrivateConfirm}
            >
              <Button className={styles.actionButton}>
                {t('action.makeProjectPrivate', {
                  context: 'title',
                })}
              </Button>
            </ConfirmationPopup>
          </div>
        </>
      )}
    </Tab.Pane>
  );
});

export default ManagersPane;
