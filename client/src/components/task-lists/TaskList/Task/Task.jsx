/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Draggable } from '@hello-pangea/dnd';
import { Button, Checkbox, Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';
import { useDidUpdate } from '../../../../lib/hooks';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import { isListArchiveOrTrash } from '../../../../utils/record-helpers';
import { BoardMembershipRoles, ListTypes } from '../../../../constants/Enums';
import { ClosableContext } from '../../../../contexts';
import EditName from './EditName';
import SelectAssigneeStep from './SelectAssigneeStep';
import ActionsStep from './ActionsStep';
import ConvertToCardModal from './ConvertToCardModal';
import Linkify from '../../../common/Linkify';
import UserAvatar from '../../../users/UserAvatar';
import { getTaskCardLinks } from '../../../../utils/task-card-links';

import styles from './Task.module.scss';

const Task = React.memo(({ id, index }) => {
  const selectTaskById = useMemo(() => selectors.makeSelectTaskById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectCardByProjectCodeAndNumber = useMemo(
    () => selectors.makeSelectCardByProjectCodeAndNumber(),
    [],
  );

  const task = useSelector((state) => selectTaskById(state, id));
  const linkedCardReferences = useMemo(() => getTaskCardLinks(task.name), [task.name]);
  const [t] = useTranslation();

  const isLinkedCardCompleted = useSelector((state) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const link of linkedCardReferences) {
      let card;
      if (link.projectCode) {
        card = selectCardByProjectCodeAndNumber(state, link.projectCode, link.number);
      } else {
        card = selectCardById(state, link.id);
      }

      if (card) {
        const list = selectListById(state, card.listId);
        if (list?.type === ListTypes.CLOSED) {
          return true;
        }
      }
    }
    return false;
  });

  const { canEdit, canToggle } = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return {
        canEdit: false,
        canToggle: false,
      };
    }

    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    const isEditor = !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;

    return {
      canEdit: isEditor,
      canToggle: isEditor,
    };
  }, shallowEqual);

  const dispatch = useDispatch();
  const [isEditNameOpened, setIsEditNameOpened] = useState(false);
  const [isConvertToCardModalOpened, setIsConvertToCardModalOpened] = useState(false);
  const [, , setIsClosableActive] = useContext(ClosableContext);

  const isEditable = task.isPersisted && canEdit;
  const isCompleted = task.isCompleted || isLinkedCardCompleted;
  const isToggleDisabled = !task.isPersisted || !canToggle || isLinkedCardCompleted;
  const isConvertibleToCard = isEditable && linkedCardReferences.length === 0;

  const handleToggleChange = useCallback(() => {
    if (isToggleDisabled) {
      return;
    }

    dispatch(
      entryActions.updateTask(id, {
        isCompleted: !task.isCompleted,
      }),
    );
  }, [id, task.isCompleted, dispatch, isToggleDisabled]);

  const handleUserSelect = useCallback(
    (userId) => {
      dispatch(
        entryActions.updateTask(id, {
          assigneeUserId: userId,
        }),
      );
    },
    [id, dispatch],
  );

  const handleUserDeselect = useCallback(() => {
    dispatch(
      entryActions.updateTask(id, {
        assigneeUserId: null,
      }),
    );
  }, [id, dispatch]);

  const handleClick = useCallback(() => {
    if (isEditable) {
      setIsEditNameOpened(true);
    }
  }, [isEditable]);

  const handleNameEdit = useCallback(() => {
    setIsEditNameOpened(true);
  }, []);

  const handleEditNameClose = useCallback(() => {
    setIsEditNameOpened(false);
  }, []);

  const handleConvertToCardOpen = useCallback(() => {
    setIsConvertToCardModalOpened(true);
  }, []);

  const handleConvertToCardClose = useCallback(() => {
    setIsConvertToCardModalOpened(false);
  }, []);

  useDidUpdate(() => {
    setIsClosableActive(isEditNameOpened || isConvertToCardModalOpened);
  }, [isConvertToCardModalOpened, isEditNameOpened]);

  const SelectAssigneePopup = usePopupInClosableContext(SelectAssigneeStep);
  const ActionsPopup = usePopupInClosableContext(ActionsStep);

  return (
    <>
      <Draggable
        draggableId={`task:${id}`}
        index={index}
        isDragDisabled={isEditNameOpened || isConvertToCardModalOpened || !isEditable}
      >
        {({ innerRef, draggableProps, dragHandleProps }, { isDragging }) => {
          const contentNode = (
            <div
              {...draggableProps} // eslint-disable-line react/jsx-props-no-spreading
              {...dragHandleProps} // eslint-disable-line react/jsx-props-no-spreading
              ref={innerRef}
              className={classNames(styles.wrapper, isDragging && styles.wrapperDragging)}
            >
              <span className={styles.checkboxWrapper}>
                <Checkbox
                  checked={isCompleted}
                  disabled={isToggleDisabled}
                  className={styles.checkbox}
                  onChange={handleToggleChange}
                />
              </span>
              {isEditNameOpened ? (
                <EditName taskId={id} onClose={handleEditNameClose} />
              ) : (
                <div className={classNames(canEdit && styles.contentHoverable)}>
                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                               jsx-a11y/no-static-element-interactions */}
                  <span
                    className={classNames(styles.text, canEdit && styles.textEditable)}
                    onClick={handleClick}
                  >
                    <span className={classNames(styles.task, isCompleted && styles.taskCompleted)}>
                      <Linkify linkStopPropagation>{task.name}</Linkify>
                    </span>
                  </span>
                  {(task.assigneeUserId || isEditable) && (
                    <div
                      className={classNames(styles.actions, isEditable && styles.actionsEditable)}
                    >
                      {isEditable ? (
                        <>
                          <SelectAssigneePopup
                            currentUserId={task.assigneeUserId}
                            onUserSelect={handleUserSelect}
                            onUserDeselect={handleUserDeselect}
                          >
                            {task.assigneeUserId ? (
                              <UserAvatar
                                id={task.assigneeUserId}
                                size="tiny"
                                title={t('common.selectAssignee', { context: 'title' })}
                                className={styles.assigneeUserAvatar}
                              />
                            ) : (
                              <Button
                                className={styles.button}
                                title={t('common.selectAssignee', { context: 'title' })}
                              >
                                <Icon fitted name="add user" size="small" />
                              </Button>
                            )}
                          </SelectAssigneePopup>
                          {isConvertibleToCard && (
                            <Button
                              className={styles.button}
                              title={t('action.convertTaskToCard')}
                              onClick={handleConvertToCardOpen}
                            >
                              <Icon fitted name="clone" size="small" />
                            </Button>
                          )}
                          <ActionsPopup taskId={id} onNameEdit={handleNameEdit}>
                            <Button
                              className={styles.button}
                              title={t('action.editDescription', { context: 'title' })}
                            >
                              <Icon fitted name="pencil" size="small" />
                            </Button>
                          </ActionsPopup>
                        </>
                      ) : (
                        <UserAvatar
                          id={task.assigneeUserId}
                          size="tiny"
                          className={styles.assigneeUserAvatar}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );

          return isDragging ? ReactDOM.createPortal(contentNode, document.body) : contentNode;
        }}
      </Draggable>
      {isConvertToCardModalOpened && (
        <ConvertToCardModal
          taskId={id}
          defaultTitle={task.name}
          onClose={handleConvertToCardClose}
        />
      )}
    </>
  );
});

Task.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
};

export default Task;
