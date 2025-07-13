import React, { useEffect, useImperativeHandle, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { TextArea } from 'semantic-ui-react';
import TextareaAutosize from 'react-textarea-autosize';
import { Input } from '../../../lib/custom-ui';
import styles from './EpicEditor.module.scss';
import { useNestedRef } from '../../../hooks';

const EpicEditor = React.forwardRef(({ data, onFieldChange }, ref) => {
  const [t] = useTranslation();
  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');

  const selectNameField = useCallback(() => {
    nameFieldRef.current.select();
  }, [nameFieldRef]);

  useImperativeHandle(ref, () => ({ selectNameField }), [selectNameField]);

  useEffect(() => {
    nameFieldRef.current.focus({ preventScroll: true });
  }, [nameFieldRef]);

  return (
    <>
      <div>{t('common.title')}</div>
      <Input
        fluid
        ref={handleNameFieldRef}
        name="name"
        value={data.name}
        maxLength={128}
        onChange={onFieldChange}
      />
      <div>{t('common.description')}</div>
      <TextArea
        as={TextareaAutosize}
        name="description"
        value={data.description || ''}
        onChange={onFieldChange}
      />
      <div>{t('common.color')}</div>
      <input
        type="color"
        name="color"
        value={data.color || '#000000'}
        className={styles.colorInput}
        onChange={(e) => onFieldChange(undefined, { name: 'color', value: e.target.value })}
      />
      <div>{t('common.startDate')}</div>
      <DatePicker
        selected={data.startDate || null}
        onChange={(date) =>
          onFieldChange(undefined, {
            name: 'startDate',
            value: date || null,
          })
        }
      />
      <div>{t('common.endDate')}</div>
      <DatePicker
        selected={data.endDate || null}
        onChange={(date) =>
          onFieldChange(undefined, {
            name: 'endDate',
            value: date || null,
          })
        }
      />
    </>
  );
});

EpicEditor.propTypes = {
  data: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onFieldChange: PropTypes.func.isRequired,
};

export default React.memo(EpicEditor);
