import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import entryActions from '../../../entry-actions';
import { useForm, useClosableModal } from '../../../hooks';
import EpicEditor from '../EpicEditor';

const AddEpicModal = React.memo(() => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const [data, handleFieldChange] = useForm({ name: '', description: '', color: '#000000', startDate: null, endDate: null });
  const [ClosableModal] = useClosableModal();

  const handleClose = useCallback(() => { dispatch(entryActions.closeModal()); }, [dispatch]);

  const handleSubmit = useCallback(() => {
    const clean = { ...data, name: data.name.trim(), description: data.description.trim() || null };
    if (!clean.name) { return; }
    dispatch(entryActions.createEpicInCurrentProject(clean));
    handleClose();
  }, [dispatch, data, handleClose]);

  return (
    <ClosableModal closeIcon onClose={handleClose}>
      <ClosableModal.Header>{t('action.addEpic_title')}</ClosableModal.Header>
      <ClosableModal.Content>
        <Form onSubmit={handleSubmit}>
          <EpicEditor data={data} onFieldChange={handleFieldChange} />
          <Button positive content={t('action.createEpic')} />
        </Form>
      </ClosableModal.Content>
    </ClosableModal>
  );
});

export default AddEpicModal;
