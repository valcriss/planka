import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';

import AddEpicModal from '../AddEpicModal';

const ProjectEpics = React.memo(() => {
  const [t] = useTranslation();
  const dispatch = useDispatch();
  const modal = useSelector(selectors.selectCurrentModal);

  const handleAddClick = useCallback(() => {
    dispatch(entryActions.openAddEpicModal());
  }, [dispatch]);

  return (
    <div>
      <div>
        <Button primary onClick={handleAddClick} content={t('action.addEpic')} />
      </div>
      {modal && modal.type === 'ADD_EPIC' && <AddEpicModal />}
    </div>
  );
});

export default ProjectEpics;
