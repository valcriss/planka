/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Form } from 'semantic-ui-react';
import { Input, Popup } from '../../../lib/custom-ui';

import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';

import styles from './AddBaseCardTypeStep.module.scss';

const AddBaseCardTypeStep = React.memo(({ onClose }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange] = useForm({
    name: '',
    icon: '',
    color: '',
    hasDescription: true,
    hasDueDate: true,
    hasStopwatch: true,
    hasMembers: true,
  });

  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    const cleanData = {
      ...data,
      name: data.name.trim(),
      icon: data.icon.trim() || null,
      color: data.color.trim() || null,
    };

    if (!cleanData.name) {
      nameFieldRef.current.select();
      return;
    }

    dispatch(entryActions.createBaseCardType(cleanData));
    onClose();
  }, [onClose, dispatch, data, nameFieldRef]);

  useEffect(() => {
    nameFieldRef.current.focus({ preventScroll: true });
  }, [nameFieldRef]);

  return (
    <>
      <Popup.Header>
        {t('common.createCardType', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
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
          />
          <div className={styles.text}>{t('common.icon')}</div>
          <Input
            fluid
            name="icon"
            value={data.icon}
            maxLength={64}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <div className={styles.text}>{t('common.color')}</div>
          <Input
            fluid
            name="color"
            value={data.color}
            maxLength={64}
            className={styles.field}
            onChange={handleFieldChange}
          />
          <Form.Field>
            <Checkbox
              name="hasDescription"
              checked={data.hasDescription}
              label={t('common.description')}
              onChange={(_, { checked }) =>
                handleFieldChange({ target: { name: 'hasDescription', value: checked } })
              }
            />
          </Form.Field>
          <Form.Field>
            <Checkbox
              name="hasDueDate"
              checked={data.hasDueDate}
              label={t('common.dueDate')}
              onChange={(_, { checked }) =>
                handleFieldChange({ target: { name: 'hasDueDate', value: checked } })
              }
            />
          </Form.Field>
          <Form.Field>
            <Checkbox
              name="hasStopwatch"
              checked={data.hasStopwatch}
              label={t('common.stopwatch')}
              onChange={(_, { checked }) =>
                handleFieldChange({ target: { name: 'hasStopwatch', value: checked } })
              }
            />
          </Form.Field>
          <Form.Field>
            <Checkbox
              name="hasMembers"
              checked={data.hasMembers}
              label={t('common.members')}
              onChange={(_, { checked }) =>
                handleFieldChange({ target: { name: 'hasMembers', value: checked } })
              }
            />
          </Form.Field>
          <Button positive content={t('action.createCardType')} />
        </Form>
      </Popup.Content>
    </>
  );
});

AddBaseCardTypeStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default AddBaseCardTypeStep;
