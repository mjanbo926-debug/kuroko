import React, { useState } from 'react';
import { useApp } from '../../App';
import { generatePartTimeExperienceExcel } from '../../utils/excel';
import { generateId, ADL_OPTIONS } from '../../utils/helpers';
import { FileDown, Save } from 'lucide-react';

const ADL_FIELDS = [
  ['turning', '寝返り'], ['sittingUp', '起き上り'], ['standingUp', '立ち上り'],
  ['transfer', '移乗'], ['standing', '立位'], ['walking', '歩行'],
];

export default function PartTimeExperienceReport() {
  const { selectedPatient, reports, saveReports } = useApp();
  const p = selectedPatient;

  const [form, setForm] = useState({
    karteNo: '', implementDate: new Date().toISOString().split('T')[0],
    insuranceInfo: '', lifeSchedule: '',
    chiefComplaint: '', initialTreatment: '', treatmentGoal: '', communicationNotes: '',
    currentStatus: '', planGoal: '', planTreatment: '', communication: '',
    adl: { ...p?.adl } || {},
  });
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAdl = (key, val) => setForm(f => ({ ...f, adl: { ...f.adl, [key]: val } }));

  const handleExport = () => {
    generatePartTimeExperienceExcel(p, form);
  };

  const handleSave = () => {
    const report = {
      id: generateId(), patientId: p.id, type: 'pt-experience',
      form, createdAt: new Date().toISOString(),
    };
    saveReports([...reports, report]);
    setSaved(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">体験報告書</h2>
        <p className="text-sm text-gray-500 mt-0.5">副業先・初回 — Excel出力（3シート）</p>
      </div>

      <Card title="患者情報シート">
        <div className="grid grid-cols-2 gap-3">
          <Field label="カルテNo"><input value={form.karteNo} onChange={e => set('karteNo', e.target.value)} className={inp()} placeholder="例：001" /></Field>
          <Field label="実施日"><input type="date" value={form.implementDate} onChange={e => set('implementDate', e.target.value)} className={inp()} /></Field>
        </div>
        <Field label="保険情報">
          <input value={form.insuranceInfo} onChange={e => set('insuranceInfo', e.target.value)} className={inp()} placeholder="例：後期高齢者医療 / 国民健康保険" />
        </Field>
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 space-y-1">
          <p><b>氏名：</b>{p.name}　<b>生年月日：</b>{p.birthDate}　<b>性別：</b>{p.gender}</p>
          <p><b>住所：</b>{p.address}</p>
          <p><b>同意医師：</b>{p.consentDoctor}　<b>同意病院：</b>{p.consentHospital}</p>
          <p><b>ケアマネ：</b>{p.careManager}</p>
        </div>
        <h4 className="text-sm font-semibold text-gray-600 mt-2">ADL状況</h4>
        <div className="grid grid-cols-2 gap-3">
          {ADL_FIELDS.map(([key, label]) => (
            <Field key={key} label={label}>
              <select value={form.adl[key] || ''} onChange={e => setAdl(key, e.target.value)} className={inp()}>
                {ADL_OPTIONS.map(o => <option key={o} value={o}>{o || '未設定'}</option>)}
              </select>
            </Field>
          ))}
        </div>
        <Field label="生活スケジュール">
          <textarea value={form.lifeSchedule} onChange={e => set('lifeSchedule', e.target.value)}
            className={ta()} rows={2} placeholder="起床・食事・就寝時間など日常の生活リズムを記入..." />
        </Field>
      </Card>

      <Card title="カルテシート">
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 space-y-1">
          <p><b>傷病名：</b>{p.diagnosis}</p>
          <p><b>既往歴：</b>{p.medicalHistory}</p>
        </div>
        <Field label="主訴">
          <textarea value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)}
            className={ta()} rows={2} placeholder="患者様の主訴・困りごとを記入..." />
        </Field>
        <Field label="初回施術内容">
          <textarea value={form.initialTreatment} onChange={e => set('initialTreatment', e.target.value)}
            className={ta()} rows={3} placeholder="初回の施術内容を記入..." />
        </Field>
        <Field label="施術目標">
          <textarea value={form.treatmentGoal} onChange={e => set('treatmentGoal', e.target.value)}
            className={ta()} rows={2} placeholder="施術目標を記入..." />
        </Field>
        <Field label="コミュニケーション面の気になる点">
          <textarea value={form.communicationNotes} onChange={e => set('communicationNotes', e.target.value)}
            className={ta()} rows={2} placeholder="コミュニケーション面で気になったことを記入..." />
        </Field>
      </Card>

      <Card title="施術計画書シート">
        <Field label="現在の状況">
          <textarea value={form.currentStatus} onChange={e => set('currentStatus', e.target.value)}
            className={ta()} rows={2} placeholder="現在の身体・生活状況を記入..." />
        </Field>
        <Field label="目標">
          <textarea value={form.planGoal} onChange={e => set('planGoal', e.target.value)}
            className={ta()} rows={2} placeholder="施術の目標を記入..." />
        </Field>
        <Field label="施術内容">
          <textarea value={form.planTreatment} onChange={e => set('planTreatment', e.target.value)}
            className={ta()} rows={2} placeholder="予定している施術内容を記入..." />
        </Field>
        <Field label="声かけ・コミュニケーション">
          <textarea value={form.communication} onChange={e => set('communication', e.target.value)}
            className={ta()} rows={2} placeholder="声かけやコミュニケーションの方針を記入..." />
        </Field>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <button onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          <FileDown size={20} />Excelで出力
        </button>
        <button onClick={handleSave}
          className={`px-5 py-3.5 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
            saved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          <Save size={18} />{saved ? '保存済み' : '履歴に保存'}
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
