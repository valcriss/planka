/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import { Popup } from '../../lib/custom-ui';

import SelectCardType from './SelectCardType';
import entryActions from '../../entry-actions';

const SelectCardTypeStep = React.memo(
  ({ projectId, defaultValue, title, withButton, buttonContent, onSelect, onBack, onClose }) => {
    const [t] = useTranslation();
    const dispatch = useDispatch();
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
      dispatch(entryActions.fetchBaseCardTypes());
      if (projectId) {
        dispatch(entryActions.fetchCardTypes(projectId));
      }
    }, [dispatch, projectId]);

    const handleSelect = useCallback(
      (nextValue) => {
        if (withButton) {
          setValue(nextValue);
        } else {
          if (nextValue !== defaultValue) {
            onSelect(nextValue);
          }

          onClose();
        }
      },
      [defaultValue, withButton, onSelect, onClose],
    );

    const handleSubmit = useCallback(() => {
      if (value !== defaultValue) {
        onSelect(value);
      }

      onClose();
    }, [defaultValue, onSelect, onClose, value]);

    return (
      <>
        <Popup.Header onBack={onBack}>
          {t(title, {
            context: 'title',
          })}
        </Popup.Header>
        <Popup.Content>
          <Form onSubmit={handleSubmit}>
            <SelectCardType
              projectId={projectId}
              value={value}
              onSelect={handleSelect}
            />
            {withButton && <Button positive content={t(buttonContent)} />}
          </Form>
        </Popup.Content>
      </>
    );
  },
);

SelectCardTypeStep.propTypes = {
  projectId: PropTypes.string,
  defaultValue: PropTypes.string,
  title: PropTypes.string,
  withButton: PropTypes.bool,
  buttonContent: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

SelectCardTypeStep.defaultProps = {
  projectId: undefined,
  defaultValue: undefined,
  title: 'common.selectType',
  withButton: false,
  buttonContent: 'action.selectType',
  onBack: undefined,
};

export default SelectCardTypeStep;
