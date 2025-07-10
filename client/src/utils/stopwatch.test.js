import { createStopwatch, startStopwatch, stopStopwatch, formatStopwatch } from './stopwatch';

describe('stopwatch utilities', () => {
  test('createStopwatch calculates total seconds', () => {
    const sw = createStopwatch({ hours: 1, minutes: 2, seconds: 3 });
    expect(sw.total).toBe(3723);
  });

  test('start and stop stopwatch', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
    let sw = startStopwatch();
    jest.setSystemTime(new Date('2024-01-01T00:00:05Z'));
    sw = stopStopwatch(sw);
    expect(sw.total).toBe(5);
    expect(formatStopwatch(sw)).toBe('0:00:05');
    jest.useRealTimers();
  });
});
