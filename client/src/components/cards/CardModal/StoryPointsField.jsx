import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Input } from '../../lib/custom-ui';
import { useDidUpdate, usePrevious, useToggle } from '../../lib/hooks';
import { useEscapeInterceptor, useField, useNestedRef } from '../../hooks';

import styles from './StoryPointsField.module.scss';

const StoryPointsField = React.memo(({ defaultValue, onUpdate }) => {
  const prevDefaultValue = usePrevious(defaultValue);
  const [value, handleChange, setValue] = useField(String(defaultValue));
  const [blurFieldState, blurField] = useToggle();

  const [fieldRef, handleFieldRef] = useNestedRef('inputRef');
  const isFocusedRef = useRef(false);

  const handleEscape = useCallback(() => {
    setValue(String(defaultValue));
    blurField();
  }, [defaultValue, setValue, blurField]);

  const [activateEscapeInterceptor, deactivateEscapeInterceptor] =
    useEscapeInterceptor(handleEscape);

  const handleFocus = useCallback(() => {
    activateEscapeInterceptor();
    isFocusedRef.current = true;
  }, [activateEscapeInterceptor]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        fieldRef.current.blur();
      }
    },
    [fieldRef],
  );

  const handleBlur = useCallback(() => {
    deactivateEscapeInterceptor();
    isFocusedRef.current = false;

    const intValue = parseInt(value, 10);
    if (Number.isNaN(intValue)) {
      setValue(String(defaultValue));
      return;
    }

    if (intValue !== defaultValue) {
      onUpdate(intValue);
    }
  }, [deactivateEscapeInterceptor, value, defaultValue, onUpdate, setValue]);

  useDidUpdate(() => {
    if (!isFocusedRef.current && defaultValue !== prevDefaultValue) {
      setValue(String(defaultValue));
    }
  }, [defaultValue, prevDefaultValue]);

  useDidUpdate(() => {
    fieldRef.current.blur();
  }, [blurFieldState]);

  return (
    <Input
      ref={handleFieldRef}
      type="number"
      min="0"
      step="1"
      value={value}
      className={classNames(styles.field)}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
});

StoryPointsField.propTypes = {
  defaultValue: PropTypes.number.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default StoryPointsField;
