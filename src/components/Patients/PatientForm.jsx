import React, { useState } from 'react';
import { useApp } from '../../App';
import { generateId, ADL_OPTIONS, VISIT_DAYS, GENDER_OPTIONS } from '../../utils/helpers';

const ADL_FIELDS = [
  ['turning', '寝返り'], ['sittingUp', '起き上り'], ['standingUp', '立ち上り'],
  ['transfer', '移乗'], ['standing', '立位'], ['walking', '歩行'],
];

export default function PatientForm() {
  const { editingPatient, patients, savePatients, navigate } = useApp();

  const init = editingPatient || {
    name: '', address: '', age: '', gender: '女性', birthDate: '',
    type: 'fullTime', medicalHistory: '', diagnosis: '',
    adl: { turning: '', sittingUp: '', standingUp: '', transfer: '', standing: '', walking: '' },
    visitDays: [], visitTime: '', visitTimes: {}, startDate: '', cautions: '',
    consentDoctor: '', consentHospital: '', careManager: '',
  };

  const [form, setForm] = useState(init);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAdl = (key, val) => setForm(f => ({ ...f, adl: { ...f.adl, [key]: val } }));
  const toggleDay = (day) => {
    setForm(f => {
      const days = Array.isArray(f.visitDays) ? f.visitDays : [];
      const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
      const newTimes = { ...(f.visitTimes || {}) };
      if (!newDays.includes(day)) delete newTimes[day];
      return { ...f, visitDays: newDays, visitTimes: newTimes };
    });
  };
  const setVisitTime = (day, time) => {
    setForm(f => ({ ...f, visitTimes: { ...(f.visitTimes || {}), [day]: time } }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = '患者名は必須です';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const updated = editingPatient
      ? patients.map(p => p.id === editingPatient.id ? { ...form, id: p.id, updatedAt: new Date().toISOString() } : p)
      : [...patients, { ...form, id: generateId(), createdAt: new Date().toISOString() }];
    savePatients(updated);
    navigate('patients');
  };

  const handleDelete = () => {
    if (!confirm(`「${form.name}」を削除しますか？`)) return;
    savePatients(patients.filter(p => p.id !== editingPatient.id));
    navigate('patients');
  };

  const days = Array.isArray(form.visitDays) ? form.visitDays : [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        {editingPatient ? '患者情報を編集' : '新規患者登録'}
      </h2>

      <div className="space-y-5">
        <Section title="基本情報">
          <Field label="患者名" required error={errors.name}>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className={input(errors.name)} placeholder="例：山田 花子" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="年齢">
              <input type="number" value={form.age} onChange={e => set('age', e.target.value)}
                className={input()} placeholder="例：75" />
            </Field>
            <Field label="性別">
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={input()}>
                {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
          </div>
          <Field label="生年月日">
            <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className={input()} />
          </Field>
          <Field label="住所">
            <input value={form.address} onChange={e => set('address', e.target.value)}
              className={input()} placeholder="例：東京都渋谷区..." />
          </Field>
          <Field label="担当区分">
            <div className="flex gap-3 flex-wrap">
              {[['fullTime', '正社員先'], ['partTime', '副業先']].map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={form.type === val} onChange={() => set('type', val)} className="text-blue-600" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="訪問頻度">
            <div className="flex gap-3">
              {[['regular', '毎週定期'], ['spot', 'スポット（不定期）']].map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={(form.visitSchedule || 'regular') === val}
                    onChange={() => set('visitSchedule', val)} className="text-blue-600" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="病歴・傷病">
          <Field label="傷病名">
            <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)}
              className={input()} placeholder="例：腰部脊柱管狭窄症" />
          </Field>
          <Field label="既往歴">
            <textarea value={form.medicalHistory} onChange={e => set('medicalHistory', e.target.value)}
              className={textarea()} rows={3} placeholder="既往歴を記入..." />
          </Field>
        </Section>

        <Section title="ADL状況">
          <div className="grid grid-cols-2 gap-3">
            {ADL_FIELDS.map(([key, label]) => (
              <Field key={key} label={label}>
                <select value={form.adl[key]} onChange={e => setAdl(key, e.target.value)} className={input()}>
                  {ADL_OPTIONS.map(o => <option key={o} value={o}>{o || '未設定'}</option>)}
                </select>
              </Field>
            ))}
          </div>
        </Section>

        <Section title="訪問情報">
          {(form.visitSchedule || 'regular') === 'regular' && (<>
            <Field label="訪問曜日">
              <div className="flex flex-wrap gap-2">
                {VISIT_DAYS.map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      days.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </Field>
            {days.length > 0 && (
              <Field label="曜日ごとの訪問時刻">
                <div className="space-y-2">
                  {days.map(day => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-medium text-gray-600 shrink-0">{day}</span>
                      <input type="time" value={(form.visitTimes || {})[day] || ''}
                        onChange={e => setVisitTime(day, e.target.value)}
                        className={input() + ' flex-1'} />
                    </div>
                  ))}
                </div>
              </Field>
            )}
          </>)}
          <Field label="開始日">
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={input()} />
          </Field>
          <Field label="注意事項（担当PTからの指示など）">
            <textarea value={form.cautions} onChange={e => set('cautions', e.target.value)}
              className={textarea()} rows={3} placeholder="注意事項・禁忌など..." />
          </Field>
        </Section>

        <Section title="関連医療機関・担当者">
          <div className="grid grid-cols-2 gap-3">
            <Field label="同意医師">
              <input value={form.consentDoctor} onChange={e => set('consentDoctor', e.target.value)}
                className={input()} placeholder="例：田中 医師" />
            </Field>
            <Field label="同意病院">
              <input value={form.consentHospital} onChange={e => set('consentHospital', e.target.value)}
                className={input()} placeholder="例：○○病院" />
            </Field>
          </div>
          <Field label="ケアマネージャー">
            <input value={form.careManager} onChange={e => set('careManager', e.target.value)}
              className={input()} placeholder="例：鈴木 CM / △△事業所" />
          </Field>
        </Section>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            {editingPatient ? '更新する' : '登録する'}
          </button>
          {editingPatient && (
            <button onClick={handleDelete}
              className="px-5 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors">
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide border-b pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const input = (err) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
    err ? 'border-red-400' : 'border-gray-300'}`;
const textarea = () => `w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none`;
