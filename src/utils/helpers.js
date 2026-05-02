const HOLIDAYS = new Set([
  // 2024
  '2024-01-01','2024-01-08','2024-02-11','2024-02-12','2024-02-23',
  '2024-03-20','2024-04-29','2024-05-03','2024-05-04','2024-05-05','2024-05-06',
  '2024-07-15','2024-08-11','2024-08-12','2024-09-16','2024-09-22','2024-09-23',
  '2024-10-14','2024-11-03','2024-11-04','2024-11-23',
  // 2025
  '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
  '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05','2025-05-06',
  '2025-07-21','2025-08-11','2025-09-15','2025-09-23',
  '2025-10-13','2025-11-03','2025-11-23','2025-11-24',
  // 2026
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23',
  '2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
  // 2027
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23',
  '2027-03-21','2027-03-22','2027-04-29','2027-05-03','2027-05-04','2027-05-05',
  '2027-07-19','2027-08-11','2027-09-20','2027-09-23',
  '2027-10-11','2027-11-03','2027-11-23',
]);

export function isJapaneseHoliday(dateStr) {
  return HOLIDAYS.has(dateStr);
}

export function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const ADL_OPTIONS = ['自立', '監視', '一部介助', '全介助', '不可', ''];
export const VISIT_DAYS = ['月', '火', '水', '木', '金', '土', '日'];
export const GENDER_OPTIONS = ['男性', '女性', 'その他'];

export const REPORT_LABELS = {
  'ft-experience': '体験報告書（正社員先）',
  'ft-monthly': '月次報告書（正社員先）',
  'pt-experience': '体験報告書（副業先）',
  'pt-sixmonth': '施術報告書（副業先）',
};
