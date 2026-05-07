import React, { useState } from 'react';
import { useApp } from '../../App';
import { correctMonthlyReport, summarizeMonthlyReport } from '../../utils/anthropic';
import { generateId, getCurrentYearMonth, REPORT_LABELS } from '../../utils/helpers';
import CopyButton from '../Common/CopyButton';
import ReportAIGenerator from './ReportAIGenerator';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const SECTIONS = [
  ['healthCondition', '① 体調・生活状況', '体調や日常生活の様子を記入...'],
  ['physicalCondition', '② 身体状況（疼痛・可動域・筋緊張など）', '疼痛・可動域・筋緊張の状態を記入...'],
  ['treatmentContent', '③ 施術内容', '今月実施した施術内容を記入...'],
  ['treatmentResponse', '④ 施術中・施術後の反応', '施術中・後の反応を記入...'],
  ['lifeObservations', '⑤ 生活面での気になる点・連携事項', '生活面で気になった点、他職種への連携事項を記入...'],
  ['futurePolicy', '⑥ 今後の対応方針', '今後の施術方針・目標を記入...'],
];

export default function FullTimeMonthlyReport() {
  const { selectedPatient, reports, saveReports, dailyReports, settings } = useApp();
  const p = selectedPatient;
  const { year: cy, month: cm } = getCurrentYearMonth();

  const [year, setYear] = useState(cy);
  const [month, setMonth] = useState(cm);
  const [sections, setSections] = useState({
    healthCondition: '', physicalCondition: '', treatmentContent: '',
    treatmentResponse: '', lifeObservations: '', futurePolicy: '',
  });
  const [corrected, setCorrected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const history = reports
    .filter(r => r.patientId === p.id && r.type === 'ft-monthly')
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

  const set = (key, val) => setSections(s => ({ ...s, [key]: val }));

  const [summarizing, setSummarizing] = useState(false);

  const handleAutoFill = async () => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const monthReports = (dailyReports || [])
      .filter(r => r.date.startsWith(monthStr))
      .map(r => ({ date: r.date, ...(r.visits || []).find(v => v.patientId === p.id && v.visited) }))
      .filter(r => r.patientId);

    if (monthReports.length === 0) {
      alert('この月の日報が見つかりません。先に日報を入力してください。');
      return;
    }
    if (!settings.apiKey) {
      alert('APIキーが設定されていません。設定画面で入力してください。');
      return;
    }
    setSummarizing(true);
    setError('');
    try {
      const result = await summarizeMonthlyReport(p.name, year, month, monthReports, settings.apiKey);
      setSections({
        healthCondition: result.healthCondition || '',
        physicalCondition: result.physicalCondition || '',
        treatmentContent: result.treatmentContent || '',
        treatmentResponse: result.treatmentResponse || '',
        lifeObservations: result.lifeObservations || '',
        futurePolicy: result.futurePolicy || '',
      });
      setCorrected('');
      setSaved(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSummarizing(false);
    }
  };

  const buildText = (data) => {
    const s = data || sections;
    return `【月次報告書】${p.name}様　${year}年${month}月分\n\n` +
      SECTIONS.map(([key, label]) => `${label}\n${s[key] || ''}`).join('\n\n');
  };

  const handleCorrect = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await correctMonthlyReport(sections, settings.apiKey);
      setCorrected(`【月次報告書】${p.name}様　${year}年${month}月分\n\n` + result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const report = {
      id: generateId(), patientId: p.id, type: 'ft-monthly',
      year, month, sections, correctedText: corrected,
      createdAt: new Date().toISOString(),
    };
    saveReports([...reports, report]);
    setSaved(true);
  };

  const loadHistory = (r) => {
    setYear(r.year); setMonth(r.month);
    setSections(r.sections || {});
    setCorrected(r.correctedText || '');
    setSaved(true);
    setHistoryOpen(false);
  };

  const outputText = corrected || buildText();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">月次報告書</h2>
        <p className="text-sm text-gray-500 mt-0.5">正社員先 — LINE出力</p>
      </div>

      <Card title="対象月">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={inp()}>
              {[cy - 1, cy, cy + 1].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <span className="text-gray-500">年</span>
          <div className="flex-1">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={inp()}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <span className="text-gray-500">月</span>
        </div>
        <div className="text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
          対象患者：{p.name}様
        </div>
      </Card>

      {/* AI報告書生成 */}
      {(() => {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const monthReports = (dailyReports || [])
          .filter(r => r.date.startsWith(monthStr))
          .map(r => ({ date: r.date, ...(r.visits || []).find(v => v.patientId === p.id && v.visited) }))
          .filter(r => r.patientId);
        return (
          <ReportAIGenerator
            patient={p}
            dailyReportList={monthReports}
            period={`${year}年${month}月`}
            reportType="monthly"
            apiKey={settings.apiKey}
            onAutoFill={() => handleAutoFill()}
          />
        );
      })()}

      <Card title="月次内容">
        <button onClick={handleAutoFill} disabled={summarizing}
          className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors mb-3 disabled:opacity-60">
          {summarizing ? <><Loader2 size={16} className="animate-spin" />AIがまとめ中...</> : <>日報からAIで自動入力（{year}年{month}月）</>}
        </button>
        {SECTIONS.map(([key, label, placeholder]) => (
          <Field key={key} label={label}>
            <textarea value={sections[key]} onChange={e => set(key, e.target.value)}
              className={ta()} rows={3} placeholder={placeholder} />
          </Field>
        ))}
      </Card>

      <button onClick={handleCorrect} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60">
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
        {loading ? 'AI添削中...' : 'AIで添削する'}
      </button>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

      <Card title={corrected ? '添削後の報告文' : '報告文プレビュー（添削前）'}>
        <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-xl p-4 leading-relaxed max-h-96 overflow-y-auto">
          {outputText}
        </pre>
        <div className="flex gap-3 mt-3 flex-wrap">
          <CopyButton text={outputText} />
          {!saved && (
            <button onClick={handleSave}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">
              履歴に保存
            </button>
          )}
          {saved && <span className="text-sm text-green-600 flex items-center py-3">保存済み</span>}
        </div>
      </Card>

      {history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <button className="w-full flex items-center justify-between"
            onClick={() => setHistoryOpen(!historyOpen)}>
            <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
              <History size={16} />過去の月次報告書 ({history.length}件)
            </div>
            {historyOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
          {historyOpen && (
            <div className="mt-3 space-y-2">
              {history.map(r => (
                <button key={r.id} onClick={() => loadHistory(r)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors text-left">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{r.year}年{r.month}月分</div>
                    <div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('ja-JP')}保存</div>
                  </div>
                  <span className="text-xs text-blue-600">読み込む</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Card = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
    <h3 className="font-semibold text-gray-700 text-sm border-b pb-2">{title}</h3>
    {children}
  </div>
);
const Field = ({ label, children }) => (
  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>{children}</div>
);
const inp = () => 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';
const ta = () => 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none';
