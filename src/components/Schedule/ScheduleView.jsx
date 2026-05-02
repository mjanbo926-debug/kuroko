import React, { useState } from 'react';
import { useApp } from '../../App';
import { ChevronLeft, ChevronRight, Clock, MapPin, NotebookPen, CheckCircle2, Pencil, X, Plus, Minus, Calendar } from 'lucide-react';
import { isJapaneseHoliday } from '../../utils/helpers';

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
    if ((p.absentDates || []).includes(dateStr)) return false; // お休み予定日
    if (p.visitSchedule === 'spot') return (p.spotDates || []).some(s => (s.date || s) === dateStr);
    if (p.type === 'fullTime' && holiday) return false; // 正社員先は祝日休み
    return (Array.isArray(p.visitDays) ? p.visitDays : []).includes(dayLabel);
  });
  const afterRemoval = normally.filter(p => !(ov.removed || []).includes(p.id));
  const added = (ov.added || [])
    .map(id => patients.find(p => p.id === id))
    .filter(Boolean)
    .filter(p => !afterRemoval.find(n => n.id === p.id));

  const getTime = (p) => {
    if (p.visitSchedule === 'spot') {
      const entry = (p.spotDates || []).find(s => (s.date || s) === dateStr);
      return entry?.time || '99:99';
    }
    return p.visitTimes?.[dayLabel] || p.visitTime || '99:99';
  };
  return [...afterRemoval, ...added].sort((a, b) => getTime(a).localeCompare(getTime(b)));
}

