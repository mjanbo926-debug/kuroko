import React, { useState } from 'react';
import { useApp } from '../../App';
import { ChevronLeft, ChevronRight, Clock, MapPin, NotebookPen, CheckCircle2, Pencil, X, Plus, Minus, Calendar, Ban, FlaskConical } from 'lucide-react';
import { isJapaneseHoliday, generateId } from '../../utils/helpers';

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const JS_DAY_TO_IDX = [6, 0, 1, 2, 3, 4, 5];

function getWeekDates(offsetWeeks) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayDiff + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 曜日デフォルト + 上書きを加味して、その日の訪問患者を返す
function getEffectivePatients(patients, date, overrides) {
  const dateStr = toDateStr(date);
  const dayLabel = DAYS[JS_DAY_TO_IDX[date.getDay()]];
  const ov = overrides[dateStr] || {};

  const holiday = isJapaneseHoliday(dateStr);
  const normally = patients.filter(p => {
    if (p.terminated) return false;
    if (p.visitSchedule === 'spot') return (p.spotDates || []).some(s => (s.date || s) === dateStr);
    if (p.type === 'fullTime' && holiday) return false;
    // spotDates・trialDates（体験日）は開始日前でも表示する
    if ((p.spotDates || []).some(s => (s.date || s) === dateStr)) return true;
    if ((p.trialDates || []).some(s => (s.date || s) === dateStr)) return true;
    // 開始日が設定されている場合、それより前の日は表示しない
    if (p.startDate && dateStr < p.startDate) return false;
    return (Array.isArray(p.visitDays) ? p.visitDays : []).includes(dayLabel);
  });
  const afterRemoval = normally.filter(p => !(ov.removed || []).includes(p.id));
  const added = (ov.added || [])
    .map(id => patients.find(p => p.id === id))
    .filter(Boolean)
    .filter(p => !afterRemoval.find(n => n.id === p.id));

  const getTime = (p) => {
    if (ov.timeOverrides?.[p.id]) return ov.timeOverrides[p.id];
    if (p.visitSchedule === 'spot') {
      const entry = (p.spotDates || []).find(s => (s.date || s) === dateStr);
      return entry?.time || '99:99';
    }
    // 定期患者のspotDate（体験日など）の時刻
    const spotEntry = (p.spotDates || []).find(s => (s.date || s) === dateStr);
    if (spotEntry) return spotEntry.time || '99:99';
    return p.visitTimes?.[dayLabel] || p.visitTime || '99:99';
  };
  return [...afterRemoval, ...added].sort((a, b) => getTime(a).localeCompare(getTime(b)));
}

