/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import isEmail from 'validator/lib/isEmail';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, Message, Tab } from 'semantic-ui-react';

import api from '../../../../api';
import { Input } from '../../../../lib/custom-ui';

import styles from './SystemPane.module.scss';

const hasContent = (value) => {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return true;
};

const renderSection = (title, value) => {
  if (!hasContent(value)) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <pre className={styles.code}>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
};

const SystemPane = React.memo(() => {
  const [t] = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleEmailChange = useCallback((event, { value }) => {
    setEmail(value);
  }, []);

  const handleResultDismiss = useCallback(() => {
    setResult(null);
  }, []);

  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedEmail = email.trim();

    if (!isEmail(trimmedEmail)) {
      return;
    }

    setIsSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const response = await api.testSmtp({
        email: trimmedEmail,
      });

      setResult(response.item);
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [email]);

  const isEmailValid = isEmail(email.trim());

  const errorInfo = useMemo(() => {
    if (!error) {
      return null;
    }

    if (error.smtpNotConfigured) {
      return {
        header: t('common.testSmtpNotConfigured'),
        description:
          error.smtpNotConfigured.message || t('common.testSmtpNotConfiguredDescription'),
        timestamp: error.smtpNotConfigured.timestamp,
        smtp: error.smtpNotConfigured.smtp,
      };
    }

    if (error.smtpSendFailed) {
      return {
        header: t('common.testSmtpError'),
        description: error.smtpSendFailed.to
          ? t('common.testSmtpErrorDescription', { email: error.smtpSendFailed.to })
          : error.smtpSendFailed.message,
        timestamp: error.smtpSendFailed.timestamp,
        smtp: error.smtpSendFailed.smtp,
        transportError: error.smtpSendFailed.error,
      };
    }

    return {
      header: t('common.testSmtpError'),
      description: error.message || t('common.unknownError'),
      transportError: error,
    };
  }, [error, t]);

  const successHeader = useMemo(() => {
    if (!result) {
      return null;
    }

    return t('common.testSmtpSuccess', {
      email: result.to,
    });
  }, [result, t]);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <h3 className={styles.header}>{t('common.testSmtp')}</h3>
      <p className={styles.description}>{t('common.testSmtpDescription')}</p>
      <Form className={styles.form} onSubmit={handleSubmit}>
        <Form.Field>
          <label htmlFor="system-pane-email">{t('common.email')}</label>
          <Input
            id="system-pane-email"
            name="email"
            value={email}
            readOnly={isSubmitting}
            onChange={handleEmailChange}
            maxLength={256}
            placeholder="admin@example.com"
          />
        </Form.Field>
        <div className={styles.actions}>
          <Button
            primary
            type="submit"
            disabled={!isEmailValid || isSubmitting}
            loading={isSubmitting}
            content={t('action.sendTestEmail')}
          />
        </div>
      </Form>
      <div className={styles.messages}>
        {result && (
          <Message success onDismiss={handleResultDismiss}>
            <Message.Header>{successHeader}</Message.Header>
            {result.timestamp && (
              <p className={styles.meta}>
                {t('common.testSmtpTimestamp', { timestamp: result.timestamp })}
              </p>
            )}
            <Message.Content>
              {renderSection(t('common.smtpConfiguration'), result.smtp)}
              {renderSection(t('common.smtpResponse'), result.delivery)}
            </Message.Content>
          </Message>
        )}
        {errorInfo && (
          <Message negative onDismiss={handleErrorDismiss}>
            <Message.Header>{errorInfo.header}</Message.Header>
            {errorInfo.description && <p>{errorInfo.description}</p>}
            {errorInfo.timestamp && (
              <p className={styles.meta}>
                {t('common.testSmtpTimestamp', { timestamp: errorInfo.timestamp })}
              </p>
            )}
            <Message.Content>
              {renderSection(t('common.smtpConfiguration'), errorInfo.smtp)}
              {renderSection(t('common.smtpDebugInformation'), errorInfo.transportError)}
            </Message.Content>
          </Message>
        )}
      </div>
    </Tab.Pane>
  );
});

export default SystemPane;
