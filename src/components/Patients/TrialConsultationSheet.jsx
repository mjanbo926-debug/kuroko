import React, { useState } from 'react';
import { useApp } from '../../App';
import { Printer, Save, ChevronLeft } from 'lucide-react';

const BODY_PARTS = ['頸部', '肩部（右）', '肩部（左）', '腰部', '股関節（右）', '股関節（左）', '上肢（右）', '上肢（左）', '下肢（右）', '下肢（左）', '体幹', 'その他'];
const SYMPTOM_TYPES = ['拘縮', '麻痺', 'しびれ', 'むくみ', '疼痛', '筋緊張'];
const ADL_ITEMS = [
  ['turning', '寝返り'], ['sittingUp', '起き上がり'], ['standingUp', '立ち上がり'],
  ['transfer', '移乗'], ['standing', '立位'], ['walking', '歩行'],
];
const ADL_OPTIONS = ['自立', '一部介助', '全介助', '不可'];
const PAYMENT_OPTIONS = ['現金', '口座振込', 'その他'];

const emptyForm = (patient) => ({
  nameKana: patient?.nameKana || '',
  birthDate: '',
  age: '',
  gender: '',
  phone: '',
  emergencyContact: '',
  emergencyPhone: '',
  address: patient?.address || '',
  facilityName: patient?.facilityName || '',
  careManagerName: '',
  careManagerOffice: '',
  careManagerPhone: '',
  chiefComplaint: '',
  bodyParts: [],
  symptoms: [],
  painLevel: '',
  medicalHistory: '',
  currentMeds: '',
  adl: Object.fromEntries(ADL_ITEMS.map(([k]) => [k, ''])),
  hasInsurance: '',
  hasMedicalCert: '',
  hasMedBook: '',
  paymentMethod: '',
  treatmentMemo: '',
  nextVisitFreq: '',
  nextTreatmentPlan: '',
  notes: '',
});

