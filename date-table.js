export const YEAR_LIMITS = Object.freeze({ min: 1900, max: 2198 });
export const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function checkOptions(year, term) {
  if (!Number.isInteger(year) || year < YEAR_LIMITS.min || year > YEAR_LIMITS.max) {
    throw new RangeError('学年起始年应为 1900—2198 之间的整数');
  }
  if (!['autumn-winter', 'spring-summer'].includes(term)) {
    throw new RangeError('学期应为秋冬或春夏');
  }
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function parseTeachingStart(value, start, end) {
  if (value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError('请输入有效的教学起点日期');
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('请输入有效的教学起点日期');
  }
  if (value < start || value > end) {
    throw new RangeError(`教学起点应在 ${start} 至 ${end} 之间`);
  }
  if (date.getUTCDay() !== 1) throw new RangeError('第一教学周须从周一开始');
  return date.getTime();
}

export function createDateTable(year, term, teachingStart = '') {
  checkOptions(year, term);
  const autumn = term === 'autumn-winter';
  const startYear = autumn ? year : year + 1;
  const startMonth = autumn ? 7 : 1;
  const endMonth = autumn ? 2 : 8;
  const endDay = autumn ? (isLeapYear(year + 1) ? 29 : 28) : 31;
  const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
  const end = `${year + 1}-${String(endMonth).padStart(2, '0')}-${endDay}`;
  const teachingStartTime = parseTeachingStart(teachingStart, start, end);
  const weeks = [];

  // 以 UTC 自然日推进, 保证时区和夏令时不改变日期及星期
  const cursor = new Date(`${start}T00:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= end) {
    const weekday = (cursor.getUTCDay() + 6) % 7;
    if (weeks.length === 0 || weekday === 0) weeks.push(new Array(7).fill(null));
    weeks[weeks.length - 1][weekday] = {
      date: cursor.toISOString().slice(0, 10),
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth() + 1,
      day: cursor.getUTCDate(),
    };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const months = [];
  for (const week of weeks) {
    const first = week.find(day => day !== null);
    const key = `${first.year}-${first.month}`;
    const last = months[months.length - 1];
    if (last?.key === key) last.columns += 1;
    else months.push({ key, label: `${first.year}年 ${first.month}月`, columns: 1 });
  }

  const teachingTerms = autumn ? ['秋', '冬'] : ['春', '夏'];
  const teachingWeeks = teachingStartTime === null ? null : weeks.map(week => {
    const first = week.find(day => day !== null);
    const offset = Math.floor((Date.parse(`${first.date}T00:00:00Z`) - teachingStartTime) / (7 * 86400000));
    return offset < 0 || offset >= 16 ? null : {
      term: teachingTerms[Math.floor(offset / 8)],
      week: offset % 8 + 1,
    };
  });

  return {
    start, end, weeks, months, teachingWeeks,
    title: `${year}—${year + 1} 学年 · ${autumn ? '秋冬' : '春夏'}学期`,
  };
}
