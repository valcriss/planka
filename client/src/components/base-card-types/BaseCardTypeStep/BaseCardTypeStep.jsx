/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { dequal } from 'dequal';
import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Dropdown, Form, Icon } from 'semantic-ui-react';
import { Input, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useNestedRef, useSteps } from '../../../hooks';
import ConfirmationStep from '../../common/ConfirmationStep';

import styles from './BaseCardTypeStep.module.scss';
import ICON_OPTIONS from '../../../constants/CardTypeIconOptions';

const StepTypes = {
  DELETE: 'DELETE',
};

const BaseCardTypeStep = React.memo(({ id, onBack, onClose }) => {
  const selectBaseCardTypeById = useMemo(
    () => selectors.makeSelectBaseCardTypeById(),
    [],
  );

  const baseCardType = useSelector((state) => selectBaseCardTypeById(state, id));

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [step, openStep, handleBack] = useSteps();

  const defaultData = useMemo(
    () => ({
      name: baseCardType.name,
      icon: baseCardType.icon || '',
      color: baseCardType.color || '',
      hasStopwatch: baseCardType.hasStopwatch,
      hasTaskList: baseCardType.hasTaskList,
      canLinkCards: baseCardType.canLinkCards,
    }),
    [baseCardType],
  );

  const [data, handleFieldChange] = useForm(defaultData);
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

    if (!dequal(cleanData, defaultData)) {
      dispatch(entryActions.updateBaseCardType(id, cleanData));
    }

    onClose();
  }, [id, onClose, dispatch, defaultData, data, nameFieldRef]);

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteBaseCardType(id));
  }, [id, dispatch]);

  const handleDeleteClick = useCallback(() => {
    openStep(StepTypes.DELETE);
  }, [openStep]);

  useEffect(() => {
    nameFieldRef.current.focus({ preventScroll: true });
  }, [nameFieldRef]);

  if (step && step.type === StepTypes.DELETE) {
    return (
      <ConfirmationStep
        title="common.deleteCardType"
        content="common.areYouSureYouWantToDeleteThisCardType"
        buttonContent="action.deleteCardType"
        onConfirm={handleDeleteConfirm}
        onBack={handleBack}
      />
    );
  }

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.editCardType', {
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
            onChange={(_, { value }) =>
              handleFieldChange(null, { name: 'icon', value })
            }
          />
          <div className={styles.text}>{t('common.color')}</div>
          <input
            type="color"
            name="color"
            value={data.color || '#000000'}
            className={styles.colorInput}
            onChange={(e) =>
              handleFieldChange(null, { name: 'color', value: e.target.value })
            }
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
          <div className={styles.actions}>
            <Button positive content={t('action.save')} />
            <Button type="button" content={t('action.delete')} className={styles.deleteButton} onClick={handleDeleteClick} />
          </div>
        </Form>
      </Popup.Content>
    </>
  );
});

BaseCardTypeStep.propTypes = {
  id: PropTypes.string.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

BaseCardTypeStep.defaultProps = {
  onBack: undefined,
};

export default BaseCardTypeStep;
