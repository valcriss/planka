import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Dropdown } from 'semantic-ui-react';

import selectors from '../../../../selectors';

import styles from './EpicField.module.scss';

const EpicField = React.memo(({ projectId, defaultValue, onUpdate }) => {
  const [t] = useTranslation();
  const epicIds = useSelector((state) =>
    selectors.selectEpicIdsByProjectId(state, projectId),
  );
  const selectEpicById = useCallback(
    (state, id) => selectors.selectEpicById(state, id),
    [],
  );
  const epics = useSelector((state) =>
    (epicIds || []).map((id) => selectEpicById(state, id)),
  );

  const options = [
    { value: null, text: t('common.noEpic') },
    ...epics.map((e) => ({ value: e.id, text: e.name })),
  ];

  const handleChange = useCallback(
    (_, { value }) => {
      if (value !== defaultValue) {
        onUpdate(value);
      }
    },
    [defaultValue, onUpdate],
  );

  return (
    <Dropdown
      fluid
      selection
      options={options}
      value={defaultValue || null}
      className={styles.field}
      onChange={handleChange}
    />
  );
});

EpicField.propTypes = {
  projectId: PropTypes.string.isRequired,
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
};

EpicField.defaultProps = {
  defaultValue: null,
};

export default EpicField;