export default function ScheduleView() {
  const { patients, dailyReports, scheduleOverrides, saveScheduleOverrides, navigate } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
  const [filter, setFilter] = useState('all');
  const [editingDate, setEditingDate] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'list'

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
    return ov && ((ov.added?.length ?? 0) + (ov.removed?.length ?? 0)) > 0;
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
                const dayPatients = getEffectivePatients(filteredPatients, date, scheduleOverrides);
                const hasReport = !!getDailyReport(date);
                const hasOv = hasOverride(dateStr);
                return (
                  <div key={day} className={`flex flex-col w-36 border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50' : isPast ? 'bg-gray-50/50' : ''}`}>
                    {/* 日ヘッダー */}
                    <div className={`px-2 py-2 text-center border-b ${isToday ? 'bg-blue-600 text-white' : isHoliday ? 'bg-red-50' : i >= 5 ? 'bg-red-50' : 'bg-gray-50'}`}>
                      <div className={`text-xs font-bold ${isToday ? 'text-white' : (i >= 5 || isHoliday) ? 'text-red-500' : 'text-gray-600'}`}>{day}{isHoliday && !isToday ? '　祝' : ''}</div>
                      <div className={`text-sm font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>{date.getMonth() + 1}/{date.getDate()}</div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        {dayPatients.length > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isToday ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                            {dayPatients.length}名
                          </span>
                        )}
                        {hasReport && <span className="w-2 h-2 bg-green-400 rounded-full" title="日報済み" />}
                        {!hasReport && hasOv && <span className="w-2 h-2 bg-orange-400 rounded-full" />}
                      </div>
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
                          const time = p.visitTimes?.[dayLabel] || p.visitTime || '';
                          return (
                            <button key={p.id} onClick={() => navigate('patient-detail', { patient: p })}
                              className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                                p.status ? 'bg-gray-100 opacity-60' : isToday ? 'bg-blue-100 hover:bg-blue-200' : 'bg-white border border-gray-100 hover:bg-blue-50'}`}>
                              <div className="text-xs font-semibold text-gray-800 truncate">{p.name}</div>
                              {time && <div className="text-xs text-gray-400">{time}</div>}
                              {p.status && (
                                <div className={`text-xs font-medium ${p.status === 'hospitalized' ? 'text-red-500' : 'text-yellow-600'}`}>
                                  {p.status === 'rest' ? '休み' : p.status === 'hospitalized' ? '入院中' : p.statusNote || 'その他'}
                                </div>
                              )}
                            </button>
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
        return (
          <div className="bg-blue-600 text-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold">
                <Calendar size={18} />今日の訪問 — {todayPatients.length}名
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
          const dayPatients = getEffectivePatients(filteredPatients, date, scheduleOverrides);
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
                    {dailyReport && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 size={12} />日報済み {visitedCount != null ? `${visitedCount}/${dayPatients.length}名` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    dayPatients.length > 0
                      ? isToday ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      : 'text-gray-300'}`}>
                    {dayPatients.length > 0 ? `${dayPatients.length}名` : 'なし'}
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
                      return (
                        <PatientChip key={p.id} patient={p} visitRecord={visitRecord} dayLabel={dayLabel} dateStr={dateStr}
                          onClick={() => navigate('patient-detail', { patient: p })} />
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
                  <p className="text-xs text-gray-500 font-medium">この日の訪問患者を変更（曜日設定は変わりません）</p>

                  {/* 現在の訪問患者 */}
                  {dayPatients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-400">現在の訪問患者</p>
                      {dayPatients.map(p => {
                        const dayLabel = DAYS[JS_DAY_TO_IDX[date.getDay()]];
                        const normallyScheduled = (Array.isArray(p.visitDays) ? p.visitDays : []).includes(dayLabel);
                        const isAdded = !normallyScheduled;
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-800">{p.name}</span>
                              {p.visitTime && <span className="text-xs text-gray-400 ml-2">{p.visitTime}</span>}
                              {isAdded && <span className="text-xs text-blue-600 ml-2 font-medium">+この日のみ追加</span>}
                            </div>
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
                        p.visitSchedule === 'spot' ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700">{p.name}</span>
                          {p.visitSchedule === 'spot' && (
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
  rest: { label: '休み', cls: 'bg-yellow-100 text-yellow-700' },
  hospitalized: { label: '入院中', cls: 'bg-red-100 text-red-700' },
  other: { label: 'その他', cls: 'bg-gray-200 text-gray-600' },
};

function PatientChip({ patient, onClick, visitRecord, dark, dayLabel, dateStr }) {
  const statusInfo = patient.status ? STATUS_BADGE[patient.status] : null;
  const hasStatus = !!patient.status;
  const spotEntry = patient.visitSchedule === 'spot' && dateStr
    ? (patient.spotDates || []).find(s => (s.date || s) === dateStr)
    : null;
  const time = spotEntry?.time || (dayLabel && patient.visitTimes?.[dayLabel]) || patient.visitTime || '';

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
        hasStatus
          ? 'bg-gray-100 border border-gray-200 opacity-70 hover:opacity-90'
          : dark
            ? 'bg-blue-500 hover:bg-blue-400 text-white'
            : visitRecord
              ? visitRecord.visited
                ? 'bg-green-50 border border-green-100 hover:bg-green-100'
                : 'bg-orange-50 border border-orange-100 hover:bg-orange-100'
              : 'bg-gray-50 hover:bg-blue-50 border border-gray-100'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${dark && !hasStatus ? 'text-white' : 'text-gray-800'}`}>{patient.name}</span>
          <span className={`text-xs font-normal ${dark && !hasStatus ? 'text-blue-200' : 'text-gray-400'}`}>{patient.age}歳</span>
          {statusInfo && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusInfo.cls}`}>
              {statusInfo.label}{patient.statusNote ? `：${patient.statusNote}` : ''}
            </span>
          )}
          {visitRecord && !dark && !hasStatus && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              visitRecord.visited ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {visitRecord.visited ? '訪問済み' : '未訪問'}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-3 text-xs mt-0.5 ${dark && !hasStatus ? 'text-blue-100' : 'text-gray-500'}`}>
          {time && <span className="flex items-center gap-1"><Clock size={11} />{time}</span>}
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
