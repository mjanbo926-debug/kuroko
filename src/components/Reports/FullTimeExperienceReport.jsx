import React, { useState } from 'react';
import { useApp } from '../../App';
import { correctText } from '../../utils/anthropic';
import { generateId, formatDate } from '../../utils/helpers';
import CopyButton from '../Common/CopyButton';
import { Sparkles, Loader2 } from 'lucide-react';

const DAY_FULL = { '月': '月曜日', '火': '火曜日', '水': '水曜日', '木': '木曜日', '金': '金曜日', '土': '土曜日', '日': '日曜日' };

function genAdlSummary(adl) {
  if (!adl) return '';
  const order = [
    ['sittingUp', '座位'], ['standing', '立位'], ['walking', '歩行'],
    ['turning', '寝返り'], ['standingUp', '立ち上り'], ['transfer', '移乗'],
  ];
  return order.filter(([k]) => adl[k]).map(([k, l]) => `${l}（${adl[k]}）`).join('、');
}

function genVisitSchedule(visitDays, visitTimes) {
  return (visitDays || [])
    .map(d => `${DAY_FULL[d] || d}　${visitTimes?.[d] || ''}`)
    .join('\n');
}

export default function FullTimeExperienceReport() {
  const { selectedPatient, reports, saveReports, settings } = useApp();
  const p = selectedPatient;

  const today = new Date();
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日（${'日月火水木金土'[today.getDay()]}）`;

  const [form, setForm] = useState({
    implementDate: today.toISOString().split('T')[0],
    facility: '',
    adlSummary: genAdlSummary(p?.adl),
    startNote: '',
    diagnosisSymptomsText: [p?.diagnosis, p?.medicalHistory].filter(Boolean).join('\n'),
    livingCondition: '',
    communicationNotes: '',
    adlObservation: '',
    physicalFindings: '',
    treatmentResponse: '',
    adminNotes: '',
    treatmentContent: p?.treatmentTemplate || '',
    treatmentGoal: '',
  });
  const [corrected, setCorrected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const buildText = () => {
    const d = new Date(form.implementDate + 'T00:00:00');
    const dl = `${d.getMonth() + 1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
    const visitSched = genVisitSchedule(p?.visitDays, p?.visitTimes);
    const addressLine = [p?.address, form.facility].filter(Boolean).join('・');

    const paragraphs = [
      form.livingCondition,
      form.communicationNotes,
      form.adlObservation,
      form.physicalFindings,
      form.treatmentResponse,
      form.adminNotes,
    ].filter(Boolean).join('\n\n');

    return [
      `${dl}`,
      `体験情報です。`,
      `● ${p?.name}　様`,
      addressLine ? `● ${addressLine}` : null,
      `●${p?.age}歳`,
      form.adlSummary ? `●${form.adlSummary}` : null,
      visitSched ? `●訪問日は\n${visitSched}` : null,
      form.startNote ? `＊${form.startNote}` : null,
      '',
      form.diagnosisSymptomsText ? `《既往歴、症状》\n${form.diagnosisSymptomsText}` : null,
      '',
      paragraphs || null,
      '',
      form.treatmentContent ? `《施術内容》\n${form.treatmentContent}` : null,
      '',
      form.treatmentGoal ? `《目標》\n${form.treatmentGoal}` : null,
    ].filter(v => v !== null).join('\n');
  };

  const handleCorrect = async () => {
    setError('');
    setLoading(true);
    try {
      const rawText = [
        form.livingCondition && `【居住状況】${form.livingCondition}`,
        form.communicationNotes && `【コミュニケーション】${form.communicationNotes}`,
        form.adlObservation && `【ADL所見】${form.adlObservation}`,
        form.physicalFindings && `【身体所見】${form.physicalFindings}`,
        form.treatmentResponse && `【施術中の様子】${form.treatmentResponse}`,
        form.adminNotes && `【手続き・連絡事項】${form.adminNotes}`,
        form.treatmentGoal && `【目標】${form.treatmentGoal}`,
      ].filter(Boolean).join('\n\n');

      const result = await correctText(rawText, settings.apiKey);

      // 添削結果を段落に分解して各フィールドを置き換える
      const sections = {
        livingCondition: extract(result, '居住状況'),
        communicationNotes: extract(result, 'コミュニケーション'),
        adlObservation: extract(result, 'ADL所見'),
        physicalFindings: extract(result, '身体所見'),
        treatmentResponse: extract(result, '施術中の様子'),
        adminNotes: extract(result, '手続き・連絡事項'),
        treatmentGoal: extract(result, '目標'),
      };
      // フィールドが分解できた場合は各フィールドを更新
      const hasAny = Object.values(sections).some(Boolean);
      if (hasAny) {
        setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(sections).filter(([, v]) => v)) }));
        setCorrected('');
      } else {
        // 分解できない場合はまとめて表示
        setCorrected(buildText().replace(
          [form.livingCondition, form.communicationNotes, form.adlObservation, form.physicalFindings, form.treatmentResponse, form.adminNotes].filter(Boolean).join('\n\n'),
          result
        ));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const report = {
      id: generateId(), patientId: p.id, type: 'ft-experience',
      form, correctedText: corrected || buildText(), createdAt: new Date().toISOString(),
    };
    saveReports([...reports, report]);
    setSaved(true);
  };

  const outputText = corrected || buildText();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">体験報告書</h2>
        <p className="text-sm text-gray-500 mt-0.5">正社員先・初回 — LINE出力</p>
      </div>

      <Card title="基本情報">
        <Field label="実施日">
          <input type="date" value={form.implementDate} onChange={e => set('implementDate', e.target.value)} className={inp()} />
        </Field>
        <Field label="施設名（利用中の場合）">
          <input value={form.facility} onChange={e => set('facility', e.target.value)}
            className={inp()} placeholder="例：〇〇小規模多機能型施設" />
        </Field>
        <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-700 space-y-1">
          <p>● {p?.name}　様　/ {p?.age}歳</p>
          {p?.address && <p>● {p.address}</p>}
          <p>● 訪問日：{genVisitSchedule(p?.visitDays, p?.visitTimes).replace(/\n/g, '　')}</p>
        </div>
      </Card>

      <Card title="ADLサマリー（冒頭箇条書き用）">
        <Field label="ADL概要">
          <textarea value={form.adlSummary} onChange={e => set('adlSummary', e.target.value)}
            className={ta()} rows={2}
            placeholder="例：座位（自立）、立位（一部介助）、歩行（手引き）&#10;寝返り（一部介助）" />
        </Field>
        <Field label="開始時期メモ（＊の後に続くテキスト）">
          <input value={form.startNote} onChange={e => set('startNote', e.target.value)}
            className={inp()} placeholder="例：ご家族様と相談の上、開始時期を決定する。" />
        </Field>
      </Card>

      <Card title="《既往歴、症状》">
        <textarea value={form.diagnosisSymptomsText} onChange={e => set('diagnosisSymptomsText', e.target.value)}
          className={ta()} rows={4}
          placeholder="例：脳出血後遺症&#10;高次脳機能障害&#10;心房細動&#10;左上腕の疼痛、左母趾の違和感" />
      </Card>

      <Card title="本文（段落）">
        <Field label="居住状況">
          <textarea value={form.livingCondition} onChange={e => set('livingCondition', e.target.value)}
            className={ta()} rows={2} placeholder="例：日中は小規模多機能型施設を利用。夜間はご自宅にて長女様・お孫様と同居。" />
        </Field>
        <Field label="コミュニケーション">
          <textarea value={form.communicationNotes} onChange={e => set('communicationNotes', e.target.value)}
            className={ta()} rows={2} placeholder="例：高次脳機能障害の影響により言葉の理解に時間を要するが、声かけでコミュニケーション可能。" />
        </Field>
        <Field label="ADL所見">
          <textarea value={form.adlObservation} onChange={e => set('adlObservation', e.target.value)}
            className={ta()} rows={2} placeholder="例：座位は自立。寝返り・立ち上がり・歩行は一部介助で可能。" />
        </Field>
        <Field label="身体所見">
          <textarea value={form.physicalFindings} onChange={e => set('physicalFindings', e.target.value)}
            className={ta()} rows={3} placeholder="例：左上腕に痛みの訴えあり。左母趾にも違和感。痺れなし。拘縮は軽度。左眼はほぼ見えていない様子。" />
        </Field>
        <Field label="施術中の様子">
          <textarea value={form.treatmentResponse} onChange={e => set('treatmentResponse', e.target.value)}
            className={ta()} rows={2} placeholder="例：拒否なく落ち着いて受けておられ、施術後には左上腕の違和感がやや軽減した様子がみられた。" />
        </Field>
        <Field label="手続き・連絡事項">
          <textarea value={form.adminNotes} onChange={e => set('adminNotes', e.target.value)}
            className={ta()} rows={2} placeholder="例：同意書・支払い等の手続きは今後ご家族様と直接やり取り。連絡済み、アポイント調整中。" />
        </Field>
      </Card>

      <Card title="《施術内容》">
        <textarea value={form.treatmentContent} onChange={e => set('treatmentContent', e.target.value)}
          className={ta()} rows={2} placeholder="例：全身の軽擦とマッサージ、関節可動域訓練、ローラー鍼" />
      </Card>

      <Card title="《目標》">
        <textarea value={form.treatmentGoal} onChange={e => set('treatmentGoal', e.target.value)}
          className={ta()} rows={3} placeholder="例：筋緊張・疼痛緩和、血流促進&#10;関節拘縮の改善&#10;ADLの向上" />
      </Card>

      <button onClick={handleCorrect} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3.5 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60">
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
        {loading ? 'AI添削中...' : 'AIで添削する'}
      </button>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

      <Card title="報告文プレビュー（コピーしてLINEへ）">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-xl p-4 leading-relaxed max-h-[500px] overflow-y-auto">
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
    </div>
  );
}

// 添削結果から各セクションを抽出するヘルパー
function extract(text, header) {
  const regex = new RegExp(`【${header}】\\s*([\\s\\S]*?)(?=【[^】]+】|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : '';
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
