import React, { useState } from 'react';
import { useApp } from '../../App';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

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

export default function MonthlyStats() {
  const { patients, dailyReports } = useApp();
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
  const reports = dailyReports.filter(r => dates.includes(r.date));

  // 患者ごとの訪問回数
  const visitCountMap = {};
  reports.forEach(r => {
    (r.visits || []).forEach(v => {
      if (v.visited) {
        visitCountMap[v.patientId] = (visitCountMap[v.patientId] || 0) + 1;
      }
    });
  });

  const fullTimePatients = patients.filter(p => p.type === 'fullTime');
  const partTimePatients = patients.filter(p => p.type === 'partTime');

  const totalFT = fullTimePatients.reduce((s, p) => s + (visitCountMap[p.id] || 0), 0);
  const totalPT = partTimePatients.reduce((s, p) => s + (visitCountMap[p.id] || 0), 0);

  // 16回以上の患者
  const overLimitPatients = patients.filter(p => (visitCountMap[p.id] || 0) >= VISIT_LIMIT);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
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

      {/* 患者ごと：副業先 */}
      <Section title="副業先" color="emerald" patients={partTimePatients} visitCountMap={visitCountMap} />
    </div>
  );
}

function Section({ title, color, patients, visitCountMap }) {
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
          return (
            <div key={p.id} className={`px-4 py-3 ${isOver ? 'bg-orange-50/50' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  {isOver && <AlertTriangle size={14} className="text-orange-500" />}
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
