/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Dropdown, Form, Icon } from 'semantic-ui-react';
import { Input, Popup } from '../../../lib/custom-ui';

import entryActions from '../../../entry-actions';
import { useForm, useNestedRef } from '../../../hooks';

import styles from './AddCardTypeStep.module.scss';
import ICON_OPTIONS from '../../../constants/CardTypeIconOptions';

const AddCardTypeStep = React.memo(({ onClose }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange] = useForm({
    name: '',
    icon: '',
    color: '',
    hasStopwatch: true,
    hasTaskList: true,
    canLinkCards: true,
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

    dispatch(entryActions.createCardTypeInCurrentProject(cleanData));
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
          <Dropdown
            fluid
            selection
            search
            name="icon"
            value={data.icon}
            options={ICON_OPTIONS.map((icon) => ({
              key: icon,
              text: icon,
              value: icon,
              content: (
                <span>
                  <Icon name={icon} /> {icon}
                </span>
              ),
            }))}
            className={styles.field}
            onChange={(_, { value }) => handleFieldChange(null, { name: 'icon', value })}
          />
          <div className={styles.text}>{t('common.color')}</div>
          <input
            type="color"
            name="color"
            value={data.color || '#000000'}
            className={styles.colorInput}
            onChange={(e) => handleFieldChange(null, { name: 'color', value: e.target.value })}
          />
          <Form.Field>
            <Checkbox
              name="hasTaskList"
              checked={data.hasTaskList}
              label={t('common.taskList_title')}
              onChange={(_, { checked }) =>
                handleFieldChange(null, { name: 'hasTaskList', value: checked })
              }
            />
          </Form.Field>
          <Form.Field>
            <Checkbox
              name="hasStopwatch"
              checked={data.hasStopwatch}
              label={t('common.stopwatch')}
              onChange={(_, { checked }) =>
                handleFieldChange(null, { name: 'hasStopwatch', value: checked })
              }
            />
          </Form.Field>
          <Form.Field>
            <Checkbox
              name="canLinkCards"
              checked={data.canLinkCards}
              label={t('common.linkCards')}
              onChange={(_, { checked }) =>
                handleFieldChange(null, { name: 'canLinkCards', value: checked })
              }
            />
          </Form.Field>
          <Button positive content={t('action.createCardType')} />
        </Form>
      </Popup.Content>
    </>
  );
});

AddCardTypeStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default AddCardTypeStep;
