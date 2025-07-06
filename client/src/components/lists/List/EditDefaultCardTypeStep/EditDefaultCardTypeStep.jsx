/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import cardTypeSelectors from '../../../selectors/card-types';
import entryActions from '../../../entry-actions';
import SelectCardType from '../../cards/SelectCardType';

const EditDefaultCardTypeStep = React.memo(({ listId, onBack, onClose }) => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectCardTypeIdsByProjectId = useMemo(
    () => cardTypeSelectors.makeSelectCardTypeIdsByProjectId(),
    [],
  );
  const selectCardTypeById = useMemo(
    () => cardTypeSelectors.makeSelectCardTypeById(),
    [],
  );
  const selectBaseCardTypeById = useMemo(
    () => cardTypeSelectors.makeSelectBaseCardTypeById(),
    [],
  );

  const list = useSelector((state) => selectListById(state, listId));
  const cardTypeIds = useSelector((state) =>
    selectCardTypeIdsByProjectId(state, list.board.projectId),
  );
  const baseCardTypeIds = useSelector(cardTypeSelectors.selectBaseCardTypeIds);

  const cardTypes = useSelector((state) =>
    (cardTypeIds || []).map((id) => selectCardTypeById(state, id)),
  );
  const baseCardTypes = useSelector((state) =>
    (baseCardTypeIds || []).map((id) => selectBaseCardTypeById(state, id)),
  );
  const allTypes = [...baseCardTypes, ...cardTypes];

  const dispatch = useDispatch();
  const [t] = useTranslation();

  useEffect(() => {
    dispatch(entryActions.fetchBaseCardTypes());
  }, [dispatch]);

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
      <Popup.Header onBack={onBack}>
        {t('common.defaultCardType_title')}
      </Popup.Header>
      <Popup.Content>
        <SelectCardType
          projectId={list.board.projectId}
          value={list.defaultCardTypeId}
          onSelect={handleSelect}
        />
      </Popup.Content>
    </>
  );
});

EditDefaultCardTypeStep.propTypes = {
  listId: PropTypes.string.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

EditDefaultCardTypeStep.defaultProps = {
  onBack: undefined,
};

export default EditDefaultCardTypeStep;