export default function ScheduleView() {
  const { patients, dailyReports, scheduleOverrides, saveScheduleOverrides, savePatients, navigate, settings } = useApp();

  const getHolidayName = (dateStr) => {
    const holidays = settings?.holidays || [];
    return holidays.find(h => dateStr >= h.start && dateStr <= h.end)?.name || null;
  };
  const [weekOffset, setWeekOffset] = useState(0);
  const [filter, setFilter] = useState('all');
  const [editingDate, setEditingDate] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'list'
  const [absenceTarget, setAbsenceTarget] = useState(null); // { patientId, dateStr }
  const [editingTimeKey, setEditingTimeKey] = useState(null); // `${dateStr}-${patientId}`
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [trialForm, setTrialForm] = useState({ name: '', date: new Date().toISOString().split('T')[0], time: '', type: 'partTime', address: '', facility: '' });
  const [leaveForm, setLeaveForm] = useState({ type: 'full', start: '', end: '' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIdx = JS_DAY_TO_IDX[new Date().getDay()];

  const weekDates = getWeekDates(weekOffset);
  const filteredPatients = patients.filter(p => filter === 'all' || p.type === filter);

  const getDailyReport = (date) => dailyReports.find(r => r.date === toDateStr(date));

  // 上書きを更新するヘルパー
  const togglePatientForDate = (dateStr, patientId, currentlyScheduled) => {
    const ov = { ...(scheduleOverrides[dateStr] || {}) };
    const date = new Date(dateStr + 'T00:00:00');
    const dayLabel = DAYS[JS_DAY_TO_IDX[date.getDay()]];
    const patient = patients.find(p => p.id === patientId);
    const normallyScheduled = patient
      ? (Array.isArray(patient.visitDays) ? patient.visitDays : []).includes(dayLabel)
      : false;

    if (currentlyScheduled) {
      // 表示中 → 削除
      if (normallyScheduled) {
        ov.removed = [...new Set([...(ov.removed || []), patientId])];
        ov.added = (ov.added || []).filter(id => id !== patientId);
      } else {
        ov.added = (ov.added || []).filter(id => id !== patientId);
      }
    } else {
      // 未表示 → 追加
      if (normallyScheduled) {
        ov.removed = (ov.removed || []).filter(id => id !== patientId);
      } else {
        ov.added = [...new Set([...(ov.added || []), patientId])];
      }
    }

    // 上書きが空になったら削除
    const isEmpty = !(ov.added?.length) && !(ov.removed?.length);
    const newOverrides = { ...scheduleOverrides };
    if (isEmpty) delete newOverrides[dateStr];
    else newOverrides[dateStr] = ov;
    saveScheduleOverrides(newOverrides);
  };

  const hasOverride = (dateStr) => {
    const ov = scheduleOverrides[dateStr];
    if (!ov) return false;
    return !!(ov.paidLeave) || (
      (ov.added?.length ?? 0) +
      (ov.removed?.length ?? 0) +
      Object.keys(ov.timeOverrides || {}).length +
      Object.keys(ov.absences || {}).length
    ) > 0;
  };

  const setPaidLeave = (dateStr, leave) => {
    const ov = { ...(scheduleOverrides[dateStr] || {}) };
    const d = new Date(dateStr + 'T00:00:00');
    const dayLabel = DAYS[JS_DAY_TO_IDX[d.getDay()]];
    const dayPatients = getEffectivePatients(patients, d, scheduleOverrides);

    if (leave) {
      ov.paidLeave = leave;
      // 対象患者を自動でお休み（有給）に設定
      const absences = { ...(ov.absences || {}) };
      dayPatients.forEach(p => {
        const time = (ov.timeOverrides?.[p.id]) ||
          (p.visitSchedule === 'spot'
            ? (p.spotDates || []).find(s => (s.date || s) === dateStr)?.time
            : p.visitTimes?.[dayLabel] || p.visitTime) || '';
        const affected = leave.type === 'full' ||
          (time && leave.start && leave.end && time >= leave.start && time <= leave.end);
        if (affected) absences[p.id] = '有給';
      });
      ov.absences = absences;
    } else {
      // 有給解除時：有給で設定したお休みのみ解除
      if (ov.absences) {
        const absences = { ...ov.absences };
        Object.keys(absences).forEach(id => {
          if (absences[id] === '有給') delete absences[id];
        });
        if (Object.keys(absences).length > 0) ov.absences = absences;
        else delete ov.absences;
      }
      delete ov.paidLeave;
    }

    const isEmpty = !ov.paidLeave && !(ov.added?.length) && !(ov.removed?.length) &&
      !Object.keys(ov.timeOverrides || {}).length && !Object.keys(ov.absences || {}).length;
    const newOverrides = { ...scheduleOverrides };
    if (isEmpty) delete newOverrides[dateStr];
    else newOverrides[dateStr] = ov;
    saveScheduleOverrides(newOverrides);
  };

  // 患者が有給時間帯に該当するか判定
  const isPatientOnLeave = (p, dateStr) => {
    const leave = (scheduleOverrides[dateStr] || {}).paidLeave;
    if (!leave) return false;
    if (leave.type === 'full') return true;
    const d = new Date(dateStr + 'T00:00:00');
    const dayLabel = DAYS[JS_DAY_TO_IDX[d.getDay()]];
    const ov = scheduleOverrides[dateStr] || {};
    const time = ov.timeOverrides?.[p.id] ||
      (p.visitSchedule === 'spot'
        ? (p.spotDates || []).find(s => (s.date || s) === dateStr)?.time
        : p.visitTimes?.[dayLabel] || p.visitTime) || '';
    if (!time || !leave.start || !leave.end) return false;
    return time >= leave.start && time <= leave.end;
  };

  const setAbsence = (dateStr, patientId, reason) => {
    const ov = { ...(scheduleOverrides[dateStr] || {}) };
    if (reason) {
      ov.absences = { ...(ov.absences || {}), [patientId]: reason };
    } else {
      const absences = { ...(ov.absences || {}) };
      delete absences[patientId];
      if (Object.keys(absences).length > 0) ov.absences = absences;
      else delete ov.absences;
    }
    const isEmpty = !(ov.added?.length) && !(ov.removed?.length) &&
      !Object.keys(ov.timeOverrides || {}).length && !Object.keys(ov.absences || {}).length;
    const newOverrides = { ...scheduleOverrides };
    if (isEmpty) delete newOverrides[dateStr];
    else newOverrides[dateStr] = ov;
    saveScheduleOverrides(newOverrides);
  };

  const setTimeOverride = (dateStr, patientId, time) => {
    const ov = { ...(scheduleOverrides[dateStr] || {}) };
    const timeOverrides = { ...(ov.timeOverrides || {}) };
    if (time) timeOverrides[patientId] = time;
    else delete timeOverrides[patientId];
    if (Object.keys(timeOverrides).length > 0) ov.timeOverrides = timeOverrides;
    else delete ov.timeOverrides;
    const isEmpty = !(ov.added?.length) && !(ov.removed?.length) && !Object.keys(ov.timeOverrides || {}).length;
    const newOverrides = { ...scheduleOverrides };
    if (isEmpty) delete newOverrides[dateStr];
    else newOverrides[dateStr] = ov;
    saveScheduleOverrides(newOverrides);
  };

  const handleAddTrial = () => {
    if (!trialForm.name.trim() || !trialForm.date) return;
    const newPatient = {
      id: generateId(),
      name: trialForm.name.trim(),
      type: trialForm.type,
      visitSchedule: 'spot',
      isTrial: true,
      address: trialForm.address.trim(),
      facility: trialForm.facility.trim(),
      spotDates: [{ date: trialForm.date, time: trialForm.time }],
      createdAt: new Date().toISOString(),
    };
    savePatients([...patients, newPatient]);
    setShowTrialForm(false);
    setTrialForm({ name: '', date: new Date().toISOString().split('T')[0], time: '', type: 'partTime', address: '', facility: '' });
  };

  const monthLabel = (() => {
    const months = weekDates.map(d => d.getMonth() + 1);
    const unique = [...new Set(months)];
    return unique.length === 1
      ? `${weekDates[0].getFullYear()}年${unique[0]}月`
      : `${weekDates[0].getFullYear()}年${unique[0]}月〜${unique[1]}月`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">訪問スケジュール</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTrialForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors">
            <FlaskConical size={14} />＋ 体験
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)}
              className="text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100">
              今週に戻る
            </button>
          )}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
              週ビュー
            </button>
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
              一覧
            </button>
          </div>
        </div>
      </div>

      {/* 体験追加フォーム */}
      {showTrialForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowTrialForm(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <FlaskConical size={18} className="text-amber-500" />体験を追加
              </div>
              <button onClick={() => setShowTrialForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">名前 *</label>
                <input value={trialForm.name} onChange={e => setTrialForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：山田 花子"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">日付 *</label>
                <input type="date" value={trialForm.date} onChange={e => setTrialForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">時間</label>
                <input type="time" value={trialForm.time} onChange={e => setTrialForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">施設名</label>
                <input value={trialForm.facility} onChange={e => setTrialForm(f => ({ ...f, facility: e.target.value }))}
                  placeholder="例：〇〇老人ホーム"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">住所</label>
                <input value={trialForm.address} onChange={e => setTrialForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="例：大阪府〇〇市..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-2">種別</label>
                <div className="flex gap-2">
                  {[['fullTime', '正社員先'], ['partTime', '副業先']].map(([val, label]) => (
                    <button key={val} onClick={() => setTrialForm(f => ({ ...f, type: val }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        trialForm.type === val ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddTrial} disabled={!trialForm.name.trim() || !trialForm.date}
              className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors disabled:opacity-40">
              スケジュールに追加
            </button>
          </div>
        </div>
      )}

      {/* 週ナビゲーション */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-xl hover:bg-gray-100">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="text-center">
            <div className="font-semibold text-gray-800 text-sm">{monthLabel}</div>
            <div className="text-xs text-gray-400">
              {weekOffset === 0 ? '今週' : weekOffset === 1 ? '来週' : weekOffset === -1 ? '先週' : `${weekOffset > 0 ? '+' : ''}${weekOffset}週`}
            </div>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-xl hover:bg-gray-100">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* 週グリッドビュー */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="flex min-w-max">
              {DAYS.map((day, i) => {
                const date = weekDates[i];
                const dateStr = toDateStr(date);
                const isToday = date.getTime() === today.getTime();
                const isPast = date < today;
                const isHoliday = isJapaneseHoliday(dateStr);
                const holidayName = getHolidayName(dateStr);
                const dayPatients = getEffectivePatients(filteredPatients, date, scheduleOverrides);
                const activeCount = holidayName ? 0 : dayPatients.filter(p =>
                  !p.status &&
                  !(p.consentObtained === false && !p.isTrial && dateStr >= toDateStr(today)) &&
                  !(p.absentDates || []).includes(dateStr) &&
                  !(scheduleOverrides[dateStr] || {}).absences?.[p.id] &&
                  !isPatientOnLeave(p, dateStr)
                ).length;
                const hasReport = !!getDailyReport(date);
                const hasOv = hasOverride(dateStr);
                return (
                  <div key={day} className={`flex flex-col w-36 border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50' : isPast ? 'bg-gray-50/50' : ''}`}>
                    {/* 日ヘッダー */}
                    <div className={`px-2 py-2 text-center border-b ${isToday ? 'bg-blue-600 text-white' : isHoliday ? 'bg-red-50' : i >= 5 ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <div className={`text-xs font-bold ${isToday ? 'text-white' : (i >= 5 || isHoliday) ? 'text-red-500' : 'text-gray-600'}`}>{day}{isHoliday && !isToday ? '　祝' : ''}</div>
                      <div className={`text-sm font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>{date.getMonth() + 1}/{date.getDate()}</div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        {activeCount > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isToday ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                            {activeCount}名
                          </span>
                        )}
                        {hasReport && <span className="w-2 h-2 bg-green-400 rounded-full" title="日報済み" />}
                        {!hasReport && hasOv && <span className="w-2 h-2 bg-orange-400 rounded-full" />}
                      </div>
                      {holidayName && (
                        <div className="text-[10px] font-bold text-rose-700 bg-rose-100 rounded px-1 mt-0.5 truncate">{holidayName}</div>
                      )}
                      {!holidayName && scheduleOverrides[dateStr]?.paidLeave && (
                        <div className="text-[10px] font-bold text-yellow-700 bg-yellow-100 rounded px-1 mt-0.5">
                          {scheduleOverrides[dateStr].paidLeave.type === 'full'
                            ? '有給（終日）'
                            : `有給 ${scheduleOverrides[dateStr].paidLeave.start}〜${scheduleOverrides[dateStr].paidLeave.end}`}
                        </div>
                      )}
                    </div>
                    {/* 患者リスト */}
                    <div className="flex flex-col gap-1 p-1.5 min-h-16">
                      {dayPatients.length === 0 ? (
                        <div className="flex items-center justify-center h-10">
                          <span className="text-xs text-gray-300">なし</span>
                        </div>
                      ) : (
                        dayPatients.map(p => {
                          const dayLabel = DAYS[JS_DAY_TO_IDX[date.getDay()]];
                          const timeOverride = (scheduleOverrides[dateStr] || {}).timeOverrides?.[p.id];
                          const time = timeOverride || (p.visitSchedule === 'spot'
                            ? (p.spotDates || []).find(s => (s.date || s) === dateStr)?.time || ''
                            : p.visitTimes?.[dayLabel] || p.visitTime || '');
                          const timeKey = `${dateStr}-${p.id}`;
                          const isEditingTime = editingTimeKey === timeKey;
                          const isTrialDate = !p.isTrial && (p.trialDates || []).some(s => (s.date || s) === dateStr);
                          const showTrial = p.isTrial || isTrialDate;
                          const todayStr = toDateStr(today);
                          const consentPending = p.consentObtained === false && !p.isTrial && dateStr >= todayStr;
                          return (
                            <div key={p.id}
                              className={`w-full px-2 py-1.5 rounded-lg ${
                                p.status ? 'bg-gray-100 opacity-60' : consentPending ? 'bg-gray-100' : showTrial ? 'bg-amber-100' : isToday ? 'bg-blue-100' : 'bg-white border border-gray-100'}`}
                              style={
                                consentPending && !p.status ? { borderLeft: '4px solid #9ca3af', borderTop: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }
                                : showTrial && !p.status ? { borderLeft: '4px solid #f59e0b', borderTop: '1px solid #fde68a', borderRight: '1px solid #fde68a', borderBottom: '1px solid #fde68a' }
                                : {}}>
                              <div
                                onClick={() => navigate('patient-detail', { patient: p })}
                                className="text-xs font-semibold text-gray-800 truncate cursor-pointer active:opacity-60 flex items-center gap-1">
                                <span className={`truncate ${consentPending ? 'text-gray-500' : ''}`}>{p.name}</span>
                                {consentPending && (
                                  <span className="shrink-0 text-[10px] bg-gray-400 text-white px-1.5 py-0.5 rounded-full font-bold">同意書待ち</span>
                                )}
                                {!consentPending && showTrial && (
                                  <span className="shrink-0 text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold tracking-wide">体験</span>
                                )}
                                {(p.confirmItems || []).some(i => !i.done) && (
                                  <span className="shrink-0 w-2 h-2 rounded-full bg-orange-400" title="確認事項あり" />
                                )}
                              </div>
                              {isEditingTime ? (
                                <input
                                  type="time"
                                  defaultValue={time}
                                  autoFocus
                                  onChange={e => setTimeOverride(dateStr, p.id, e.target.value)}
                                  onBlur={() => setEditingTimeKey(null)}
                                  className="text-xs border border-orange-300 rounded px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-orange-400 mt-0.5"
                                />
                              ) : (
                                <div
                                  onClick={() => !p.status && setEditingTimeKey(timeKey)}
                                  className={`text-xs cursor-pointer mt-0.5 ${timeOverride ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                                  {time ? `${time}${timeOverride ? ' ★' : ''}` : <span className="text-gray-300">- 時間</span>}
                                </div>
                              )}
                              {p.status && (
                                <div className={`text-xs font-medium ${p.status === 'hospitalized' ? 'text-red-500' : 'text-gray-500'}`}>
                                  {p.status === 'hospitalized' ? '入院中' : p.statusNote || 'その他'}
                                </div>
                              )}
                              {!p.status && (() => {
                                if (holidayName) return <div className="text-xs font-medium text-rose-500">お休み（{holidayName}）</div>;
                                const absReason = (scheduleOverrides[dateStr] || {}).absences?.[p.id];
                                const isAbsent = absReason || (p.absentDates || []).includes(dateStr);
                                if (!isAbsent) return null;
                                return (
                                  <div className="text-xs font-medium text-orange-500">
                                    {absReason ? `お休み（${absReason}）` : 'お休み'}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {/* 日報ボタン */}
                    {dayPatients.length > 0 && (
                      <div className="px-1.5 pb-1.5">
                        <button onClick={() => navigate('daily-report', { date: dateStr })}
                          className={`w-full text-xs py-1 rounded-lg font-medium transition-colors ${
                            hasReport ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                          {hasReport ? '日報済み' : '日報'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* フィルター（共通） */}
      <div className="flex gap-2">
        {[['all', 'すべて'], ['fullTime', '正社員先'], ['partTime', '副業先']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === val ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 今日のハイライト（一覧ビューのみ） */}
      {viewMode === 'list' && weekOffset === 0 && (() => {
        const todayDate = weekDates[todayIdx];
        const todayPatients = getEffectivePatients(filteredPatients, todayDate, scheduleOverrides);
        if (todayPatients.length === 0) return null;
        const todayDateStr = toDateStr(todayDate);
        const todayActiveCount = todayPatients.filter(p =>
          !p.status &&
          !(p.consentObtained === false && !p.isTrial) &&
          !(p.absentDates || []).includes(todayDateStr) &&
          !(scheduleOverrides[todayDateStr] || {}).absences?.[p.id] &&
          !isPatientOnLeave(p, todayDateStr)
        ).length;
        return (
          <div className="bg-blue-600 text-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold">
                <Calendar size={18} />今日の訪問 — {todayActiveCount}名
              </div>
              <button
                onClick={() => navigate('daily-report', { date: toDateStr(todayDate) })}
                className="flex items-center gap-1.5 bg-white text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50">
                <NotebookPen size={14} />
                {getDailyReport(todayDate) ? '日報を編集' : '日報を記入'}
              </button>
            </div>
            <div className="space-y-1.5">
              {todayPatients.map(p => (
                <PatientChip key={p.id} patient={p} onClick={() => navigate('patient-detail', { patient: p })} dark />
              ))}
            </div>
          </div>
        );
      })()}

      {/* 曜日ごとリスト（一覧ビューのみ） */}
      {viewMode === 'list' &&
      <div className="space-y-3">
        {DAYS.map((day, i) => {
          const date = weekDates[i];
          const dateStr = toDateStr(date);
          const isToday = date.getTime() === today.getTime();
          const isPast = date < today;
          const isHoliday = isJapaneseHoliday(dateStr);
          const holidayNameList = getHolidayName(dateStr);
          const dayPatients = getEffectivePatients(filteredPatients, date, scheduleOverrides);
          const listActiveCount = holidayNameList ? 0 : dayPatients.filter(p =>
            !p.status &&
            !(p.consentObtained === false && !p.isTrial && dateStr >= toDateStr(today)) &&
            !(p.absentDates || []).includes(dateStr) &&
            !(scheduleOverrides[dateStr] || {}).absences?.[p.id] &&
            !isPatientOnLeave(p, dateStr)
          ).length;
          const dailyReport = getDailyReport(date);
          const visitedCount = dailyReport?.visits?.filter(v => v.visited).length;
          const isEditing = editingDate === dateStr;
          const hasOv = hasOverride(dateStr);

          // 編集パネル：この日にいない患者リスト
          const unscheduled = filteredPatients.filter(p => !dayPatients.find(d => d.id === p.id));

          return (
            <div key={day}
              className={`bg-white rounded-2xl shadow-sm border transition-all ${
                isToday ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-100'}`}>
              {/* 日ヘッダー */}
              <div className={`flex items-center gap-3 px-4 py-3 ${
                isToday ? 'bg-blue-50 rounded-t-2xl' : isHoliday ? 'bg-red-50 rounded-t-2xl' : isPast ? 'bg-gray-50 rounded-t-2xl' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isToday ? 'bg-blue-600 text-white' : i >= 5 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-700'}`}>
                  {day}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${isToday ? 'text-blue-800' : 'text-gray-700'}`}>
                      {date.getMonth() + 1}/{date.getDate()}（{day}）
                    </span>
                    {isToday && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">今日</span>}
                    {isHoliday && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">祝</span>}
                    {hasOv && !isEditing && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">変更あり</span>
                    )}
                    {holidayNameList && (
                      <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">{holidayNameList}</span>
                    )}
                    {!holidayNameList && scheduleOverrides[dateStr]?.paidLeave && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                        {scheduleOverrides[dateStr].paidLeave.type === 'full'
                          ? '有給（終日）'
                          : `有給 ${scheduleOverrides[dateStr].paidLeave.start}〜${scheduleOverrides[dateStr].paidLeave.end}`}
                      </span>
                    )}
                    {dailyReport && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 size={12} />日報済み {visitedCount != null ? `${visitedCount}/${listActiveCount}名` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    listActiveCount > 0
                      ? isToday ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      : 'text-gray-300'}`}>
                    {listActiveCount > 0 ? `${listActiveCount}名` : 'なし'}
                  </span>
                  {/* 編集ボタン */}
                  <button
                    onClick={() => setEditingDate(isEditing ? null : dateStr)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isEditing ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                    {isEditing ? <X size={16} /> : <Pencil size={15} />}
                  </button>
                  {dayPatients.length > 0 && !isEditing && (
                    <button
                      onClick={() => navigate('daily-report', { date: dateStr })}
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                        dailyReport
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'}`}>
                      <NotebookPen size={13} />{dailyReport ? '編集' : '日報'}
                    </button>
                  )}
                </div>
              </div>

              {/* 患者リスト */}
              {!isEditing && (
                dayPatients.length > 0 ? (
                  <div className="px-4 pb-3 space-y-2 mt-2">
                    {dayPatients.map(p => {
                      const visitRecord = dailyReport?.visits?.find(v => v.patientId === p.id);
                      const dayLabel = DAYS[JS_DAY_TO_IDX[date.getDay()]];
                      const timeOverride = (scheduleOverrides[dateStr] || {}).timeOverrides?.[p.id];
                      const absenceReason = holidayNameList || (scheduleOverrides[dateStr] || {}).absences?.[p.id];
                      const isAbsenceTarget = !holidayNameList && absenceTarget?.patientId === p.id && absenceTarget?.dateStr === dateStr;
                      return (
                        <div key={p.id} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <PatientChip patient={p} visitRecord={visitRecord} dayLabel={dayLabel} dateStr={dateStr}
                                timeOverride={timeOverride} absenceReason={absenceReason}
                                onClick={() => navigate('patient-detail', { patient: p })} />
                            </div>
                            {!holidayNameList && (
                              <button
                                onClick={() => setAbsenceTarget(isAbsenceTarget ? null : { patientId: p.id, dateStr })}
                                className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                                  absenceReason
                                    ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                    : isAbsenceTarget
                                      ? 'bg-orange-400 text-white'
                                      : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500'}`}>
                                <Ban size={12} />{absenceReason ? '休み' : 'お休み'}
                              </button>
                            )}
                          </div>
                          {isAbsenceTarget && (
                            <div className="flex gap-2 flex-wrap ml-1">
                              {['体調不良', '通院', 'その他'].map(reason => (
                                <button key={reason}
                                  onClick={() => { setAbsence(dateStr, p.id, reason); setAbsenceTarget(null); }}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                    absenceReason === reason
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}>
                                  {reason}
                                </button>
                              ))}
                              {absenceReason && (
                                <button onClick={() => { setAbsence(dateStr, p.id, null); setAbsenceTarget(null); }}
                                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-500 hover:bg-gray-200">
                                  解除
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 pb-3 pt-1">
                    <p className="text-xs text-gray-300 text-center py-1">訪問予定なし</p>
                  </div>
                )
              )}

              {/* 編集パネル */}
              {isEditing && (
                <div className="px-4 pb-4 mt-2 space-y-3">
                  {/* 有給休暇設定 */}
                  {(() => {
                    const currentLeave = scheduleOverrides[dateStr]?.paidLeave;
                    const lf = currentLeave || leaveForm;
                    return (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-semibold text-yellow-800">有給休暇</p>
                        <div className="flex gap-2">
                          {[['full', '終日'], ['time', '時間指定']].map(([val, label]) => (
                            <button key={val} onClick={() => setLeaveForm(f => ({ ...f, type: val }))}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                lf.type === val ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                        {lf.type === 'time' && (
                          <div className="flex items-center gap-2">
                            <input type="time" value={lf.start || ''} onChange={e => setLeaveForm(f => ({ ...f, start: e.target.value }))}
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400" />
                            <span className="text-xs text-gray-500">〜</span>
                            <input type="time" value={lf.end || ''} onChange={e => setLeaveForm(f => ({ ...f, end: e.target.value }))}
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (lf.type === 'time' && (!lf.start || !lf.end)) return;
                              setPaidLeave(dateStr, { type: lf.type, start: lf.start, end: lf.end });
                            }}
                            className="flex-1 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 transition-colors">
                            設定する
                          </button>
                          {currentLeave && (
                            <button onClick={() => setPaidLeave(dateStr, null)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">
                              解除
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {/* 現在の訪問患者・追加（有給終日のときは非表示） */}
                  {scheduleOverrides[dateStr]?.paidLeave?.type !== 'full' && <>
                  <p className="text-xs text-gray-500 font-medium">この日の訪問患者を変更（曜日設定は変わりません）</p>

                  {/* 現在の訪問患者 */}
                  {dayPatients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-400">現在の訪問患者</p>
                      {dayPatients.map(p => {
                        const dayLabel = DAYS[JS_DAY_TO_IDX[date.getDay()]];
                        const normallyScheduled = (Array.isArray(p.visitDays) ? p.visitDays : []).includes(dayLabel);
                        const isAdded = !normallyScheduled;
                        const ov = scheduleOverrides[dateStr] || {};
                        const timeOverride = ov.timeOverrides?.[p.id] || '';
                        const defaultTime = p.visitSchedule === 'spot'
                          ? (p.spotDates || []).find(s => (s.date || s) === dateStr)?.time || ''
                          : p.visitTimes?.[dayLabel] || p.visitTime || '';
                        return (
                          <div key={p.id} className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-800">{p.name}</span>
                              {isAdded && <span className="text-xs text-blue-600 ml-2 font-medium">+この日のみ追加</span>}
                            </div>
                            <input
                              type="time"
                              value={timeOverride || defaultTime}
                              onChange={e => setTimeOverride(dateStr, p.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 shrink-0"
                            />
                            <button
                              onClick={() => togglePatientForDate(dateStr, p.id, true)}
                              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                              <Minus size={14} />外す
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 追加できる患者 */}
                  {unscheduled.length > 0 && (() => {
                    const spotPts = unscheduled.filter(p => p.visitSchedule === 'spot');
                    const regularPts = unscheduled.filter(p => p.visitSchedule !== 'spot');
                    const renderRow = (p) => (
                      <div key={p.id} className={`flex items-center gap-3 p-3 border rounded-xl ${
                        p.isTrial ? 'bg-amber-50 border-amber-100' : p.visitSchedule === 'spot' ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700">{p.name}</span>
                          {p.isTrial && (
                            <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">体験</span>
                          )}
                          {p.visitSchedule === 'spot' && !p.isTrial && (
                            <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">スポット</span>
                          )}
                          <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${
                            p.type === 'fullTime' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {p.type === 'fullTime' ? '正' : '副'}
                          </span>
                        </div>
                        <button
                          onClick={() => togglePatientForDate(dateStr, p.id, false)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors shrink-0">
                          <Plus size={14} />追加
                        </button>
                      </div>
                    );
                    return (
                      <div className="space-y-1.5">
                        {spotPts.length > 0 && (
                          <>
                            <p className="text-xs text-purple-500 font-medium">スポット患者</p>
                            {spotPts.map(renderRow)}
                            {regularPts.length > 0 && <p className="text-xs text-gray-400 pt-1">その他の患者</p>}
                          </>
                        )}
                        {spotPts.length === 0 && <p className="text-xs text-gray-400">追加できる患者</p>}
                        {regularPts.map(renderRow)}
                      </div>
                    );
                  })()}

                  {filteredPatients.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">患者が登録されていません</p>
                  )}
                  </>}

                  {/* リセット */}
                  {hasOv && (
                    <button
                      onClick={() => {
                        const newOverrides = { ...scheduleOverrides };
                        delete newOverrides[dateStr];
                        saveScheduleOverrides(newOverrides);
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      この日の変更をリセット
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </div>
  );
}

const STATUS_BADGE = {
  hospitalized: { label: '入院中', cls: 'bg-red-100 text-red-700' },
  other: { label: 'その他', cls: 'bg-gray-200 text-gray-600' },
};

function PatientChip({ patient, onClick, visitRecord, dark, dayLabel, dateStr, timeOverride, absenceReason }) {
  const statusInfo = patient.status ? STATUS_BADGE[patient.status] : null;
  const hasStatus = !!patient.status;
  const isAbsentToday = !!absenceReason || (dateStr ? (patient.absentDates || []).includes(dateStr) : false);
  const isTrialDate = !patient.isTrial && dateStr && (patient.trialDates || []).some(s => (s.date || s) === dateStr);
  const showTrial = patient.isTrial || isTrialDate;
  const chipTodayStr = new Date().toISOString().split('T')[0];
  const consentPending = patient.consentObtained === false && !patient.isTrial && (!dateStr || dateStr >= chipTodayStr);
  const spotEntry = patient.visitSchedule === 'spot' && dateStr
    ? (patient.spotDates || []).find(s => (s.date || s) === dateStr)
    : null;
  const time = timeOverride || spotEntry?.time || (dayLabel && patient.visitTimes?.[dayLabel]) || patient.visitTime || '';

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
        hasStatus || isAbsentToday
          ? 'bg-gray-100 border border-gray-200 opacity-70 hover:opacity-90'
          : consentPending
            ? 'bg-gray-100 hover:bg-gray-200'
            : showTrial
              ? 'bg-amber-100 hover:bg-amber-200'
              : dark
                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                : visitRecord
                  ? visitRecord.visited
                    ? 'bg-green-50 border border-green-100 hover:bg-green-100'
                    : 'bg-orange-50 border border-orange-100 hover:bg-orange-100'
                  : 'bg-gray-50 hover:bg-blue-50 border border-gray-100'}`}
      style={
        consentPending && !hasStatus && !isAbsentToday ? { borderLeft: '4px solid #9ca3af', borderTop: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }
        : showTrial && !hasStatus && !isAbsentToday ? { borderLeft: '4px solid #f59e0b', borderTop: '1px solid #fde68a', borderRight: '1px solid #fde68a', borderBottom: '1px solid #fde68a' }
        : {}}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${dark && !hasStatus ? 'text-white' : consentPending ? 'text-gray-500' : 'text-gray-800'}`}>{patient.name}</span>
          <span className={`text-xs font-normal ${dark && !hasStatus ? 'text-blue-200' : 'text-gray-400'}`}>{patient.age}歳</span>
          {statusInfo && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusInfo.cls}`}>
              {statusInfo.label}{patient.statusNote ? `：${patient.statusNote}` : ''}
            </span>
          )}
          {absenceReason && !hasStatus && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
              お休み（{absenceReason}）
            </span>
          )}
          {!absenceReason && isAbsentToday && !hasStatus && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">お休み</span>
          )}
          {consentPending && !hasStatus && !isAbsentToday && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-400 text-white">同意書待ち</span>
          )}
          {!consentPending && showTrial && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white tracking-wide">体験</span>
          )}
          {visitRecord && !dark && !hasStatus && !isAbsentToday && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              visitRecord.visited ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {visitRecord.visited ? '訪問済み' : '未訪問'}
            </span>
          )}
          {(patient.confirmItems || []).some(i => !i.done) && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
              ！確認{(patient.confirmItems || []).filter(i => !i.done).length}件
            </span>
          )}
        </div>
        <div className={`flex items-center gap-3 text-xs mt-0.5 ${dark && !hasStatus ? 'text-blue-100' : 'text-gray-500'}`}>
          {time && <span className={`flex items-center gap-1 ${timeOverride ? 'text-orange-500 font-medium' : ''}`}><Clock size={11} />{time}{timeOverride ? '★' : ''}</span>}
          {patient.address && <span className="flex items-center gap-1 truncate"><MapPin size={11} /><span className="truncate">{patient.address}</span></span>}
        </div>
      </div>
      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
        dark && !hasStatus ? 'bg-blue-400 text-white'
          : patient.type === 'fullTime' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
        {patient.type === 'fullTime' ? '正' : '副'}
      </span>
    </button>
  );
}
