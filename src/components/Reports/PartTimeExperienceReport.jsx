import React, { useState } from 'react';
import { useApp } from '../../App';
import { generatePartTimeExperienceExcel } from '../../utils/excel';
import { generateId } from '../../utils/helpers';
import { FileDown, Save } from 'lucide-react';

const SYMPTOM_TYPES = ['拘縮', '麻痺', 'しびれ', 'むくみ'];
const SYMPTOM_AREAS = ['無', '全身', '右上肢', '左上肢', '右下肢', '左下肢', '体幹', 'その他'];

const TREATMENT_AREA_OPTIONS = [
  ['マ右上肢', 'マ右下肢', 'マ左上肢', 'マ左下肢', '温'],
  ['マ体幹', '変右上肢', '変右下肢', '変左上肢', '変左下肢'],
];

const POSITION_TYPES = ['仰臥位', '腹臥位', '座位', '横臥位(右)', '横臥位(左)'];

const initSymptoms = () =>
  Object.fromEntries(SYMPTOM_TYPES.map(s => [s, { selected: '無', otherText: '' }]));

export default function PartTimeExperienceReport() {
  const { selectedPatient, reports, saveReports } = useApp();
  const p = selectedPatient;

  const [form, setForm] = useState({
    karteNo: '',
    implementDate: new Date().toISOString().split('T')[0],
    insuranceInfo: '',
    lifeSchedule: '',
    // 症状
    symptoms: initSymptoms(),
    // 主訴・現状
    chiefComplaint: '',
    notes1: '',           // 〈追記・注意点〉（主訴の後）
    // 開始時の目標
    initialGoal: '',
    // 施術部位
    treatmentAreas: [],
    // 施術内容（体位別）
    positionContents: Object.fromEntries(POSITION_TYPES.map(p => [p, ''])),
    notes2: '',           // 〈追記・注意点〉（施術の後）
    // ADL（後方互換）
    adl: { ...p?.adl } || {},
  });
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const setSymptom = (type, field, val) =>
    setForm(f => ({
      ...f,
      symptoms: { ...f.symptoms, [type]: { ...f.symptoms[type], [field]: val } },
    }));

  const toggleArea = (area) =>
    setForm(f => ({
      ...f,
      treatmentAreas: f.treatmentAreas.includes(area)
        ? f.treatmentAreas.filter(a => a !== area)
        : [...f.treatmentAreas, area],
    }));

  const setPosition = (pos, val) =>
    setForm(f => ({ ...f, positionContents: { ...f.positionContents, [pos]: val } }));

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
        <h2 className="text-xl font-bold text-gray-800">体験報告書 / カルテ</h2>
        <p className="text-sm text-gray-500 mt-0.5">副業先・初回 — Excel出力</p>
      </div>

      {/* 基本情報 */}
      <Card title="基本情報">
        <div className="grid grid-cols-2 gap-3">
          <Field label="カルテNo">
            <input value={form.karteNo} onChange={e => set('karteNo', e.target.value)} className={inp()} placeholder="例：200044" />
          </Field>
          <Field label="実施日">
            <input type="date" value={form.implementDate} onChange={e => set('implementDate', e.target.value)} className={inp()} />
          </Field>
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
      </Card>

      {/* 症状 */}
      <Card title="症状">
        <div className="space-y-4">
          {SYMPTOM_TYPES.map(type => (
            <div key={type}>
              <p className="text-sm font-semibold text-gray-700 mb-2">{type}</p>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_AREAS.map(area => {
                  const selected = form.symptoms[type].selected === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSymptom(type, 'selected', area)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selected
                          ? area === '無' ? 'bg-gray-500 text-white border-gray-500'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}>
                      {area}
                    </button>
                  );
                })}
              </div>
              {form.symptoms[type].selected === 'その他' && (
                <input
                  value={form.symptoms[type].otherText}
                  onChange={e => setSymptom(type, 'otherText', e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="その他の詳細を入力..."
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 既往歴 */}
      <Card title="既往歴">
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
          {p.medicalHistory
            ? <p className="whitespace-pre-wrap">{p.medicalHistory}</p>
            : <p className="text-gray-400">患者情報に既往歴が登録されていません</p>}
        </div>
        <p className="text-xs text-gray-400">※ 変更は患者情報の編集から行ってください</p>
      </Card>

      {/* 主訴・現状 */}
      <Card title="主訴・現状">
        <Field label="傷病名">
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700">
            {p.diagnosis || <span className="text-gray-400">患者情報に傷病名が登録されていません</span>}
          </div>
        </Field>
        <Field label="主訴・現状">
          <textarea value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)}
            className={ta()} rows={5}
            placeholder="〇右上肢、右下肢に麻痺があります。&#10;〇自宅での移動手段は車椅子です。&#10;〇右手首、手指の拘縮がみられます。" />
        </Field>
        <Field label="〈追記・注意点〉">
          <textarea value={form.notes1} onChange={e => set('notes1', e.target.value)}
            className={ta()} rows={3} placeholder="追記・注意点があれば記入..." />
        </Field>
      </Card>

      {/* 開始時の目標 */}
      <Card title="開始時の目標">
        <textarea value={form.initialGoal} onChange={e => set('initialGoal', e.target.value)}
          className={ta()} rows={4}
          placeholder="〇体調を整えて、穏やかに毎日を過ごせるサポートをしたい。&#10;〇各部筋緊張の軽減。&#10;〇各関節柔軟性の向上による拘縮の改善。" />
      </Card>

      {/* 施術部位 */}
      <Card title="施術部位">
        <div className="space-y-2">
          {TREATMENT_AREA_OPTIONS.map((row, ri) => (
            <div key={ri} className="flex flex-wrap gap-2">
              {row.map(area => {
                const checked = form.treatmentAreas.includes(area);
                const isHeat = area === '温';
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleArea(area)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      checked
                        ? isHeat ? 'bg-orange-500 text-white border-orange-500' : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}>
                    {checked ? '☑' : '□'} {area}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* 施術内容（体位別） */}
      <Card title="施術内容（体位別）">
        <div className="space-y-4">
          {POSITION_TYPES.map(pos => (
            <div key={pos} className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">{pos}</p>
              <textarea
                value={form.positionContents[pos]}
                onChange={e => setPosition(pos, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
                rows={2}
                placeholder={pos === '仰臥位' ? '例：両上肢、両下肢：マッサージ、ストレッチ、運動療法' : pos === '座位' ? '例：頸、肩部、背腰部：マッサージ、ストレッチ' : '施術内容を記入...'}
              />
            </div>
          ))}
        </div>
        <Field label="〈追記・注意点〉">
          <textarea value={form.notes2} onChange={e => set('notes2', e.target.value)}
            className={ta()} rows={2} placeholder="追記・注意点があれば記入..." />
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
