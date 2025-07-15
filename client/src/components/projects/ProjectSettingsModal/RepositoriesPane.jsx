import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Button, Table, Input, Icon, Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import api from '../../../api';

import styles from './RepositoriesPane.module.scss';

const EMPTY_REPOSITORY = { name: '', url: '', accessToken: '' };

const RepositoriesPane = React.memo(() => {
  const [repositories, setRepositories] = useState([]);
  const [form, setForm] = useState(EMPTY_REPOSITORY);
  const [editingIndex, setEditingIndex] = useState(null);
  const [t] = useTranslation();
  const accessToken = useSelector(selectors.selectAccessToken);
  const projectId = useSelector((state) => selectors.selectPath(state).projectId);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    api
      .getRepositories(projectId, { Authorization: `Bearer ${accessToken}` })
      .then(({ items }) => setRepositories(items))
      .catch(() => {
        /* ignore */
      });
  }, [projectId, accessToken]);

  const handleFieldChange = useCallback((e, { name, value }) => {
    setForm((state) => ({ ...state, [name]: value }));
  }, []);

  const handleAddClick = useCallback(() => {
    setForm(EMPTY_REPOSITORY);
    setEditingIndex(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!projectId) {
      return;
    }

    const data = {
      name: form.name,
      url: form.url,
      accessToken: form.accessToken || null,
    };

    if (editingIndex === null) {
      api
        .createRepository(projectId, data, { Authorization: `Bearer ${accessToken}` })
        .then(({ item }) => {
          setRepositories((items) => [...items, item]);
          setForm(EMPTY_REPOSITORY);
        })
        .catch(() => {});
    } else {
      const repo = repositories[editingIndex];
      api
        .updateRepository(repo.id, data, { Authorization: `Bearer ${accessToken}` })
        .then(({ item }) => {
          setRepositories((items) =>
            items.map((r, idx) => (idx === editingIndex ? item : r)),
          );
          setForm(EMPTY_REPOSITORY);
          setEditingIndex(null);
        })
        .catch(() => {});
    }
  }, [form, editingIndex, projectId, accessToken, repositories]);

  const handleEdit = useCallback(
    (index) => {
      const repo = repositories[index];
      setForm({
        name: repo.name,
        url: repo.url,
        accessToken: repo.accessToken || '',
      });
      setEditingIndex(index);
    },
    [repositories],
  );

  const handleDelete = useCallback(
    (index) => {
      if (!projectId) {
        return;
      }

      const repo = repositories[index];
      if (window.confirm(t('common.areYouSureYouWantToDeleteThisRepository'))) {
        api
          .deleteRepository(repo.id, { Authorization: `Bearer ${accessToken}` })
          .then(() => {
            setRepositories((items) => items.filter((_, idx) => idx !== index));
          })
          .catch(() => {});
      }
    },
    [t, projectId, accessToken, repositories],
  );

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      {repositories.length > 0 && (
        <div className={styles.tableWrapper}>
          <Table unstackable basic="very">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell width={20}>{t('common.name')}</Table.HeaderCell>
                <Table.HeaderCell width={20}>{t('common.url')}</Table.HeaderCell>
                <Table.HeaderCell width={20}>{t('common.accessToken')}</Table.HeaderCell>
                <Table.HeaderCell width={1} />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {repositories.map((repo, index) => (
                <Table.Row key={index}>
                  <Table.Cell>{repo.name}</Table.Cell>
                  <Table.Cell>{repo.url}</Table.Cell>
                  <Table.Cell>{repo.accessToken}</Table.Cell>
                  <Table.Cell textAlign="right">
                      <div className={styles.actions}>
                      <Button className={styles.button} onClick={() => handleEdit(index)}>
                          <Icon fitted name="pencil" />
                      </Button>
                    <Button
                      type="button"
                      className={styles.button}
                      onClick={() => handleDelete(index)}
                    >
                      <Icon fitted name="trash alternate outline" />
                    </Button>
                      </div>
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
          name="accessToken"
          placeholder={t('common.accessToken')}
          value={form.accessToken}
          className={styles.field}
          onChange={handleFieldChange}
        />
        <Button positive onClick={handleSave} className={styles.saveButton}>
          {editingIndex === null ? t('action.addRepository') : t('action.save')}
        </Button>
      </div>
    </Tab.Pane>
  );
});

export default RepositoriesPane;
