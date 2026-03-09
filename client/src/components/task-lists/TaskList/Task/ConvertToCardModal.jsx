/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Form, Modal } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { useForm } from '../../../../hooks';
import { CardTypes } from '../../../../constants/Enums';

import styles from './ConvertToCardModal.module.scss';

const ConvertToCardModal = React.memo(({ taskId, defaultTitle, onClose }) => {
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);

  const currentCard = useSelector(selectors.selectCurrentCard);
  const projectsToLists = useSelector(
    selectors.selectProjectsToListsWithEditorRightsForCurrentUser,
  );
  const currentBoard = useSelector((state) => selectBoardById(state, currentCard.boardId));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange, setData] = useForm(() => ({
    name: defaultTitle,
    projectId: currentBoard ? currentBoard.projectId : null,
    boardId: currentCard.boardId,
    listId: currentCard.listId,
  }));

  const selectedProject = useMemo(
    () => projectsToLists.find((project) => project.id === data.projectId) || null,
    [projectsToLists, data.projectId],
  );

  const selectedBoard = useMemo(
    () => selectedProject?.boards.find((board) => board.id === data.boardId) || null,
    [selectedProject, data.boardId],
  );

  const selectedList = useMemo(
    () => selectedBoard?.lists.find((list) => list.id === data.listId) || null,
    [selectedBoard, data.listId],
  );

  const selectedDefaultCardType = useMemo(
    () => ({
      type: selectedList?.defaultCardType || selectedBoard?.defaultCardType || CardTypes.PROJECT,
      cardTypeId: selectedList?.defaultCardTypeId || selectedBoard?.defaultCardTypeId || null,
    }),
    [selectedBoard, selectedList],
  );

  useEffect(() => {
    if (selectedBoard?.isFetching === null) {
      dispatch(entryActions.fetchBoard(selectedBoard.id));
    }
  }, [dispatch, selectedBoard]);

  useEffect(() => {
    if (!selectedBoard || selectedList) {
      return;
    }

    const firstList = selectedBoard.lists.find((list) => list.isPersisted);

    if (firstList) {
      setData((prevData) => ({
        ...prevData,
        listId: firstList.id,
      }));
    }
  }, [selectedBoard, selectedList, setData]);

  const handleProjectChange = useCallback(
    (_, { value }) => {
      const nextProject = projectsToLists.find((project) => project.id === value) || null;
      const nextBoard = nextProject?.boards[0] || null;
      const nextList = nextBoard?.lists.find((list) => list.isPersisted);

      setData((prevData) => ({
        ...prevData,
        projectId: value,
        boardId: nextBoard ? nextBoard.id : null,
        listId: nextList ? nextList.id : null,
      }));
    },
    [projectsToLists, setData],
  );

  const handleBoardChange = useCallback(
    (_, { value }) => {
      const nextBoard = selectedProject?.boards.find((board) => board.id === value);
      const nextList = nextBoard?.lists.find((list) => list.isPersisted);

      setData((prevData) => ({
        ...prevData,
        boardId: value,
        listId: nextList ? nextList.id : null,
      }));
    },
    [selectedProject, setData],
  );

  const handleSubmit = useCallback(() => {
    const cleanName = data.name.trim();

    if (!cleanName || !selectedList) {
      return;
    }

    dispatch(
      entryActions.convertTaskToCard(taskId, selectedList.id, {
        name: cleanName,
        type: selectedDefaultCardType.type,
        cardTypeId: selectedDefaultCardType.cardTypeId,
      }),
    );

    onClose();
  }, [data.name, dispatch, onClose, selectedDefaultCardType, selectedList, taskId]);

  return (
    <Modal open closeIcon size="tiny" onClose={onClose}>
      <Modal.Header>
        {t('common.convertTaskToCard', {
          context: 'title',
        })}
      </Modal.Header>
      <Modal.Content>
        <Form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.project')}</div>
            <Dropdown
              fluid
              selection
              options={projectsToLists.map((project) => ({
                text: project.name,
                value: project.id,
              }))}
              value={selectedProject ? selectedProject.id : null}
              placeholder={
                projectsToLists.length === 0 ? t('common.noProjects') : t('common.selectProject')
              }
              disabled={projectsToLists.length === 0}
              onChange={handleProjectChange}
            />
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.board')}</div>
            <Dropdown
              fluid
              selection
              options={
                selectedProject
                  ? selectedProject.boards.map((board) => ({
                      text: board.name,
                      value: board.id,
                    }))
                  : []
              }
              value={selectedBoard ? selectedBoard.id : null}
              placeholder={
                selectedProject?.boards.length === 0
                  ? t('common.noBoards')
                  : t('common.selectBoard')
              }
              disabled={!selectedProject || selectedProject.boards.length === 0}
              onChange={handleBoardChange}
            />
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.list')}</div>
            <Dropdown
              fluid
              selection
              name="listId"
              options={
                selectedBoard
                  ? selectedBoard.lists.map((list) => ({
                      text: list.name || t(`common.${list.type}`),
                      value: list.id,
                      disabled: !list.isPersisted,
                    }))
                  : []
              }
              value={selectedList ? selectedList.id : null}
              placeholder={
                selectedBoard?.isFetching === false && selectedBoard.lists.length === 0
                  ? t('common.noLists')
                  : t('common.selectList')
              }
              loading={!!selectedBoard && selectedBoard.isFetching !== false}
              disabled={
                !selectedBoard ||
                selectedBoard?.isFetching !== false ||
                selectedBoard.lists.length === 0
              }
              onChange={handleFieldChange}
            />
          </div>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>{t('common.title')}</div>
            <Form.Input
              name="name"
              value={data.name}
              maxLength={1024}
              onChange={handleFieldChange}
            />
          </div>
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button content={t('action.cancel')} onClick={onClose} />
        <Button
          positive
          content={t('action.convertTaskToCard')}
          disabled={!data.name.trim() || !selectedList || selectedBoard?.isFetching !== false}
          onClick={handleSubmit}
        />
      </Modal.Actions>
    </Modal>
  );
});

ConvertToCardModal.propTypes = {
  taskId: PropTypes.string.isRequired,
  defaultTitle: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ConvertToCardModal;
