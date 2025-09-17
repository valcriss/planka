/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Header, Radio, Tab, Dropdown } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import EditInformation from './EditInformation';
import ConfirmationStep from '../../../common/ConfirmationStep';
import { FilePicker } from '../../../../lib/custom-ui';

import styles from './GeneralPane.module.scss';

const deriveBoardName = (fileName, fallbackName) => {
  if (!fileName) {
    return fallbackName;
  }

  const lastDotPosition = fileName.lastIndexOf('.');
  const baseName = lastDotPosition > 0 ? fileName.slice(0, lastDotPosition) : fileName;
  const trimmedName = baseName.trim();

  return trimmedName || fallbackName;
};

const GeneralPane = React.memo(() => {
  const project = useSelector(selectors.selectCurrentProject);

  const hasBoards = useSelector(
    (state) => selectors.selectBoardIdsForCurrentProject(state).length > 0,
  );

  const canEdit = useSelector(selectors.selectIsCurrentUserManagerForCurrentProject);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [selectedPlannerFileName, setSelectedPlannerFileName] = useState(null);

  const handleToggleChange = useCallback(
    (_, { name: fieldName, checked }) => {
      dispatch(
        entryActions.updateCurrentProject({
          [fieldName]: checked,
        }),
      );
    },
    [dispatch],
  );

  const handleScrumToggleChange = useCallback(
    (_, { checked }) => {
      if (!checked) {
        // eslint-disable-next-line no-alert
        if (!window.confirm(t('common.areYouSureYouWantToDisableScrum'))) {
          return;
        }
      }

      dispatch(
        entryActions.updateCurrentProject({
          useScrum: checked,
        }),
      );
    },
    [dispatch, t],
  );

  const handleSprintDurationChange = useCallback(
    (_, { value }) => {
      dispatch(
        entryActions.updateCurrentProject({
          sprintDuration: value,
        }),
      );
    },
    [dispatch],
  );

  const handlePlannerImportSelect = useCallback(
    (file) => {
      if (!file) {
        return;
      }

      setSelectedPlannerFileName(file.name);

      dispatch(
        entryActions.createBoardInCurrentProject({
          name: deriveBoardName(file.name, t('common.board')),
          import: {
            type: 'planner',
            file,
          },
        }),
      );
    },
    [dispatch, t],
  );

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteCurrentProject());
  }, [dispatch]);

  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      {canEdit && (
        <>
          <EditInformation />
          <Divider horizontal section>
            <Header as="h4">
              {t('common.display', {
                context: 'title',
              })}
            </Header>
          </Divider>
        </>
      )}
      <Radio
        toggle
        name="isHidden"
        checked={project.isHidden}
        label={t('common.hideFromProjectListAndFavorites')}
        className={styles.radio}
        onChange={handleToggleChange}
      />
      {canEdit && (
        <>
          <Divider horizontal section>
            <Header as="h4">
              {t('common.configuration', {
                context: 'title',
              })}
            </Header>
          </Divider>
          <Radio
            toggle
            name="useStoryPoints"
            checked={project.useStoryPoints}
            label={t('common.useStoryPointsInProject')}
            className={styles.radio}
            onChange={handleToggleChange}
          />
          <Radio
            toggle
            name="useScrum"
            checked={project.useScrum}
            label={t('common.useScrum')}
            className={styles.radio}
            onChange={handleScrumToggleChange}
          />
          {project.useScrum && (
            <Dropdown
              fluid
              selection
              name="sprintDuration"
              value={project.sprintDuration}
              options={[
                { value: 1, text: t('common.oneWeek') },
                { value: 2, text: t('common.twoWeeks') },
                { value: 3, text: t('common.threeWeeks') },
                { value: 4, text: t('common.fourWeeks') },
              ]}
              className={styles.field}
              onChange={handleSprintDurationChange}
            />
          )}
          <Radio
            toggle
            name="useEpics"
            checked={project.useEpics}
            label={t('common.useEpics')}
            className={styles.radio}
            onChange={handleToggleChange}
          />
          <Divider horizontal section>
            <Header as="h4">
              {t('common.importFromPlanner', {
                context: 'title',
              })}
            </Header>
          </Divider>
          <div className={styles.importSection}>
            <p className={styles.importDescription}>{t('common.importFromPlannerDescription')}</p>
            <FilePicker accept=".xlsx,.xls,.xlsm" onSelect={handlePlannerImportSelect}>
              <Button
                primary
                icon="upload"
                content={t('action.selectPlannerFile')}
                className={styles.importButton}
              />
            </FilePicker>
            {selectedPlannerFileName && (
              <div className={styles.importFileName}>{selectedPlannerFileName}</div>
            )}
          </div>
        </>
      )}
      {canEdit && (
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
              title="common.deleteProject"
              content="common.areYouSureYouWantToDeleteThisProject"
              buttonContent="action.deleteProject"
              onConfirm={handleDeleteConfirm}
            >
              <Button disabled={hasBoards} className={styles.actionButton}>
                {hasBoards
                  ? t('common.deleteAllBoardsToBeAbleToDeleteThisProject')
                  : t('action.deleteProject', {
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

export default GeneralPane;
