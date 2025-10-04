/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Popup } from '../../../../lib/custom-ui';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import SelectCardType from '../../../cards/SelectCardType';

const EditDefaultCardTypeStep = React.memo(({ listId, onBack = undefined, onClose }) => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);

  const list = useSelector((state) => selectListById(state, listId));
  const board = useSelector((state) => (list ? selectBoardById(state, list.boardId) : null));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  useEffect(() => {
    dispatch(entryActions.fetchBaseCardTypes());
    if (board) {
      dispatch(entryActions.fetchCardTypes(board.projectId));
    }
  }, [dispatch, board]);

  const handleSelect = useCallback(
    (defaultCardTypeId) => {
      dispatch(
        entryActions.updateList(listId, {
          defaultCardTypeId,
        }),
      );
      onClose();
    },
    [listId, dispatch, onClose],
  );

  return (
    <>
      <Popup.Header onBack={onBack}>{t('common.defaultCardType_title')}</Popup.Header>
      <Popup.Content>
        {board && (
          <SelectCardType
            projectId={board.projectId}
            value={list.defaultCardTypeId}
            onSelect={handleSelect}
          />
        )}
      </Popup.Content>
    </>
  );
});

EditDefaultCardTypeStep.propTypes = {
  listId: PropTypes.string.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default EditDefaultCardTypeStep;
