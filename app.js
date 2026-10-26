import { createDateTable, YEAR_LIMITS, WEEKDAY_NAMES } from './date-table.js';

const form = document.querySelector('#options');
const yearField = document.querySelector('#year');
const yearEnd = document.querySelector('#year-end');
const teachingStartField = document.querySelector('#teaching-start');
const errorMessage = document.querySelector('#options-error');
const table = document.querySelector('#dates');
const scrollArea = document.querySelector('#date-scroll');

function node(tag, text, className) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function readYear() {
  const value = yearField.value.trim();
  const year = Number(value);
  return /^\d{4}$/.test(value) && year >= YEAR_LIMITS.min && year <= YEAR_LIMITS.max ? year : null;
}

function clearError() {
  errorMessage.hidden = true;
  errorMessage.textContent = '';
  for (const field of [yearField, teachingStartField]) {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }
}

function showError(field, message) {
  clearError();
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', errorMessage.id);
  field.focus();
}

function updateYearLabel() {
  const year = readYear();
  yearEnd.textContent = year === null ? '— 学年' : `— ${year + 1} 学年`;
}

function showDateTable(data) {
  document.querySelector('#table-title').textContent = data.title;
  document.querySelector('#table-summary').textContent = `${data.start} 至 ${data.end}`;
  const caption = node('caption', `${data.title}日期表`, 'sr-only');
  const columns = document.createDocumentFragment();
  const weekdays = node('colgroup');
  weekdays.append(node('col', undefined, 'weekday-column'));
  columns.append(weekdays);
  for (const month of data.months) {
    const group = node('colgroup');
    const column = node('col', undefined, 'week-column');
    column.span = month.columns;
    group.append(column);
    columns.append(group);
  }

  const head = node('thead');
  const monthRow = node('tr');
  const corner = node('th', '星期', 'weekday');
  corner.scope = 'col';
  monthRow.append(corner);
  for (const month of data.months) {
    const heading = node('th', month.label);
    heading.colSpan = month.columns;
    heading.scope = 'colgroup';
    monthRow.append(heading);
  }
  head.append(monthRow);
  let firstTeachingHeading = null;
  if (data.teachingWeeks) {
    const weekRow = node('tr', undefined, 'teaching-weeks');
    const label = node('th', '教学周', 'weekday');
    label.scope = 'row';
    weekRow.append(label);
    for (const teaching of data.teachingWeeks) {
      const heading = node('th', teaching ? `${teaching.term} ${teaching.week}` : '');
      heading.scope = 'col';
      if (teaching) {
        heading.setAttribute('aria-label', `${teaching.term}学期第 ${teaching.week} 教学周`);
        firstTeachingHeading ??= heading;
      }
      weekRow.append(heading);
    }
    head.append(weekRow);
  }

  const body = node('tbody');
  WEEKDAY_NAMES.forEach((name, rowIndex) => {
    const row = node('tr');
    if (rowIndex > 4) row.className = 'weekend';
    const weekdayHeading = node('th', name, 'weekday');
    weekdayHeading.scope = 'row';
    row.append(weekdayHeading);
    for (let column = 0; column < data.weeks.length; column += 1) {
      const day = data.weeks[column][rowIndex];
      const cell = node('td');
      if (day === null) {
        cell.className = 'outside';
        cell.setAttribute('aria-label', '日期范围外');
      } else {
        cell.className = day.month % 2 === 0 ? 'month-tint' : 'month-plain';
        const previousColumn = data.weeks[column - 1]?.[rowIndex];
        const previousRow = data.weeks[column][rowIndex - 1];
        if (previousColumn && previousColumn.month !== day.month) cell.classList.add('month-left');
        if (previousRow && previousRow.month !== day.month) cell.classList.add('month-top');

        const description = `${day.year}年${day.month}月${day.day}日 ${name}`;
        const date = node('time');
        date.dateTime = day.date;
        date.setAttribute('aria-label', description);
        cell.title = description;
        date.append(node('span', String(day.day), 'day-number'));
        if (day.day === 1) date.append(node('small', `${day.month}月`, 'month-label'));
        cell.append(date);
      }
      row.append(cell);
    }
    body.append(row);
  });
  table.replaceChildren(caption, columns, head, body);
  table.style.width = `${56 + data.weeks.length * 42}px`;
  scrollArea.scrollLeft = 0;
  if (firstTeachingHeading) {
    const weekdayRight = corner.getBoundingClientRect().right;
    scrollArea.scrollLeft = firstTeachingHeading.getBoundingClientRect().left - weekdayRight;
  }
}

yearField.addEventListener('input', updateYearLabel);
form.addEventListener('submit', event => {
  event.preventDefault();
  const year = readYear();
  if (year === null) {
    showError(yearField, '请输入 1900—2198 之间的四位整数年份');
    return;
  }
  if (teachingStartField.validity.badInput) {
    showError(teachingStartField, '请输入完整有效的教学起点日期');
    return;
  }
  const term = form.querySelector('input[name="term"]:checked').value;
  let data;
  try {
    data = createDateTable(year, term, teachingStartField.value);
  } catch (error) {
    showError(teachingStartField, error.message);
    return;
  }
  clearError();
  showDateTable(data);
});

const now = new Date();
const inSpring = now.getMonth() < 6;
const initialYear = Math.min(YEAR_LIMITS.max, Math.max(YEAR_LIMITS.min, now.getFullYear() - (inSpring ? 1 : 0)));
const initialTerm = inSpring ? 'spring-summer' : 'autumn-winter';
yearField.value = String(initialYear);
form.querySelector(`input[value="${initialTerm}"]`).checked = true;
updateYearLabel();
showDateTable(createDateTable(initialYear, initialTerm));
