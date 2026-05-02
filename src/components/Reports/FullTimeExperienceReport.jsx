import React, { useState } from 'react';
import { useApp } from '../../App';
import { correctText } from '../../utils/anthropic';
import { generateId, formatDate, ADL_OPTIONS } from '../../utils/helpers';
import CopyButton from '../Common/CopyButton';
import { Sparkles, Loader2 } from 'lucide-react';

const ADL_FIELDS = [
  ['turning', '寝返り'], ['sittingUp', '起き上り'], ['standingUp', '立ち上り'],
  ['transfer', '移乗'], ['standing', '立位'], ['walking', '歩行'],
];

export default function FullTimeExperienceReport() {
  const { selectedPatient, reports, saveReports, settings } = useApp();
  const p = selectedPatient;

  const [form, setForm] = useState({
    implementDate: new Date().toISOString().split('T')[0],
    otherServices: '', referralBackground: '',
    mainComplaint: '', initialTreatment: '',
    communicationNotes: '', treatmentGoal: '',
    adl: { ...p?.adl } || {},
  });
  const [corrected, setCorrected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAdl = (key, val) => setForm(f => ({ ...f, adl: { ...f.adl, [key]: val } }));

  const buildReportText = (text) => {
    const days = Array.isArray(p.visitDays) ? p.visitDays.join('・') : (p.visitDays || '');
    return `【体験報告書】${p.name}様\n実施日：${formatDate(form.implementDate)}\n\n` +
      `■ 基本情報\n氏名：${p.name}　${p.age}歳 / ${p.gender}\n住所：${p.address || ''}\n` +
      `傷病名：${p.diagnosis || ''}　既往歴：${p.medicalHistory || ''}\n` +
      `訪問日：${days}曜日 ${p.visitTime || ''}　開始日：${formatDate(p.startDate)}\n\n` +
      `■ ADL状況\n` + ADL_FIELDS.map(([k, l]) => `${l}：${form.adl[k] || '未設定'}`).join('　') + '\n\n' +
      `■ 他サービス利用状況・紹介経緯\n${form.otherServices}\n\n` +
      `■ 担当PTなどからの注意事項・禁忌\n${p.cautions || 'なし'}\n\n` +
      `■ 主訴\n${form.mainComplaint}\n\n` +
      `■ 初回施術内容\n${text}\n\n` +
      `■ コミュニケーション面の気になる点\n${form.communicationNotes}\n\n` +
      `■ 施術目標\n${form.treatmentGoal}`;
  };

  const handleCorrect = async () => {
    setError('');
    setLoading(true);
    try {
      const rawText = `主訴：${form.mainComplaint}\n初回施術内容：${form.initialTreatment}\nコミュニケーション面：${form.communicationNotes}\n施術目標：${form.treatmentGoal}`;
      const result = await correctText(rawText, settings.apiKey);
      setCorrected(buildReportText(result));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const report = {
      id: generateId(), patientId: p.id, type: 'ft-experience',
      form, correctedText: corrected, createdAt: new Date().toISOString(),
    };
    saveReports([...reports, report]);
    setSaved(true);
  };

  const lineText = corrected || buildReportText(form.initialTreatment);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">体験報告書</h2>
        <p className="text-sm text-gray-500 mt-0.5">正社員先・初回 — LINE出力</p>
      </div>

      <Card title="実施情報">
        <Field label="実施日">
          <input type="date" value={form.implementDate} onChange={e => set('implementDate', e.target.value)} className={inp()} />
        </Field>
        <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-700 space-y-1">
          <p><span className="font-medium">患者名：</span>{p.name}（{p.age}歳 / {p.gender}）</p>
          <p><span className="font-medium">住所：</span>{p.address}</p>
          <p><span className="font-medium">傷病名：</span>{p.diagnosis}</p>
          <p><span className="font-medium">訪問日：</span>{Array.isArray(p.visitDays) ? p.visitDays.join('・') : p.visitDays}曜日 {p.visitTime}</p>
        </div>
      </Card>

      <Card title="ADL状況">
        <div className="grid grid-cols-2 gap-3">
          {ADL_FIELDS.map(([key, label]) => (
            <Field key={key} label={label}>
              <select value={form.adl[key] || ''} onChange={e => setAdl(key, e.target.value)} className={inp()}>
                {ADL_OPTIONS.map(o => <option key={o} value={o}>{o || '未設定'}</option>)}
              </select>
            </Field>
          ))}
        </div>
      </Card>

      <Card title="報告内容">
        <Field label="他サービス利用状況・紹介経緯">
          <textarea value={form.otherServices} onChange={e => set('otherServices', e.target.value)}
            className={ta()} rows={2} placeholder="他サービスの利用状況や、どのような経緯で紹介されたかを記入..." />
        </Field>
        <Field label="主訴">
          <textarea value={form.mainComplaint} onChange={e => set('mainComplaint', e.target.value)}
            className={ta()} rows={2} placeholder="患者様の主訴・困りごとを記入..." />
        </Field>
        <Field label="初回施術内容">
          <textarea value={form.initialTreatment} onChange={e => set('initialTreatment', e.target.value)}
            className={ta()} rows={3} placeholder="初回の施術内容を記入..." />
        </Field>
        <Field label="コミュニケーション面の気になる点">
          <textarea value={form.communicationNotes} onChange={e => set('communicationNotes', e.target.value)}
            className={ta()} rows={2} placeholder="コミュニケーション面で気になったことを記入..." />
        </Field>
        <Field label="施術目標">
          <textarea value={form.treatmentGoal} onChange={e => set('treatmentGoal', e.target.value)}
            className={ta()} rows={2} placeholder="施術目標を記入..." />
        </Field>
      </Card>

      <button onClick={handleCorrect} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60">
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
        {loading ? 'AI添削中...' : 'AIで添削する'}
      </button>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

      {corrected && (
        <Card title="添削後の報告文">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-xl p-4 leading-relaxed">{corrected}</pre>
          <div className="flex gap-3 mt-3 flex-wrap">
            <CopyButton text={corrected} />
            {!saved && (
              <button onClick={handleSave}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">
                履歴に保存
              </button>
            )}
            {saved && <span className="text-sm text-green-600 py-3">保存しました</span>}
          </div>
        </Card>
      )}

      {!corrected && (
        <Card title="報告文プレビュー（添削前）">
          <pre className="whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">{buildReportText(form.initialTreatment)}</pre>
          <div className="mt-3">
            <CopyButton text={lineText} label="このままコピー" />
          </div>
        </Card>
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
