import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm, useClosableModal } from '../../../hooks';
import EpicEditor from '../EpicEditor';

const EditEpicModal = React.memo(() => {
  const epicId = useSelector((state) => selectors.selectCurrentModal(state).params.id);
  const selectEpicById = useMemo(() => selectors.makeSelectEpicById(), []);
  const epic = useSelector((state) => selectEpicById(state, epicId));

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange, setData] = useForm(() => ({
    name: '',
    description: '',
    color: '#000000',
    startDate: null,
    endDate: null,
  }));

  useEffect(() => {
    if (epic) {
      setData({
        name: epic.name,
        description: epic.description || '',
        color: epic.color || '#000000',
        startDate: epic.startDate ? new Date(epic.startDate) : null,
        endDate: epic.endDate ? new Date(epic.endDate) : null,
      });
    }
  }, [epic, setData]);

  const [ClosableModal] = useClosableModal();

  const handleClose = useCallback(() => {
    dispatch(entryActions.closeModal());
  }, [dispatch]);

  const handleSubmit = useCallback(() => {
    const clean = {
      ...data,
      name: data.name.trim(),
      description: data.description.trim() || null,
    };

    if (!clean.name) {
      return;
    }

    dispatch(entryActions.updateEpic(epicId, clean));
    handleClose();
  }, [dispatch, epicId, data, handleClose]);

  if (!epic) {
    return null;
  }

  return (
    <ClosableModal closeIcon onClose={handleClose}>
      <ClosableModal.Header>
        {t('common.editEpic', {
          context: 'title',
        })}
      </ClosableModal.Header>
      <ClosableModal.Content>
        <Form onSubmit={handleSubmit}>
          <EpicEditor data={data} onFieldChange={handleFieldChange} />
        </Form>
      </ClosableModal.Content>
      <ClosableModal.Actions>
        <Button onClick={handleClose} content={t('action.cancel')} />
        <Button positive onClick={handleSubmit} content={t('action.save')} />
      </ClosableModal.Actions>
    </ClosableModal>
  );
});

export default EditEpicModal;
