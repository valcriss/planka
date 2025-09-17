const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');

const helper = require('../api/helpers/boards/process-uploaded-planner-import-file');

const excelSerialFromIso = (iso) => {
  const date = new Date(iso);
  const excelEpoch = Date.UTC(1899, 11, 30);

  return (date.getTime() - excelEpoch) / 86400000;
};

describe('boards/process-uploaded-planner-import-file helper', () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
      tmpDir = null;
    }
  });

  test('parses rows and normalizes values from an Excel workbook', async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'planner-import-'));
    const filePath = path.join(tmpDir, 'planner.xlsx');

    const sheetData = [
      [
        'ID de tâche',
        'Nom du compartiment',
        'Date de début',
        "Date d'échéance",
        'Terminé',
        'Étiquettes',
        'Éléments de la liste de contrôle',
      ],
      [
        'task-1',
        'Backlog',
        excelSerialFromIso('2024-01-05T00:00:00.000Z'),
        '01/02/2024 15:30',
        'Oui',
        'Rouge, Vert',
        'Item A\nItem B',
      ],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plan');
    XLSX.writeFile(workbook, filePath);

    const result = await helper.fn({
      file: {
        fd: filePath,
        filename: 'planner.xlsx',
      },
    });

    expect(result.fileName).toBe('planner.xlsx');
    expect(result.sheetName).toBe('Plan');
    expect(result.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'taskId', original: 'ID de tâche' }),
        expect.objectContaining({ key: 'bucketName', original: 'Nom du compartiment' }),
      ]),
    );

    expect(result.rows).toHaveLength(1);
    const [row] = result.rows;

    expect(row).toMatchObject({
      taskId: 'task-1',
      bucketName: 'Backlog',
      startDate: '2024-01-05T00:00:00.000Z',
      dueDate: '2024-02-01T15:30:00.000Z',
      isCompleted: true,
      labels: ['Rouge', 'Vert'],
      checklistItems: ['Item A', 'Item B'],
    });

    await expect(fs.promises.access(filePath)).rejects.toThrow();
  });
});
