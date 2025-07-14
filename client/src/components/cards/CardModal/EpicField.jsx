import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Dropdown } from 'semantic-ui-react';

import selectors from '../../../selectors';

import styles from './EpicField.module.scss';

const EpicField = React.memo(({ projectId, value, onChange }) => {
  const [t] = useTranslation();
  const selectEpicIdsByProjectId = React.useMemo(() => selectors.makeSelectEpicIdsByProjectId(), []);
  const selectEpicById = React.useMemo(() => selectors.makeSelectEpicById(), []);

  const epicIds = useSelector((state) => selectEpicIdsByProjectId(state, projectId)) || [];
  const epics = useSelector((state) => epicIds.map((id) => selectEpicById(state, id)));

  const options = [
    { value: null, text: t('common.noEpic') },
    ...epics.map((e) => ({ value: e.id, text: e.name })),
  ];

  const handleChange = useCallback((_, { value: nextValue }) => {
    onChange(nextValue || null);
  }, [onChange]);

  return (
    <Dropdown
      fluid
      selection
      value={value || null}
      options={options}
      className={styles.dropdown}
      onChange={handleChange}
    />
  );
});

EpicField.propTypes = {
  projectId: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

EpicField.defaultProps = {
  value: null,
};

export default EpicField;
