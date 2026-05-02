import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { generateId, localDateStr } from '../../utils/helpers';
import { Check, X, ChevronDown, ChevronUp, Save, FileText, User } from 'lucide-react';

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const JS_DAY_TO_IDX = [6, 0, 1, 2, 3, 4, 5];

function getDayLabel(dateStr) {
  const d = new Date(dateStr);
  const idx = JS_DAY_TO_IDX[d.getDay()];
  return DAYS[idx];
}

function formatDateJP(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${getDayLabel(dateStr)}）`;
}

function getPatientsForDate(patients, dateStr, overrides) {
  const dayLabel = getDayLabel(dateStr);
  const ov = (overrides || {})[dateStr] || {};
  const normally = patients.filter(p =>
    (Array.isArray(p.visitDays) ? p.visitDays : []).includes(dayLabel)
  );
  const afterRemoval = normally.filter(p => !(ov.removed || []).includes(p.id));
  const added = (ov.added || [])
    .map(id => patients.find(p => p.id === id))
    .filter(Boolean)
    .filter(p => !afterRemoval.find(n => n.id === p.id));
  return [...afterRemoval, ...added];
}

export default function DailyReport() {
  const { selectedDate, patients, dailyReports, saveDailyReports, scheduleOverrides, navigate } = useApp();

  const date = selectedDate || localDateStr();
  const scheduledPatients = getPatientsForDate(patients, date, scheduleOverrides);

  // 既存の日報があれば読み込む
  const existing = dailyReports.find(r => r.date === date);

  const initVisits = () =>
    scheduledPatients.map(p => {
      const saved = existing?.visits?.find(v => v.patientId === p.id);
      return {
        patientId: p.id,
        visited: saved?.visited ?? true,
        condition: saved?.condition ?? '',
        notes: saved?.notes ?? '',
        reaction: saved?.reaction ?? '',
        absent: saved?.absent ?? '',
      };
    });

  const [visits, setVisits] = useState(initVisits);
  const [generalNotes, setGeneralNotes] = useState(existing?.generalNotes ?? '');
  const [expanded, setExpanded] = useState({});
  const [saved, setSaved] = useState(false);

  // 未スケジュール患者の追加分（既存日報に含まれる）
  const extraVisits = existing?.visits?.filter(
    v => !scheduledPatients.find(p => p.id === v.patientId)
  ) ?? [];

  const setVisit = (patientId, key, val) => {
    setVisits(vs => vs.map(v => v.patientId === patientId ? { ...v, [key]: val } : v));
    setSaved(false);
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const handleSave = () => {
    const report = {
      id: existing?.id || generateId(),
      date,
      visits: [...visits, ...extraVisits],
      generalNotes,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = existing
      ? dailyReports.map(r => r.date === date ? report : r)
      : [...dailyReports, report];
    saveDailyReports(updated);
    setSaved(true);
    setTimeout(() => navigate('schedule'), 1500);
  };

  const visitedCount = visits.filter(v => v.visited).length;
  const isToday = date === localDateStr();

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-800">日報</h2>
            {isToday && (
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">今日</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{formatDateJP(date)}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-blue-600">{visitedCount}<span className="text-base font-normal text-gray-400">/{scheduledPatients.length}</span></div>
          <div className="text-xs text-gray-400">訪問済み</div>
        </div>
      </div>

      {/* 進捗バー */}
      {scheduledPatients.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>訪問進捗</span>
            <span>{scheduledPatients.length > 0 ? Math.round(visitedCount / scheduledPatients.length * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${scheduledPatients.length > 0 ? (visitedCount / scheduledPatients.length) * 100 : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-green-600 font-medium">訪問済み {visitedCount}名</span>
            <span className="text-gray-400">未訪問 {scheduledPatients.length - visitedCount}名</span>
          </div>
        </div>
      )}

      {/* 患者ごとの日報 */}
      {scheduledPatients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <User size={40} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm">この日の訪問予定はありません</p>
          <p className="text-xs mt-1">患者の訪問曜日設定をご確認ください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => {
            const patient = patients.find(p => p.id === visit.patientId);
            if (!patient) return null;
            const isExpanded = expanded[visit.patientId];

            return (
              <div key={visit.patientId}
                className={`bg-white rounded-2xl shadow-sm border transition-all ${
                  visit.visited ? 'border-gray-100' : 'border-orange-100 bg-orange-50/30'}`}>
                {/* 患者ヘッダー */}
                <div className="flex items-center gap-3 p-4">
                  {/* 訪問済みトグル */}
                  <button
                    onClick={() => setVisit(visit.patientId, 'visited', !visit.visited)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      visit.visited
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'}`}>
                    {visit.visited ? <Check size={16} strokeWidth={3} /> : <X size={14} />}
                  </button>

                  <div className="flex-1 min-w-0" onClick={() => toggleExpand(visit.patientId)}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{patient.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        patient.type === 'fullTime' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {patient.type === 'fullTime' ? '正' : '副'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {patient.visitTime && <span>{patient.visitTime}</span>}
                      {visit.visited && (visit.notes || visit.condition) && (
                        <span className="ml-2 text-blue-500">記録あり</span>
                      )}
                      {!visit.visited && <span className="text-orange-500 ml-1">未訪問</span>}
                    </div>
                  </div>

                  <button onClick={() => toggleExpand(visit.patientId)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* 展開：記録フォーム */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                    {visit.visited ? (
                      <>
                        <Field label="体調・生活状況">
                          <textarea
                            value={visit.condition}
                            onChange={e => setVisit(visit.patientId, 'condition', e.target.value)}
                            className={ta()} rows={2}
                            placeholder="本日の体調・生活状況を記入..." />
                        </Field>
                        <Field label="施術内容・メモ">
                          <textarea
                            value={visit.notes}
                            onChange={e => setVisit(visit.patientId, 'notes', e.target.value)}
                            className={ta()} rows={3}
                            placeholder="実施した施術内容、所見などを記入..." />
                        </Field>
                        <Field label="施術中・後の反応">
                          <textarea
                            value={visit.reaction}
                            onChange={e => setVisit(visit.patientId, 'reaction', e.target.value)}
                            className={ta()} rows={2}
                            placeholder="施術中・後の反応を記入..." />
                        </Field>
                      </>
                    ) : (
                      <Field label="未訪問の理由">
                        <textarea
                          value={visit.absent}
                          onChange={e => setVisit(visit.patientId, 'absent', e.target.value)}
                          className={ta()} rows={2}
                          placeholder="キャンセル理由・不在など..." />
                      </Field>
                    )}

                    {/* 患者詳細へのリンク */}
                    <button
                      onClick={() => navigate('patient-detail', { patient })}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
                      <FileText size={13} />患者詳細・報告書作成
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 全体メモ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">全体メモ・申し送り</h3>
        <textarea
          value={generalNotes}
          onChange={e => { setGeneralNotes(e.target.value); setSaved(false); }}
          className={ta()} rows={3}
          placeholder="今日の全体的な申し送り、特記事項など..." />
      </div>

      {/* 保存ボタン */}
      <button onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'}`}>
        {saved ? <><Check size={20} strokeWidth={3} />保存しました</> : <><Save size={20} />日報を保存</>}
      </button>

      {existing && (
        <p className="text-center text-xs text-gray-400">
          最終更新：{new Date(existing.updatedAt).toLocaleString('ja-JP')}
        </p>
      )}
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    {children}
  </div>
);
const ta = () => 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-gray-50';