// ────── 印刷専用コンポーネント ──────
function PrintSheet({ form, patientName }) {
  const S = (style) => style; // パススルー（型補助）

  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', width: '76px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', flex: 1, borderBottom: '1.5px solid #9ca3af', minHeight: '22px', paddingBottom: '1px' }}>{value}</span>
    </div>
  );

  const CheckBox = ({ checked }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '16px', height: '16px', border: '2px solid #374151',
      flexShrink: 0, fontSize: '12px', lineHeight: 1, fontWeight: 'bold',
    }}>
      {checked ? '✓' : ''}
    </span>
  );

  const Check = ({ label, value, options }) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', color: '#6b7280', width: '64px', flexShrink: 0 }}>{label}</span>
      <span style={{ display: 'flex', gap: '14px' }}>
        {options.map(opt => (
          <span key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
            <CheckBox checked={value === opt} />{opt}
          </span>
        ))}
      </span>
    </div>
  );

  const STitle = ({ num, title }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', marginBottom: '6px', borderBottom: '2px solid #d1d5db', paddingBottom: '3px' }}>
      <span style={{ background: '#1f2937', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px' }}>{num}</span>
      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>{title}</span>
    </div>
  );

  // flex: 1 で縦に伸びるボックス
  const GrowBox = ({ children, flex }) => (
    <div style={{ border: '1.5px solid #d1d5db', borderRadius: '4px', padding: '6px 8px', flex: flex || 1, fontSize: '13px', lineHeight: 1.7 }}>
      {children}
    </div>
  );

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div id="print-sheet" className="hidden print:block" style={{
      fontFamily: 'sans-serif', background: 'white', color: '#111',
      height: 'calc(297mm - 10mm)',   // @pageのmargin 5mm×2 = 10mm
      display: 'flex', flexDirection: 'column',
    }}>

      {/* タイトル */}
      <div style={{ textAlign: 'center', marginBottom: '5px', flexShrink: 0 }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.25em' }}>体　験　問　診　シ　ー　ト</div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>訪問マッサージ</div>
      </div>

      {/* 患者名・日付バー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #6b7280', padding: '5px 12px', marginBottom: '8px', fontSize: '13px', flexShrink: 0 }}>
        <span>お名前：<strong style={{ fontSize: '17px', marginLeft: '5px' }}>{patientName}</strong> 様</span>
        <span>訪問日：　　　年　　月　　日</span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>記入日：{today}</span>
      </div>

      {/* 2カラムメイン（縦に伸びる） */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', flex: 1, minHeight: 0 }}>

        {/* 左列 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0 }}>
            <STitle num="①" title="基本情報" />
            <Row label="フリガナ" value={form.nameKana} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}><Row label="生年月日" value={form.birthDate?.replace(/-/g, '/')} /></div>
              <div style={{ flex: 1 }}><Row label="年齢" value={form.age ? `${form.age}歳` : ''} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', width: '76px', flexShrink: 0 }}>性別</span>
              <span style={{ display: 'flex', gap: '16px' }}>
                {['男性', '女性'].map(g => (
                  <span key={g} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                    <CheckBox checked={form.gender === g} />{g}
                  </span>
                ))}
              </span>
            </div>
            <Row label="住所" value={form.address} />
            <Row label="施設名" value={form.facilityName} />
            <Row label="電話番号" value={form.phone} />
            <Row label="緊急連絡先" value={`${form.emergencyContact || ''}　${form.emergencyPhone || ''}`} />

            <STitle num="②" title="担当ケアマネジャー" />
            <Row label="担当者名" value={form.careManagerName} />
            <Row label="事業所名" value={form.careManagerOffice} />
            <Row label="電話番号" value={form.careManagerPhone} />

            <STitle num="③" title="書類・お支払い確認" />
            <Check label="保険証" value={form.hasInsurance} options={['あり', 'なし', '確認中']} />
            <Check label="医療証" value={form.hasMedicalCert} options={['あり', 'なし']} />
            <Check label="お薬手帳" value={form.hasMedBook} options={['あり', 'なし']} />
            <Check label="お支払い" value={form.paymentMethod} options={PAYMENT_OPTIONS} />

            <STitle num="④" title="主訴・お悩み" />
          </div>
          {/* 主訴ボックス：残り縦スペースを全部使う */}
          <GrowBox>{form.chiefComplaint}</GrowBox>
        </div>

        {/* 右列 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0 }}>
            <STitle num="⑤" title="症状チェック" />
            <div style={{ marginBottom: '7px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>気になる部位</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {BODY_PARTS.map(part => (
                  <span key={part} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <CheckBox checked={form.bodyParts.includes(part)} />{part}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '7px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>症状の種類</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {SYMPTOM_TYPES.map(s => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                    <CheckBox checked={form.symptoms.includes(s)} />{s}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>痛みの強さ（VAS 0〜10）</div>
              <div style={{ display: 'flex', border: '1.5px solid #9ca3af', borderRadius: '4px', overflow: 'hidden' }}>
                {Array.from({ length: 11 }, (_, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center', fontSize: '12px', padding: '5px 0',
                    borderRight: i < 10 ? '1px solid #d1d5db' : 'none',
                    background: form.painLevel === String(i) ? '#1f2937' : '',
                    color: form.painLevel === String(i) ? '#fff' : '',
                    fontWeight: form.painLevel === String(i) ? 'bold' : '',
                  }}>{i}</div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                <span>なし</span><span>最大</span>
              </div>
            </div>

            <STitle num="⑥" title="既往歴・現病歴・服薬情報" />
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>既往歴・現病歴</div>
          </div>
          {/* 右列：残りをflexで分割 */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '6px' }}>
            <GrowBox flex={2}>{form.medicalHistory}</GrowBox>
            <div style={{ flexShrink: 0, fontSize: '11px', color: '#6b7280' }}>服薬情報</div>
            <GrowBox flex={1}>{form.currentMeds}</GrowBox>

            <STitle num="⑦" title="ADL・生活状況" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', flexShrink: 0 }}>
              {ADL_ITEMS.map(([key, label]) => (
                <div key={key} style={{ border: '1.5px solid #d1d5db', borderRadius: '4px', padding: '5px 7px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>{label}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {ADL_OPTIONS.map(opt => (
                      <span key={opt} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
                        <CheckBox checked={form.adl[key] === opt} />{opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 下段：施術メモ・次回提案 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', flexShrink: 0, marginTop: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <STitle num="⑧" title="体験施術メモ" />
          <div style={{ border: '1.5px solid #d1d5db', borderRadius: '4px', padding: '6px 8px', minHeight: '72px', fontSize: '13px', lineHeight: 1.7 }}>
            {form.treatmentMemo}
          </div>
        </div>
        <div>
          <STitle num="⑨" title="次回提案・施術方針" />
          <Row label="訪問頻度" value={form.nextVisitFreq} />
          <Row label="施術方針" value={form.nextTreatmentPlan} />
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '5px', marginBottom: '3px' }}>備考</div>
          <div style={{ border: '1.5px solid #d1d5db', borderRadius: '4px', padding: '6px 8px', minHeight: '36px', fontSize: '13px' }}>
            {form.notes}
          </div>
        </div>
      </div>

      {/* 署名欄 */}
      <div style={{ marginTop: '8px', paddingTop: '5px', borderTop: '1px solid #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>担当者：＿＿＿＿＿＿＿＿＿＿＿＿</span>
        <span style={{ fontSize: '10px', color: '#d1d5db' }}>クロコ 訪問マッサージ管理システム</span>
      </div>
    </div>
  );
}

// ────── 画面入力コンポーネント ──────
export default function TrialConsultationSheet() {
  const { selectedPatient, patients, savePatients, navigate } = useApp();
  const patient = patients.find(p => p.id === selectedPatient?.id) || selectedPatient;

  const [form, setForm] = useState(() => {
    const saved = patient?.trialConsultation;
    return saved ? { ...emptyForm(patient), ...saved } : emptyForm(patient);
  });
  const [saved, setSaved] = useState(!!patient?.trialConsultation);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setSaved(false); };

  const toggleArray = (key, val) => {
    setForm(f => {
      const arr = f[key] || [];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
    setSaved(false);
  };

  const setAdl = (key, val) => {
    setForm(f => ({ ...f, adl: { ...f.adl, [key]: val } }));
    setSaved(false);
  };

  const handleSave = () => {
    const updated = patients.map(p =>
      p.id === patient.id ? { ...p, trialConsultation: form } : p
    );
    savePatients(updated);
    setSaved(true);
  };

  const handlePrint = () => {
    handleSave();
    setTimeout(() => window.print(), 200);
  };

  const inputCls = 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400';
  const labelCls = 'text-xs text-gray-500 mb-0.5 block';
  const sectionTitle = 'text-sm font-bold text-gray-700 border-b border-gray-200 pb-1 mb-3';

  return (
    <>
      {/* ── 印刷専用レイアウト（画面では非表示） ── */}
      <PrintSheet form={form} patientName={patient?.name || ''} />

      {/* ── 画面入力UI（印刷時は非表示） ── */}
      <div className="max-w-2xl mx-auto print:hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('patient-detail', { patient })} className="flex items-center gap-1 text-gray-600 text-sm">
            <ChevronLeft size={16} />戻る
          </button>
          <div className="flex gap-2">
            <button onClick={handleSave} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${saved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'}`}>
              <Save size={14} />{saved ? '保存済み✓' : '保存'}
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 bg-gray-700 text-white text-sm px-3 py-1.5 rounded-lg">
              <Printer size={14} />A4印刷
            </button>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">体験問診シート</h1>
          <p className="text-sm text-gray-500">{patient?.name}様</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow space-y-5">

          {/* ① 基本情報 */}
          <div>
            <div className={sectionTitle}>① 基本情報</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>フリガナ</label>
                <input className={inputCls} value={form.nameKana} onChange={e => set('nameKana', e.target.value)} placeholder="ヤマダ タロウ" />
              </div>
              <div>
                <label className={labelCls}>生年月日</label>
                <input type="date" className={inputCls} value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>年齢</label>
                <div className="flex items-center gap-1">
                  <input className={`${inputCls} w-16`} value={form.age} onChange={e => set('age', e.target.value)} placeholder="80" />
                  <span className="text-sm text-gray-500">歳</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>性別</label>
                <div className="flex gap-4 mt-1">
                  {['男性', '女性'].map(g => (
                    <label key={g} className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={() => set('gender', g)} />{g}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>電話番号</label>
                <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="000-0000-0000" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>住所</label>
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>施設名</label>
                <input className={inputCls} value={form.facilityName} onChange={e => set('facilityName', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>緊急連絡先（続柄）</label>
                <input className={inputCls} value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="長男など" />
              </div>
              <div>
                <label className={labelCls}>緊急連絡先電話</label>
                <input className={inputCls} value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="000-0000-0000" />
              </div>
            </div>
          </div>

          {/* ② ケアマネ */}
          <div>
            <div className={sectionTitle}>② 担当ケアマネジャー</div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls}>担当者名</label><input className={inputCls} value={form.careManagerName} onChange={e => set('careManagerName', e.target.value)} /></div>
              <div><label className={labelCls}>事業所名</label><input className={inputCls} value={form.careManagerOffice} onChange={e => set('careManagerOffice', e.target.value)} /></div>
              <div><label className={labelCls}>電話番号</label><input className={inputCls} value={form.careManagerPhone} onChange={e => set('careManagerPhone', e.target.value)} /></div>
            </div>
          </div>

          {/* ③ 書類確認 */}
          <div>
            <div className={sectionTitle}>③ 書類・お支払い確認</div>
            <div className="grid grid-cols-2 gap-3">
              {[['hasInsurance', '保険証'], ['hasMedicalCert', '医療証'], ['hasMedBook', 'お薬手帳']].map(([key, label]) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <div className="flex gap-3 mt-1">
                    {['あり', 'なし', '確認中'].map(opt => (
                      <label key={opt} className="flex items-center gap-1 text-sm cursor-pointer">
                        <input type="radio" name={key} value={opt} checked={form[key] === opt} onChange={() => set(key, opt)} />{opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <label className={labelCls}>お支払い方法</label>
                <div className="flex gap-3 mt-1">
                  {PAYMENT_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="radio" name="paymentMethod" value={opt} checked={form.paymentMethod === opt} onChange={() => set('paymentMethod', opt)} />{opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ④ 主訴 */}
          <div>
            <div className={sectionTitle}>④ 主訴・お悩み</div>
            <textarea className={`${inputCls} h-16 resize-none`} value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} placeholder="どこがつらいか・何を改善したいか" />
          </div>

          {/* ⑤ 症状チェック */}
          <div>
            <div className={sectionTitle}>⑤ 症状チェック</div>
            <div className="mb-3">
              <label className={labelCls}>気になる部位（複数可）</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {BODY_PARTS.map(part => (
                  <button key={part} type="button" onClick={() => toggleArray('bodyParts', part)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.bodyParts.includes(part) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {part}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className={labelCls}>症状の種類（複数可）</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SYMPTOM_TYPES.map(s => (
                  <button key={s} type="button" onClick={() => toggleArray('symptoms', s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.symptoms.includes(s) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>痛みの強さ（0＝なし　10＝最大）</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="range" min="0" max="10" step="1" value={form.painLevel} onChange={e => set('painLevel', e.target.value)} className="flex-1" />
                <span className="text-sm font-medium w-12 text-center">{form.painLevel !== '' ? `${form.painLevel} / 10` : '—'}</span>
              </div>
            </div>
          </div>

          {/* ⑥ 既往歴・服薬 */}
          <div>
            <div className={sectionTitle}>⑥ 既往歴・現病歴・服薬情報</div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>既往歴・現病歴</label>
                <textarea className={`${inputCls} h-16 resize-none`} value={form.medicalHistory} onChange={e => set('medicalHistory', e.target.value)} placeholder="例：脳梗塞（後遺症あり）、変形性膝関節症、高血圧" />
              </div>
              <div>
                <label className={labelCls}>服薬情報</label>
                <textarea className={`${inputCls} h-14 resize-none`} value={form.currentMeds} onChange={e => set('currentMeds', e.target.value)} placeholder="例：血圧の薬、血液サラサラの薬（ワーファリン）" />
              </div>
            </div>
          </div>

          {/* ⑦ ADL */}
          <div>
            <div className={sectionTitle}>⑦ ADL・生活状況</div>
            <div className="grid grid-cols-2 gap-2">
              {ADL_ITEMS.map(([key, label]) => (
                <div key={key} className="border border-gray-200 rounded p-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
                  <div className="flex gap-2 flex-wrap">
                    {ADL_OPTIONS.map(opt => (
                      <label key={opt} className="flex items-center gap-1 text-xs cursor-pointer">
                        <input type="radio" name={`adl-${key}`} value={opt} checked={form.adl[key] === opt} onChange={() => setAdl(key, opt)} />{opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ⑧ 施術メモ */}
          <div>
            <div className={sectionTitle}>⑧ 体験施術メモ</div>
            <textarea className={`${inputCls} h-20 resize-none`} value={form.treatmentMemo} onChange={e => set('treatmentMemo', e.target.value)} placeholder="施術内容・気づき・患者さんの反応など" />
          </div>

          {/* ⑨ 次回提案 */}
          <div>
            <div className={sectionTitle}>⑨ 次回提案・施術方針</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>訪問頻度の提案</label><input className={inputCls} value={form.nextVisitFreq} onChange={e => set('nextVisitFreq', e.target.value)} placeholder="例：週2回（月・木）" /></div>
              <div><label className={labelCls}>施術部位・内容の方針</label><input className={inputCls} value={form.nextTreatmentPlan} onChange={e => set('nextTreatmentPlan', e.target.value)} placeholder="例：腰部・下肢マッサージ中心" /></div>
            </div>
          </div>

          {/* ⑩ 備考 */}
          <div>
            <div className={sectionTitle}>⑩ 備考・その他メモ</div>
            <textarea className={`${inputCls} h-14 resize-none`} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="自由メモ" />
          </div>

        </div>

        {/* 下部ボタン */}
        <div className="flex gap-3 mt-4">
          <button onClick={handleSave} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium ${saved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'}`}>
            <Save size={16} />{saved ? '保存済み ✓' : '保存する'}
          </button>
          <button onClick={handlePrint} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-700 text-white text-sm font-medium">
            <Printer size={16} />A4印刷
          </button>
        </div>
      </div>
    </>
  );
}
