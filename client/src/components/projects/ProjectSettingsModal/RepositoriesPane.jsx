import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Table, Input, Icon, Tab } from 'semantic-ui-react';

import styles from './RepositoriesPane.module.scss';

const EMPTY_REPOSITORY = { name: '', url: '', token: '' };

const RepositoriesPane = React.memo(() => {
  const [repositories, setRepositories] = useState([]);
  const [form, setForm] = useState(EMPTY_REPOSITORY);
  const [editingIndex, setEditingIndex] = useState(null);
  const [t] = useTranslation();

  const handleFieldChange = useCallback((e, { name, value }) => {
    setForm((state) => ({ ...state, [name]: value }));
  }, []);

  const handleAddClick = useCallback(() => {
    setForm(EMPTY_REPOSITORY);
    setEditingIndex(null);
  }, []);

  const handleSave = useCallback(() => {
    if (editingIndex === null) {
      setRepositories((items) => [...items, form]);
    } else {
      setRepositories((items) =>
        items.map((item, idx) => (idx === editingIndex ? form : item)),
      );
    }
    setForm(EMPTY_REPOSITORY);
    setEditingIndex(null);
  }, [form, editingIndex]);

  const handleEdit = useCallback(
    (index) => {
      setForm(repositories[index]);
      setEditingIndex(index);
    },
    [repositories],
  );

  const handleDelete = useCallback(
    (index) => {
      if (window.confirm(t('common.areYouSureYouWantToDeleteThisRepository'))) {
        setRepositories((items) => items.filter((_, idx) => idx !== index));
      }
    },
    [t],
  );

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <div className={styles.actions}>
        <Button positive onClick={handleAddClick} className={styles.addButton}>
          {t('action.addRepository')}
        </Button>
      </div>
      {repositories.length > 0 && (
        <div className={styles.tableWrapper}>
          <Table unstackable basic="very">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t('common.name')}</Table.HeaderCell>
                <Table.HeaderCell>{t('common.url')}</Table.HeaderCell>
                <Table.HeaderCell>{t('common.accessToken')}</Table.HeaderCell>
                <Table.HeaderCell width={1} />
                <Table.HeaderCell width={1} />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {repositories.map((repo, index) => (
                <Table.Row key={index}>
                  <Table.Cell>{repo.name}</Table.Cell>
                  <Table.Cell>{repo.url}</Table.Cell>
                  <Table.Cell>{repo.token}</Table.Cell>
                  <Table.Cell textAlign="right">
                    <Button className={styles.button} onClick={() => handleEdit(index)}>
                      <Icon fitted name="pencil" />
                    </Button>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Button
                      type="button"
                      className={styles.button}
                      onClick={() => handleDelete(index)}
                    >
                      <Icon fitted name="trash alternate outline" />
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
      <div className={styles.editor}>
        <Input
          name="name"
          placeholder={t('common.name')}
          value={form.name}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <Input
          name="url"
          placeholder={t('common.url')}
          value={form.url}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <Input
          name="token"
          placeholder={t('common.accessToken')}
          value={form.token}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <Button positive onClick={handleSave} className={styles.saveButton}>
          {editingIndex === null ? t('action.add') : t('action.save')}
        </Button>
      </div>
    </Tab.Pane>
  );
});

export default RepositoriesPane;
