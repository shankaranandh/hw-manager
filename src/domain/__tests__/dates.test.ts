import {
  addDays,
  dayRange,
  diffDays,
  formatMinutes,
  formatTimeOfDay,
  fromDayKey,
  relativeDayLabel,
  shortDayLabel,
  startOfWeek,
  toDayKey,
  weekdayOf,
} from '../dates';

describe('day keys', () => {
  it('round-trips a date through a day key', () => {
    const date = new Date(2026, 8, 16, 13, 45);
    expect(toDayKey(date)).toBe('2026-09-16');
    expect(fromDayKey('2026-09-16').getHours()).toBe(0);
    expect(toDayKey(fromDayKey('2026-09-16'))).toBe('2026-09-16');
  });

  it('pads single-digit months and days', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('sorts lexicographically in date order, which the planner relies on', () => {
    const keys = ['2026-10-02', '2026-09-30', '2027-01-01', '2026-09-09'];
    expect([...keys].sort()).toEqual(['2026-09-09', '2026-09-30', '2026-10-02', '2027-01-01']);
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(diffDays('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('measures whole days in both directions', () => {
    expect(diffDays('2026-09-16', '2026-09-18')).toBe(2);
    expect(diffDays('2026-09-18', '2026-09-16')).toBe(-2);
    expect(diffDays('2026-09-16', '2026-09-16')).toBe(0);
  });

  it('starts the week on Monday', () => {
    expect(startOfWeek('2026-09-16')).toBe('2026-09-14'); // Wednesday -> Monday
    expect(startOfWeek('2026-09-14')).toBe('2026-09-14'); // Monday -> itself
    expect(startOfWeek('2026-09-20')).toBe('2026-09-14'); // Sunday -> the Monday before
  });

  it('builds a contiguous run of days', () => {
    expect(dayRange('2026-09-16', 3)).toEqual(['2026-09-16', '2026-09-17', '2026-09-18']);
    expect(dayRange('2026-09-16', 0)).toEqual([]);
  });

  it('reports the weekday with Sunday as zero', () => {
    expect(weekdayOf('2026-09-20')).toBe(0);
    expect(weekdayOf('2026-09-16')).toBe(3);
  });
});

describe('labels', () => {
  const today = '2026-09-16';

  it('names the days a student actually thinks in', () => {
    expect(relativeDayLabel('2026-09-16', today)).toBe('Today');
    expect(relativeDayLabel('2026-09-17', today)).toBe('Tomorrow');
    expect(relativeDayLabel('2026-09-15', today)).toBe('Yesterday');
    expect(relativeDayLabel('2026-09-19', today)).toBe('Saturday');
    expect(relativeDayLabel('2026-09-30', today)).toBe('Wed, Sep 30');
    expect(relativeDayLabel('2026-09-13', today)).toBe('3 days ago');
  });

  it('shortens the same labels for dense layouts', () => {
    expect(shortDayLabel('2026-09-16', today)).toBe('Today');
    expect(shortDayLabel('2026-09-17', today)).toBe('Tmrw');
    expect(shortDayLabel('2026-09-19', today)).toBe('Sat');
    expect(shortDayLabel('2026-09-30', today)).toBe('Sep 30');
  });

  it('writes durations the way people say them', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 hr');
    expect(formatMinutes(90)).toBe('1 hr 30 min');
    expect(formatMinutes(125)).toBe('2 hr 5 min');
    expect(formatMinutes(-5)).toBe('0 min');
  });

  it('writes clock times on a 12-hour clock', () => {
    expect(formatTimeOfDay(0)).toBe('12:00 AM');
    expect(formatTimeOfDay(9 * 60 + 5)).toBe('9:05 AM');
    expect(formatTimeOfDay(12 * 60)).toBe('12:00 PM');
    expect(formatTimeOfDay(16 * 60 + 30)).toBe('4:30 PM');
    expect(formatTimeOfDay(23 * 60 + 59)).toBe('11:59 PM');
  });
});
