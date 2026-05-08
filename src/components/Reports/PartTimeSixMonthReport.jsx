import React, { useState } from 'react';
import { useApp } from '../../App';
import { correctText, summarizePatientDailyReports } from '../../utils/anthropic';
import { generatePartTimeSixMonthExcel } from '../../utils/excel';
import { generateId } from '../../utils/helpers';
import { Sparkles, Loader2, FileDown, Save, NotebookText, ChevronDown, ChevronUp, Check, Plus, X, Clock, AlertTriangle } from 'lucide-react';
import ReportAIGenerator from './ReportAIGenerator';

const POSITIONS = ['仰臥位', '右側臥位', '左側臥位', '腹臥位', '座位', '立位'];

const TREATMENT_TAGS = ['マッサージ', 'ストレッチ', '関節可動域訓練', '運動療法', '歩行訓練', 'ローラー鍼'];

const REPORT_FIELDS = [
  ['initialStatus', '施術開始時の状況', '施術開始時の身体・生活状況を記入...', 3],
  ['longTermGoal', '長期目標', '長期的な施術目標を記入...', 2],
  ['shortTermGoal', '短期目標', '短期的な施術目標を記入...', 2],
  ['mentalCare', '声かけ・メンタルケア', '声かけやメンタルケアの内容を記入...', 2],
  ['currentStatus', '現状', '現在の身体・生活状況を記入...', 3],
  ['futureApproach', '今後の取り組み', '今後の施術方針・取り組みを記入...', 2],
  ['specialNotes', '特記事項', '特記事項があれば記入...', 2],
];

const emptyPosition = () => ({ id: generateId(), position: '仰臥位', tags: [], memo: '' });

