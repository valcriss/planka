/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const XLSX = require('xlsx');
const moment = require('moment');
const { rimraf } = require('rimraf');

const DATE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY-MM-DD HH:mm',
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DDTHH:mm',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY/MM/DD',
  'YYYY/MM/DD HH:mm',
  'YYYY/MM/DD HH:mm:ss',
  'DD/MM/YYYY',
  'DD/MM/YYYY HH:mm',
  'DD/MM/YYYY HH:mm:ss',
  'D/M/YYYY',
  'D/M/YYYY HH:mm',
  'D/M/YYYY HH:mm:ss',
  'MM/DD/YYYY',
  'MM/DD/YYYY HH:mm',
  'MM/DD/YYYY HH:mm:ss',
  'M/D/YYYY',
  'M/D/YYYY HH:mm',
  'M/D/YYYY HH:mm:ss',
  'DD.MM.YYYY',
  'DD.MM.YYYY HH:mm',
  'DD.MM.YYYY HH:mm:ss',
  'D.M.YYYY',
  'D.M.YYYY HH:mm',
  'D.M.YYYY HH:mm:ss',
  'DD-MM-YYYY',
  'DD-MM-YYYY HH:mm',
  'DD-MM-YYYY HH:mm:ss',
  'D-M-YYYY',
  'D-M-YYYY HH:mm',
  'D-M-YYYY HH:mm:ss',
];

const DATE_FIELDS = new Set([
  'startDate',
  'dueDate',
  'completedDate',
  'completedAt',
  'createdDate',
  'createdAt',
  'updatedDate',
  'updatedAt',
  'actualStartDate',
  'actualEndDate',
  'checklistCompletedAt',
]);

const BOOLEAN_FIELDS = new Set([
  'isCompleted',
  'hasChecklist',
  'isArchived',
  'checklistIsCompleted',
]);

const MULTI_VALUE_FIELDS = new Set(['labels', 'checklistItems', 'assignments', 'categories']);

const BOOLEAN_TRUE_VALUES = new Set([
  'true',
  '1',
  'yes',
  'y',
  'oui',
  'vrai',
  'done',
  'complete',
  'completed',
  'termine',
  'terminee',
  'acheve',
  'achevee',
]);

const BOOLEAN_FALSE_VALUES = new Set([
  'false',
  '0',
  'no',
  'n',
  'non',
  'faux',
  'not done',
  'not completed',
  'incomplete',
  'incomplet',
  'non termine',
  'non terminee',
]);

const HEADER_ALIASES = {
  'id de tache': 'taskId',
  'task id': 'taskId',
  id: 'taskId',
  'plan id': 'planId',
  'nom du plan': 'planName',
  'plan name': 'planName',
  'nom du compartiment': 'bucketName',
  'bucket name': 'bucketName',
  titre: 'title',
  title: 'title',
  description: 'description',
  notes: 'notes',
  priorite: 'priority',
  priority: 'priority',
  importance: 'priority',
  avancement: 'progress',
  progression: 'progress',
  progress: 'progress',
  'date de debut': 'startDate',
  'start date': 'startDate',
  'date decheance': 'dueDate',
  'date d echeance': 'dueDate',
  'due date': 'dueDate',
  'date de fin': 'completedDate',
  'date de fin reelle': 'completedDate',
  'completion date': 'completedDate',
  'date de creation': 'createdDate',
  'created date': 'createdDate',
  'creation date': 'createdDate',
  'date de mise a jour': 'updatedDate',
  'last modified date': 'updatedDate',
  'updated date': 'updatedDate',
  termine: 'isCompleted',
  terminee: 'isCompleted',
  acheve: 'isCompleted',
  achevee: 'isCompleted',
  completed: 'isCompleted',
  'is completed': 'isCompleted',
  etiquettes: 'labels',
  labels: 'labels',
  categorie: 'categories',
  categories: 'categories',
  'elements de la liste de controle': 'checklistItems',
  'element de la liste de controle': 'checklistItems',
  'elements de liste de controle': 'checklistItems',
  'checklist items': 'checklistItems',
  'etat des elements de la liste de controle': 'checklistState',
  'statut des elements de la liste de controle': 'checklistState',
  'checklist items state': 'checklistState',
  'achevement de la liste de controle': 'checklistProgress',
  'progression de la liste de controle': 'checklistProgress',
  'checklist items progress': 'checklistProgress',
  attributions: 'assignments',
  assignations: 'assignments',
  assignes: 'assignments',
  assignees: 'assignments',
  affectations: 'assignments',
  responsables: 'assignments',
};

