/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import { Input, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useField } from '../../../hooks';

const EditCardLimitStep = React.memo(({ listId, onBack, onClose }) => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const defaultCardLimit = useSelector((state) => selectListById(state, listId).cardLimit ?? 0);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [value, handleFieldChange] = useField(String(defaultCardLimit));

  const handleSubmit = useCallback(() => {
    const normalizedValue = value.trim();

    const parsedValue = Number.parseInt(normalizedValue, 10);
    const cardLimit = Number.isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;

    if (cardLimit !== defaultCardLimit) {
      dispatch(
        entryActions.updateList(listId, {
          cardLimit,
        }),
      );
    }

    onClose();
  }, [value, defaultCardLimit, dispatch, listId, onClose]);

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.editCardLimit', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Form onSubmit={handleSubmit}>
          <Form.Field>
            <label htmlFor="list-card-limit-field">{t('common.cardLimit')}</label>
            <Input
              id="list-card-limit-field"
              type="number"
              min="0"
              step="1"
              value={value}
              placeholder={t('common.cardLimitPlaceholder')}
              onChange={handleFieldChange}
              autoFocus
            />
          </Form.Field>
          <Button positive content={t('action.save')} />
          <Button type="button" content={t('action.cancel')} onClick={onClose} />
        </Form>
      </Popup.Content>
    </>
  );
});

EditCardLimitStep.propTypes = {
  listId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EditCardLimitStep;