export default function PartTimeSixMonthReport() {
  const { selectedPatient, reports, saveReports, dailyReports: allScheduleDailyReports, settings } = useApp();
  const p = selectedPatient;

  const [form, setForm] = useState({
    karteNo: '', recordDate: new Date().toISOString().split('T')[0],
    treatmentCount: '',
    initialStatus: '', longTermGoal: '', shortTermGoal: '',
    mentalCare: '', currentStatus: '', futureApproach: '', specialNotes: '',
  });
  const [positionEntries, setPositionEntries] = useState([emptyPosition()]);
  const [corrected, setCorrected] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setSaved(false); };

  // 体位エントリ操作
  const addPosition = () => setPositionEntries(e => [...e, emptyPosition()]);
  const removePosition = (id) => setPositionEntries(e => e.filter(x => x.id !== id));
  const updatePosition = (id, key, val) =>
    setPositionEntries(e => e.map(x => x.id === id ? { ...x, [key]: val } : x));
  const toggleTag = (id, tag) =>
    setPositionEntries(e => e.map(x => {
      if (x.id !== id) return x;
      const tags = x.tags.includes(tag) ? x.tags.filter(t => t !== tag) : [...x.tags, tag];
      return { ...x, tags };
    }));

  // 施術体位を文字列化（報告書・AI用）
  const buildPositionText = () =>
    positionEntries
      .filter(e => e.tags.length > 0 || e.memo)
      .map(e => {
        const content = [...e.tags, ...(e.memo ? [e.memo] : [])].join('、');
        return `${e.position}：${content}`;
      }).join('　／　');

  // この患者の日報をスケジュール日報から取得
  const allDailyReports = (allScheduleDailyReports || [])
    .filter(r => (r.visits || []).some(v => v.patientId === p.id && v.visited))
    .map(r => {
      const visit = (r.visits || []).find(v => v.patientId === p.id);
      return {
        date: r.date,
        condition: visit?.condition || '',
        treatment: visit?.notes || '',
        adlNotes: visit?.adlNotes || '',
        specialNotes: visit?.specialNotes || '',
        bodyParts: visit?.bodyParts || [],
        treatmentTags: visit?.treatmentTags || [],
        patientCondition: visit?.patientCondition || '',
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const sixMonthsAgo = (() => {
    const d = new Date(form.recordDate);
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  })();

  const periodReports = allDailyReports.filter(r => r.date >= sixMonthsAgo && r.date <= form.recordDate);

  const handleSummarize = async () => {
    setError('');
    if (periodReports.length === 0) {
      setError('対象期間内に日報が見つかりません。日報を記入してから実行してください。');
      return;
    }
    setSummarizing(true);
    try {
      const result = await summarizePatientDailyReports(p.name, periodReports, settings.apiKey);
      setForm(f => ({
        ...f,
        initialStatus: result.initialStatus || f.initialStatus,
        mentalCare: result.mentalCare || f.mentalCare,
        currentStatus: result.currentStatus || f.currentStatus,
        futureApproach: result.futureApproach || f.futureApproach,
        specialNotes: result.specialNotes || f.specialNotes,
        treatmentCount: f.treatmentCount || String(periodReports.length),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleCorrect = async () => {
    setError('');
    setLoading(true);
    try {
      const days = Array.isArray(p.visitDays) ? p.visitDays.join('・') : (p.visitDays || '');
      const posText = buildPositionText();
      const raw = `【施術報告書】${p.name}様
施術開始日：${p.startDate || ''}　施術曜日：${days}　施術回数：${form.treatmentCount}回
傷病名：${p.diagnosis || ''}

■ 施術開始時の状況
${form.initialStatus}

■ 長期目標
${form.longTermGoal}

■ 短期目標
${form.shortTermGoal}

■ 施術内容（体位別）
${posText || '記録なし'}

■ 声かけ・メンタルケア
${form.mentalCare}

■ 現状
${form.currentStatus}

■ 今後の取り組み
${form.futureApproach}

■ 特記事項
${form.specialNotes}`;
      const result = await correctText(raw, settings.apiKey);
      setCorrected(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    generatePartTimeSixMonthExcel(p, { ...form, treatmentPositions: buildPositionText() }, corrected);
  };

  // 報告書リマインダー計算
  const lastReport = (reports || [])
    .filter(r => r.patientId === p.id && r.type === 'pt-sixmonth')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const lastDate = lastReport?.createdAt?.split('T')[0] || null;
  const nextDueDate = lastDate ? (() => {
    const d = new Date(lastDate);
    d.setMonth(d.getMonth() + 6);
    return d;
  })() : null;
  const daysUntilDue = nextDueDate
    ? Math.round((nextDueDate - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
    : null;

  const handleSave = () => {
    const report = {
      id: generateId(), patientId: p.id, type: 'pt-sixmonth',
      form, positionEntries, correctedText: corrected, createdAt: new Date().toISOString(),
    };
    saveReports([...reports, report]);
    setSaved(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">施術報告書</h2>
        <p className="text-sm text-gray-500 mt-0.5">副業先・半年毎 — Excel出力</p>
      </div>

      {/* 次回作成リマインダー */}
      {(() => {
        if (!lastDate) return (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
            <AlertTriangle size={18} className="text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">まだ作成記録がありません</p>
              <p className="text-xs text-yellow-600 mt-0.5">保存すると次回期限が自動で管理されます</p>
            </div>
          </div>
        );
        const nextStr = `${nextDueDate.getFullYear()}年${nextDueDate.getMonth()+1}月${nextDueDate.getDate()}日`;
        const lastStr = `${lastDate.replace(/-/g, '/')}`;
        if (daysUntilDue < 0) return (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">{Math.abs(daysUntilDue)}日超過しています</p>
              <p className="text-xs text-red-500 mt-0.5">前回：{lastStr}　次回期限：{nextStr}</p>
            </div>
          </div>
        );
        if (daysUntilDue <= 30) return (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
            <Clock size={18} className="text-orange-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-700">あと{daysUntilDue}日で作成期限です</p>
              <p className="text-xs text-orange-500 mt-0.5">前回：{lastStr}　次回期限：{nextStr}</p>
            </div>
          </div>
        );
        return (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
            <Clock size={18} className="text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">次回作成：{nextStr}（あと{daysUntilDue}日）</p>
              <p className="text-xs text-green-500 mt-0.5">前回：{lastStr}</p>
            </div>
          </div>
        );
      })()}

      {/* 基本情報 */}
      <Card title="基本情報">
        <div className="grid grid-cols-2 gap-3">
          <Field label="カルテNo">
            <input value={form.karteNo} onChange={e => set('karteNo', e.target.value)} className={inp()} placeholder="例：001" />
          </Field>
          <Field label="記録日">
            <input type="date" value={form.recordDate} onChange={e => set('recordDate', e.target.value)} className={inp()} />
          </Field>
        </div>
        <Field label="施術回数">
          <input type="number" value={form.treatmentCount} onChange={e => set('treatmentCount', e.target.value)}
            className={inp()} placeholder="例：24" />
        </Field>
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 space-y-1">
          <p><b>患者名：</b>{p.name}　<b>住所：</b>{p.address}</p>
          <p><b>施術開始日：</b>{p.startDate}　<b>訪問曜日：</b>{Array.isArray(p.visitDays) ? p.visitDays.join('・') : p.visitDays}曜日</p>
          <p><b>傷病名：</b>{p.diagnosis}</p>
        </div>
      </Card>

      {/* 日報からまとめる */}
      <div className={`rounded-2xl border-2 p-4 ${
        periodReports.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <NotebookText size={18} className={periodReports.length > 0 ? 'text-emerald-600' : 'text-gray-400'} />
              日報からまとめる
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              記録日から6ヶ月間（{sixMonthsAgo} 〜 {form.recordDate}）
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-2xl font-bold ${periodReports.length > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
              {periodReports.length}
            </div>
            <div className="text-xs text-gray-400">件の日報</div>
          </div>
        </div>

        {allDailyReports.length > 0 && (
          <div className="mb-3">
            <button onClick={() => setDailyOpen(!dailyOpen)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              対象の日報を確認
              {dailyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {dailyOpen && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {periodReports.map(r => (
                  <div key={r.date} className="flex items-start gap-2 bg-white rounded-lg p-2 text-xs">
                    <span className="font-medium text-gray-700 shrink-0">{r.date.replace(/-/g, '/')}</span>
                    <span className="text-gray-500 truncate">{r.treatment || r.condition || '（記録あり）'}</span>
                  </div>
                ))}
                {periodReports.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">対象期間内の日報がありません</p>
                )}
              </div>
            )}
          </div>
        )}

        <button onClick={handleSummarize}
          disabled={summarizing || periodReports.length === 0}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
            periodReports.length > 0
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
          {summarizing ? <><Loader2 size={18} className="animate-spin" />AIがまとめ中...</> : <><Sparkles size={18} />日報からAIで自動入力</>}
        </button>

        {periodReports.length === 0 && (
          <p className="text-xs text-center text-gray-400 mt-2">
            対象期間内に日報がありません。患者詳細から日報を記入してください。
          </p>
        )}
      </div>

      {/* AI報告書生成 */}
      <ReportAIGenerator
        patient={p}
        dailyReportList={periodReports}
        period={`${sixMonthsAgo.replace(/-/g, '/')} 〜 ${form.recordDate.replace(/-/g, '/')}`}
        reportType="sixmonth"
        apiKey={settings.apiKey}
        onAutoFill={() => handleSummarize()}
      />

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

      {/* 施術体位 */}
      <Card title="施術体位（体位別の施術内容）">
        <div className="space-y-3">
          {positionEntries.map((entry, idx) => (
            <div key={entry.id} className="bg-gray-50 rounded-xl p-3 space-y-2 relative">
              {/* 体位選択 + 削除 */}
              <div className="flex items-center gap-2">
                <select
                  value={entry.position}
                  onChange={e => updatePosition(entry.id, 'position', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium">
                  {POSITIONS.map(pos => <option key={pos}>{pos}</option>)}
                </select>
                {positionEntries.length > 1 && (
                  <button onClick={() => removePosition(entry.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={15} />
                  </button>
                )}
              </div>
              {/* 施術タグ */}
              <div className="flex flex-wrap gap-1.5">
                {TREATMENT_TAGS.map(tag => {
                  const selected = entry.tags.includes(tag);
                  return (
                    <button key={tag} onClick={() => toggleTag(entry.id, tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                      {tag}
                    </button>
                  );
                })}
              </div>
              {/* 補足メモ */}
              <input
                value={entry.memo}
                onChange={e => updatePosition(entry.id, 'memo', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="補足（例：腰部中心に、下肢末梢から...）"
              />
            </div>
          ))}
          <button onClick={addPosition}
            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
            <Plus size={15} />体位を追加
          </button>
        </div>
        {buildPositionText() && (
          <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-800 mt-1">
            <span className="font-medium">プレビュー：</span>{buildPositionText()}
          </div>
        )}
      </Card>

      {/* 報告内容フォーム */}
      <Card title="報告内容">
        {REPORT_FIELDS.map(([key, label, placeholder, rows]) => (
          <Field key={key} label={label}>
            <textarea value={form[key]} onChange={e => set(key, e.target.value)}
              className={ta()} rows={rows} placeholder={placeholder} />
          </Field>
        ))}
      </Card>

      {/* AI添削 */}
      <button onClick={handleCorrect} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60">
        {loading ? <><Loader2 size={20} className="animate-spin" />AI添削中...</> : <><Sparkles size={20} />AIで添削する（任意）</>}
      </button>

      {corrected && (
        <Card title="AI添削後の報告文">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-xl p-4 leading-relaxed max-h-80 overflow-y-auto">{corrected}</pre>
          <p className="text-xs text-gray-400 mt-1">※ Excel出力時にこの添削文も含まれます</p>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        <button onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          <FileDown size={20} />Excelで出力
        </button>
        <button onClick={handleSave}
          className={`px-5 py-3.5 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
            saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          {saved ? <><Check size={18} />保存済み</> : <><Save size={18} />履歴に保存</>}
        </button>
      </div>
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