const sanitizeString = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const toCamelCase = (value) => {
  const cleaned = sanitizeString(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!cleaned) {
    return '';
  }

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part, index) => {
      if (index === 0) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
};

const createHeaderNormalizer = () => {
  const occurrences = {};

  return (header) => {
    if (header === null || header === undefined) {
      return null;
    }

    const trimmed = String(header).trim();
    if (!trimmed) {
      return null;
    }

    const normalized = sanitizeString(trimmed)
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    let key = HEADER_ALIASES[normalized];

    if (!key) {
      key = toCamelCase(trimmed);
    }

    if (!key) {
      return null;
    }

    const count = occurrences[key] || 0;
    occurrences[key] = count + 1;

    if (count > 0) {
      return `${key}${count + 1}`;
    }

    return key;
  };
};

const isCellEmpty = (value) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

const parseBoolean = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = sanitizeString(value).trim();
    if (!normalized) {
      return null;
    }

    if (BOOLEAN_TRUE_VALUES.has(normalized)) {
      return true;
    }

    if (BOOLEAN_FALSE_VALUES.has(normalized)) {
      return false;
    }
  }

  return null;
};

const parseDateValue = (value, { date1904 }) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value, { date1904 });
    if (!parsed) {
      return null;
    }

    const { y, m, d, H, M, S } = parsed;
    const milliseconds = Math.round((S - Math.floor(S)) * 1000);

    return new Date(Date.UTC(y, m - 1, d, H, M, Math.floor(S), milliseconds)).toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    let parsedMoment = moment(trimmed, moment.ISO_8601, true);

    if (!parsedMoment.isValid()) {
      parsedMoment = moment(trimmed, DATE_FORMATS, true);
    }

    if (parsedMoment.isValid()) {
      return parsedMoment.toDate().toISOString();
    }

    return trimmed;
  }

  return null;
};

const parseMultiValue = (value) => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => parseMultiValue(item))
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  const text = String(value).trim();
  if (!text) {
    return [];
  }

  return text
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const transformValue = (key, value, workbookOptions) => {
  if (MULTI_VALUE_FIELDS.has(key)) {
    return parseMultiValue(value);
  }

  if (DATE_FIELDS.has(key)) {
    return parseDateValue(value, workbookOptions);
  }

  if (BOOLEAN_FIELDS.has(key)) {
    return parseBoolean(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  if (value === undefined) {
    return null;
  }

  return value;
};

module.exports = {
  inputs: {
    file: {
      type: 'json',
      required: true,
    },
  },

  exits: {
    invalidFile: {},
  },

  async fn(inputs) {
    let workbook;

    try {
      workbook = XLSX.readFile(inputs.file.fd, {
        cellDates: true,
      });
    } catch (error) {
      await rimraf(inputs.file.fd);
      throw 'invalidFile';
    }

    let result;
    try {
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw 'invalidFile';
      }

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw 'invalidFile';
      }

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: null,
        blankrows: false,
      });

      if (rows.length === 0) {
        result = {
          fileName: inputs.file.filename || null,
          sheetName,
          columns: [],
          rows: [],
        };

        return result;
      }

      const [headerRow, ...dataRows] = rows;
      const normalizeHeader = createHeaderNormalizer();
      const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));

      const workbookOptions = {
        date1904: Boolean(
          workbook &&
            workbook.Workbook &&
            workbook.Workbook.WBProps &&
            workbook.Workbook.WBProps.date1904,
        ),
      };

      const normalizedRows = dataRows
        .filter((row) => row.some((cell) => !isCellEmpty(cell)))
        .map((row) => {
          const entry = {};

          normalizedHeaders.forEach((key, index) => {
            if (!key) {
              return;
            }

            const transformed = transformValue(key, row[index], workbookOptions);
            entry[key] = transformed;
          });

          return entry;
        });

      const columns = headerRow
        .map((original, index) => {
          const key = normalizedHeaders[index];
          if (!key) {
            return null;
          }

          return {
            key,
            original,
          };
        })
        .filter(Boolean);

      result = {
        fileName: inputs.file.filename || null,
        sheetName,
        columns,
        rows: normalizedRows,
      };

      return result;
    } catch (error) {
      if (error === 'invalidFile') {
        throw error;
      }

      throw 'invalidFile';
    } finally {
      await rimraf(inputs.file.fd);
    }
  },
};
