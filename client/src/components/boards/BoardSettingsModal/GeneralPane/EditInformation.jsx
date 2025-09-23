/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { dequal } from 'dequal';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { useForm, useNestedRef } from '../../../../hooks';

import styles from './EditInformation.module.scss';

const EditInformation = React.memo(() => {
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);

  const boardId = useSelector((state) => selectors.selectCurrentModal(state).params.id);
  const board = useSelector((state) => selectBoardById(state, boardId));
  const project = useSelector((state) =>
    board ? selectors.selectProjectById(state, board.projectId) : null,
  );
  const projectUsesScrum = Boolean(project?.useScrum);
  const isScrumBoard = board && projectUsesScrum && ['Backlog', 'Sprint'].includes(board.name);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const defaultData = useMemo(
    () => ({
      name: board.name,
      showCardCount: projectUsesScrum ? false : board.showCardCount,
    }),
    [board.name, board.showCardCount, projectUsesScrum],
  );

  const [data, handleFieldChange, setData] = useForm(() => ({
    name: '',
    showCardCount: false,
    ...defaultData,
  }));

  useEffect(() => {
    setData((prevData) => {
      if (
        prevData.name === defaultData.name &&
        prevData.showCardCount === defaultData.showCardCount
      ) {
        return prevData;
      }

      return {
        ...prevData,
        ...defaultData,
      };
    });
  }, [defaultData, setData]);

  const handleShowCardCountChange = useCallback(
    (_, { checked }) => {
      setData((prevData) => ({
        ...prevData,
        showCardCount: checked,
      }));
    },
    [setData],
  );

  const cleanData = useMemo(
    () => ({
      ...data,
      name: data.name.trim(),
      showCardCount: projectUsesScrum ? false : data.showCardCount,
    }),
    [data, projectUsesScrum],
  );

  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    if (!cleanData.name) {
      nameFieldRef.current.select();
      return;
    }

    dispatch(entryActions.updateBoard(boardId, cleanData));
  }, [boardId, dispatch, cleanData, nameFieldRef]);

  return (
    <Form onSubmit={handleSubmit}>
      <div className={styles.text}>{t('common.title')}</div>
      <Input
        fluid
        ref={handleNameFieldRef}
        name="name"
        value={data.name}
        maxLength={128}
        className={styles.field}
        onChange={handleFieldChange}
        disabled={isScrumBoard}
      />
      <Form.Checkbox
        name="showCardCount"
        label={t('common.showCardCount')}
        checked={projectUsesScrum ? false : data.showCardCount}
        className={styles.checkboxField}
        onChange={handleShowCardCountChange}
        disabled={projectUsesScrum}
      />
      {projectUsesScrum && (
        <div className={styles.helperText}>{t('common.cardCountDisabledInScrum')}</div>
      )}
      <Button
        positive
        disabled={dequal(cleanData, defaultData) || isScrumBoard}
        content={t('action.save')}
      />
    </Form>
  );
});

export default EditInformation;
