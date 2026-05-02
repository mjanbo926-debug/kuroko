import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { generateId, localDateStr } from '../../utils/helpers';
import { Save, Check, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react';

function formatDateJP(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const BLANK = { condition: '', treatment: '', reaction: '', mentalCare: '', adlNotes: '', specialNotes: '' };

export default function PatientDailyReportForm() {
  const { selectedPatient, selectedDate, patientDailyReports, savePatientDailyReports, navigate } = useApp();
  const patient = selectedPatient;

  const [date, setDate] = useState(selectedDate || localDateStr());
  const [form, setForm] = useState(BLANK);
  const [saved, setSaved] = useState(false);

  const existing = patientDailyReports.find(r => r.patientId === patient?.id && r.date === date);

  useEffect(() => {
    if (existing) {
      setForm({
        condition: existing.condition || '',
        treatment: existing.treatment || '',
        reaction: existing.reaction || '',
        mentalCare: existing.mentalCare || '',
        adlNotes: existing.adlNotes || '',
        specialNotes: existing.specialNotes || '',
      });
    } else {
      setForm(BLANK);
    }
    setSaved(false);
  }, [date, existing?.id]);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setSaved(false); };

  const handleSave = () => {
    const report = {
      id: existing?.id || generateId(),
      patientId: patient.id,
      date,
      ...form,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = existing
      ? patientDailyReports.map(r => r.id === existing.id ? report : r)
      : [...patientDailyReports, report];
    savePatientDailyReports(updated);
    setSaved(true);
    setTimeout(() => navigate('schedule'), 1500);
  };

  const handleDelete = () => {
    if (!existing) return;
    if (!confirm(`${formatDateJP(date)}の日報を削除しますか？`)) return;
    savePatientDailyReports(patientDailyReports.filter(r => r.id !== existing.id));
    setForm(BLANK);
    setSaved(false);
  };

  const shiftDate = (days) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(localDateStr(d));
  };

  // この患者の日報が存在する日付一覧（ナビゲーション用）
  const reportDates = patientDailyReports
    .filter(r => r.patientId === patient?.id)
    .map(r => r.date)
    .sort();

  const isToday = date === localDateStr();
  const hasFilled = Object.values(form).some(v => v.trim());

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">施術日報</h2>
        <p className="text-sm text-gray-500 mt-0.5">{patient?.name}様（副業先）</p>
      </div>

      {/* 日付ナビゲーション */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => shiftDate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1 text-center">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={localDateStr()}
              className="text-center font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer text-base"
            />
            <div className="flex items-center justify-center gap-2 mt-0.5">
              {isToday && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">今日</span>}
              {existing && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check size={11} />記録済み</span>}
              {!existing && <span className="text-xs text-gray-400">未記録</span>}
            </div>
          </div>
          <button onClick={() => shiftDate(1)}
            disabled={isToday}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-30">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 記録済み日付一覧 */}
        {reportDates.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">記録済みの日（{reportDates.length}件）</p>
            <div className="flex flex-wrap gap-1.5">
              {reportDates.slice(-10).map(d => (
                <button key={d} onClick={() => setDate(d)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    d === date
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                  {d.slice(5).replace('-', '/')}
                </button>
              ))}
              {reportDates.length > 10 && (
                <span className="text-xs text-gray-400 py-1">…他{reportDates.length - 10}件</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 記録フォーム */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">{formatDateJP(date)} の記録</h3>

        {[
          ['condition', '体調・生活状況', '本日の体調、日常生活の様子を記入...', 2],
          ['treatment', '施術内容', '実施した施術内容、部位、手技など...', 3],
          ['reaction', '施術中・後の反応', '施術中・後の反応、変化など...', 2],
          ['mentalCare', '声かけ・メンタルケア', '声かけの内容、ご利用者様の様子...', 2],
          ['adlNotes', 'ADL変化・気になる点', 'ADLの変化、生活面で気になった点...', 2],
          ['specialNotes', '特記事項', '特記事項・申し送りなど...', 2],
        ].map(([key, label, placeholder, rows]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
            <textarea value={form[key]} onChange={e => set(key, e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none bg-gray-50"
              rows={rows} placeholder={placeholder} />
          </div>
        ))}
      </div>

      {/* ボタン */}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={!hasFilled && !existing}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40'}`}>
          {saved ? <><Check size={20} strokeWidth={3} />保存しました</> : <><Save size={20} />日報を保存</>}
        </button>
        {existing && (
          <button onClick={handleDelete}
            className="px-4 py-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors">
            <Trash2 size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
