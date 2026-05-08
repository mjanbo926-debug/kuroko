import React, { useState } from 'react';
import { useApp } from '../../App';
import { ChevronLeft, ChevronRight, AlertTriangle, FileText, CheckCircle2, Clock } from 'lucide-react';

const VISIT_LIMIT = 16;

function getMonthDates(year, month) {
  const dates = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// 次回作成期限を計算（前回作成日 + 6ヶ月）
function calcNextDue(lastDateStr) {
  if (!lastDateStr) return null;
  const d = new Date(lastDateStr);
  d.setMonth(d.getMonth() + 6);
  return d;
}

// 今日からの日数差
function diffDays(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function MonthlyStats() {
  const { patients, dailyReports, reports } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const shiftMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  };

  const dates = getMonthDates(year, month);
  const monthReports = dailyReports.filter(r => dates.includes(r.date));

  // 患者ごとの訪問回数
  const visitCountMap = {};
  monthReports.forEach(r => {
    (r.visits || []).forEach(v => {
      if (v.visited) visitCountMap[v.patientId] = (visitCountMap[v.patientId] || 0) + 1;
    });
  });

  const fullTimePatients = patients.filter(p => p.type === 'fullTime');
  const partTimePatients = patients.filter(p => p.type === 'partTime');

  const totalFT = fullTimePatients.reduce((s, p) => s + (visitCountMap[p.id] || 0), 0);
  const totalPT = partTimePatients.reduce((s, p) => s + (visitCountMap[p.id] || 0), 0);

  // 16回以上の患者
  const overLimitPatients = patients.filter(p => (visitCountMap[p.id] || 0) >= VISIT_LIMIT);

  // 副業先：施術報告書リマインダー（要フラグが立っている患者のみ）
  const ptReportReminders = partTimePatients
    .filter(p => p.requiresSixMonthReport !== false)
    .map(p => {
    const saved = (reports || [])
      .filter(r => r.patientId === p.id && r.type === 'pt-sixmonth')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latest = saved[0];
    const lastDate = latest?.createdAt?.split('T')[0] || null;
    // 手動設定日を優先、なければ前回+6ヶ月
    const nextDue = p.nextReportDueDate
      ? new Date(p.nextReportDueDate)
      : calcNextDue(lastDate);
    const days = nextDue ? diffDays(nextDue) : null;
    return { patient: p, lastDate, nextDue, days };
  });

  // 期限30日以内 or 超過のみ警告表示
  const urgentReminders = ptReportReminders.filter(r => r.days === null || r.days <= 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">月次集計</h2>
      </div>

      {/* 16回以上アラート */}
      {overLimitPatients.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
            <AlertTriangle size={18} />16回以上の患者がいます
          </div>
          {overLimitPatients.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-orange-100">
              <span className="text-sm font-medium text-gray-800">{p.name}</span>
              <span className="text-sm font-bold text-orange-600">{visitCountMap[p.id]}回</span>
            </div>
          ))}
        </div>
      )}

      {/* 副業先 施術報告書リマインダー（要注意のみ表示） */}
      {urgentReminders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <FileText size={16} className="text-emerald-600" />
            <span className="text-sm font-semibold text-gray-700">副業先 施術報告書リマインダー</span>
          </div>
          <div className="divide-y divide-gray-50">
            {urgentReminders.map(({ patient, lastDate, nextDue, days }) => {
              const isOverdue = days !== null && days < 0;
              const isSoon = days !== null && days >= 0 && days <= 30;
              const isNew = days === null;
              return (
                <div key={patient.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${
                  isOverdue ? 'bg-red-50/50' : isSoon ? 'bg-orange-50/50' : 'bg-yellow-50/50'}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{patient.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {lastDate ? `前回：${formatDate(lastDate)}` : '未作成'}
                      {nextDue && ` → 次回：${formatDate(nextDue.toISOString().split('T')[0])}`}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isOverdue && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
                        <AlertTriangle size={12} />{Math.abs(days)}日超過
                      </span>
                    )}
                    {isSoon && (
                      <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full">
                        <Clock size={12} />あと{days}日
                      </span>
                    )}
                    {isNew && (
                      <span className="flex items-center gap-1 text-xs font-bold text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full">
                        <FileText size={12} />未作成
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 月ナビゲーション */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
        <div className="flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-xl hover:bg-gray-100">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="text-center font-semibold text-gray-800">
            {year}年{month}月
          </div>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-xl hover:bg-gray-100"
            disabled={year === now.getFullYear() && month === now.getMonth() + 1}>
            <ChevronRight size={20} className="text-gray-600 disabled:opacity-30" />
          </button>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-4">
          <div className="text-xs text-blue-600 font-medium mb-1">正社員先</div>
          <div className="text-3xl font-bold text-blue-700">{totalFT}<span className="text-base font-normal text-gray-400 ml-1">回</span></div>
          <div className="text-xs text-gray-400 mt-1">{fullTimePatients.length}名</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-4">
          <div className="text-xs text-emerald-600 font-medium mb-1">副業先</div>
          <div className="text-3xl font-bold text-emerald-700">{totalPT}<span className="text-base font-normal text-gray-400 ml-1">回</span></div>
          <div className="text-xs text-gray-400 mt-1">{partTimePatients.length}名</div>
        </div>
      </div>

      {/* 合計 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">合計訪問回数</span>
        <span className="text-2xl font-bold text-gray-800">{totalFT + totalPT}<span className="text-sm font-normal text-gray-400 ml-1">回</span></span>
      </div>

      {/* 患者ごと：正社員先 */}
      <Section title="正社員先" color="blue" patients={fullTimePatients} visitCountMap={visitCountMap} />

      {/* 患者ごと：副業先（全員の報告書状況も表示） */}
      <Section title="副業先" color="emerald" patients={partTimePatients} visitCountMap={visitCountMap}
        reportReminders={ptReportReminders} />
    </div>
  );
}

function Section({ title, color, patients, visitCountMap, reportReminders }) {
  const sorted = [...patients].sort((a, b) => (visitCountMap[b.id] || 0) - (visitCountMap[a.id] || 0));
  const total = sorted.reduce((s, p) => s + (visitCountMap[p.id] || 0), 0);
  const max = Math.max(...sorted.map(p => visitCountMap[p.id] || 0), 1);

  const colors = {
    blue: { header: 'text-blue-700', bar: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700' },
    emerald: { header: 'text-emerald-700', bar: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
  };
  const c = colors[color];

  if (patients.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${c.header}`}>{title}</h3>
        <span className="text-xs text-gray-400">計 {total}回</span>
      </div>
      <div className="divide-y divide-gray-50">
        {sorted.map(p => {
          const count = visitCountMap[p.id] || 0;
          const pct = Math.round((count / max) * 100);
          const isOver = count >= VISIT_LIMIT;
          const reminder = reportReminders?.find(r => r.patient.id === p.id);

          return (
            <div key={p.id} className={`px-4 py-3 ${isOver ? 'bg-orange-50/50' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  {isOver && <AlertTriangle size={14} className="text-orange-500" />}
                  {/* 報告書バッジ */}
                  {reminder && (() => {
                    const { days } = reminder;
                    if (days === null) return (
                      <span className="text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full">報告書未作成</span>
                    );
                    if (days < 0) return (
                      <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">{Math.abs(days)}日超過</span>
                    );
                    if (days <= 30) return (
                      <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">あと{days}日</span>
                    );
                    return (
                      <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} />あと{days}日
                      </span>
                    );
                  })()}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isOver ? 'bg-orange-100 text-orange-700' : c.badge}`}>
                  {count}回{isOver ? '！' : ''}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className={`${isOver ? 'bg-orange-400' : c.bar} h-1.5 rounded-full transition-all`}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
