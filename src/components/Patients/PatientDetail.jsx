import React, { useState } from 'react';
import { useApp } from '../../App';
import { Edit, FileText, Clock, ChevronRight, ChevronDown, ChevronUp, MapPin, Calendar, AlertCircle, User, NotebookPen, BedDouble, Plus, Trash2, XCircle, AlertTriangle } from 'lucide-react';
import { formatDate, REPORT_LABELS } from '../../utils/helpers';

const ADL_LABELS = [
  ['turning', '寝返り'], ['sittingUp', '起き上り'], ['standingUp', '立ち上り'],
  ['transfer', '移乗'], ['standing', '立位'], ['walking', '歩行'],
];

const STATUS_OPTIONS = [
  { value: 'hospitalized', label: '入院中', color: 'red' },
  { value: 'other', label: 'その他', color: 'gray' },
];

export default function PatientDetail() {
  const { selectedPatient, patients, reports, patientDailyReports, navigate, savePatients, saveReports } = useApp();
  const [reportHistoryOpen, setReportHistoryOpen] = useState(false);
  const [dailyHistoryOpen, setDailyHistoryOpen] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [treatmentTemplate, setTreatmentTemplate] = useState(null); // nullは未編集を示す
  const [newSpotDate, setNewSpotDate] = useState('');
  const [newSpotTime, setNewSpotTime] = useState('');
  const [newAbsentDate, setNewAbsentDate] = useState('');
  const [showTerminateForm, setShowTerminateForm] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateReasonNote, setTerminateReasonNote] = useState('');
  const [terminateDate, setTerminateDate] = useState(new Date().toISOString().split('T')[0]);

  const patient = patients.find(p => p.id === selectedPatient?.id) || selectedPatient;
  if (!patient) return null;

  const setPatientStatus = (status, note = '') => {
    const updated = patients.map(p =>
      p.id === patient.id ? { ...p, status, statusNote: note } : p
    );
    savePatients(updated);
  };

  const addSpotDate = () => {
    if (!newSpotDate) return;
    const current = patient.spotDates || [];
    if (current.some(s => (s.date || s) === newSpotDate)) return;
    const entry = { date: newSpotDate, time: newSpotTime };
    const sorted = [...current, entry].sort((a, b) => (a.date || a).localeCompare(b.date || b));
    const updated = patients.map(p => p.id === patient.id ? { ...p, spotDates: sorted } : p);
    savePatients(updated);
    setNewSpotDate('');
    setNewSpotTime('');
  };

  const removeSpotDate = (date) => {
    const updated = patients.map(p =>
      p.id === patient.id ? { ...p, spotDates: (p.spotDates || []).filter(s => (s.date || s) !== date) } : p
    );
    savePatients(updated);
  };

  const addAbsentDate = () => {
    if (!newAbsentDate) return;
    const current = patient.absentDates || [];
    if (current.includes(newAbsentDate)) return;
    const updated = patients.map(p =>
      p.id === patient.id ? { ...p, absentDates: [...current, newAbsentDate].sort() } : p
    );
    savePatients(updated);
    setNewAbsentDate('');
  };

  const removeAbsentDate = (date) => {
    const updated = patients.map(p =>
      p.id === patient.id ? { ...p, absentDates: (p.absentDates || []).filter(d => d !== date) } : p
    );
    savePatients(updated);
  };

  const handleTerminate = () => {
    if (!terminateReason) return;
    const reason = terminateReason === 'その他' && terminateReasonNote
      ? `その他（${terminateReasonNote}）`
      : terminateReason;
    const updated = patients.map(p =>
      p.id === patient.id
        ? { ...p, terminated: true, terminatedReason: reason, terminatedDate: terminateDate, status: '', statusNote: '' }
        : p
    );
    savePatients(updated);
    setShowTerminateForm(false);
  };

  const handleReactivate = () => {
    const updated = patients.map(p =>
      p.id === patient.id
        ? { ...p, terminated: false, terminatedReason: '', terminatedDate: '' }
        : p
    );
    savePatients(updated);
  };

  const days = Array.isArray(patient.visitDays) ? patient.visitDays.join('・') : (patient.visitDays || '');
  const patientReports = reports
    .filter(r => r.patientId === patient.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const dailyReports = (patientDailyReports || [])
    .filter(r => r.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const todayStr = new Date().toISOString().split('T')[0];
  const hasTodayReport = dailyReports.some(r => r.date === todayStr);

  // 副業先：施術報告書リマインダー計算
  const lastSixMonthReport = patientReports
    .filter(r => r.type === 'pt-sixmonth')[0];
  const lastReportDate = lastSixMonthReport?.createdAt?.split('T')[0] || null;
  // 手動設定 or 自動計算（前回+6ヶ月）
  const nextDueDate = (() => {
    if (patient.nextReportDueDate) return new Date(patient.nextReportDueDate);
    if (lastReportDate) {
      const d = new Date(lastReportDate);
      d.setMonth(d.getMonth() + 6);
      return d;
    }
    return null;
  })();
  const daysUntilDue = nextDueDate
    ? Math.round((nextDueDate.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
    : null;

  const reportButtons = patient.type === 'fullTime'
    ? [
        { view: 'report-ft-experience', label: '体験報告書', sub: '初回・LINE出力', color: 'blue' },
        { view: 'report-ft-monthly', label: '月次報告書', sub: '毎月・LINE出力', color: 'blue' },
      ]
    : [
        { view: 'report-pt-experience', label: '体験報告書', sub: '初回・Excel出力', color: 'emerald' },
        { view: 'report-pt-sixmonth', label: '施術報告書', sub: '半年毎・Excel出力', color: 'emerald' },
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              patient.type === 'fullTime' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {patient.type === 'fullTime' ? '正社員先' : '副業先'}
            </span>
            {patient.visitSchedule === 'spot' && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-700">スポット</span>
            )}
            {patient.status && (() => {
              const opt = STATUS_OPTIONS.find(o => o.value === patient.status);
              const colors = { yellow: 'bg-yellow-100 text-yellow-700', red: 'bg-red-100 text-red-700', gray: 'bg-gray-200 text-gray-600' };
              return (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colors[opt?.color || 'gray']}`}>
                  {opt?.label || patient.status}{patient.statusNote ? `：${patient.statusNote}` : ''}
                </span>
              );
            })()}
          </div>
          <p className="text-gray-500 text-sm">{patient.age}歳 / {patient.gender}</p>
        </div>
        <button onClick={() => navigate('patient-form', { editingPatient: patient })}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition-colors">
          <Edit size={15} /><span>編集</span>
        </button>
      </div>

      {/* ステータス設定 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-3">
          <BedDouble size={16} className="text-gray-400" />状態
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(opt => {
            const active = patient.status === opt.value;
            const colors = {
              yellow: active ? 'bg-yellow-400 text-white' : 'bg-yellow-50 text-yellow-700 border border-yellow-200',
              red: active ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 border border-red-200',
              gray: active ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-600 border border-gray-200',
            };
            return (
              <button key={opt.value} onClick={() => {
                if (active) { setPatientStatus(''); setStatusNote(''); }
                else { setPatientStatus(opt.value, opt.value === 'other' ? statusNote : ''); }
              }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${colors[opt.color]}`}>
                {active ? `✓ ${opt.label}` : opt.label}
              </button>
            );
          })}
          {patient.status && (
            <button onClick={() => { setPatientStatus(''); setStatusNote(''); }}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-500 transition-colors">
              解除
            </button>
          )}
        </div>
        {patient.status === 'other' && (
          <div className="mt-2 flex gap-2">
            <input value={statusNote} onChange={e => setStatusNote(e.target.value)}
              placeholder="メモ（例：外出中、コロナ療養中）"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={() => setPatientStatus('other', statusNote)}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">保存</button>
          </div>
        )}
      </div>

      {/* お休み予定日 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-3">
          <Calendar size={16} className="text-orange-400" />お休み予定日
        </div>
        <div className="flex gap-2 mb-3">
          <input type="date" value={newAbsentDate} onChange={e => setNewAbsentDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={addAbsentDate}
            className="flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
            <Plus size={15} />追加
          </button>
        </div>
        {(patient.absentDates || []).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-1">登録されていません</p>
        ) : (
          <div className="space-y-1.5">
            {(patient.absentDates || []).map(d => (
              <div key={d} className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl">
                <span className="text-sm text-gray-700">{d.replace(/-/g, '/')}</span>
                <button onClick={() => removeAbsentDate(d)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* スポット患者の訪問予定日 */}
      {patient.visitSchedule === 'spot' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-3">
            <Calendar size={16} className="text-purple-500" />訪問予定日
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <input type="date" value={newSpotDate} onChange={e => setNewSpotDate(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            <input type="time" value={newSpotTime} onChange={e => setNewSpotTime(e.target.value)}
              className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            <button onClick={addSpotDate}
              className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
              <Plus size={15} />追加
            </button>
          </div>
          {(patient.spotDates || []).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">予定日が登録されていません</p>
          ) : (
            <div className="space-y-1.5">
              {(patient.spotDates || []).map(s => {
                const d = s.date || s;
                const t = s.time || '';
                return (
                  <div key={d} className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-xl">
                    <span className="text-sm text-gray-700">{d.replace(/-/g, '/')}{t ? `　${t}` : ''}</span>
                    <button onClick={() => removeSpotDate(d)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <InfoCard>
        <InfoRow icon={<MapPin size={15} />} label="住所" value={patient.address} />
        <InfoRow icon={<Calendar size={15} />} label="訪問日" value={
          Array.isArray(patient.visitDays) && patient.visitDays.length > 0
            ? patient.visitDays.map(d => {
                const t = patient.visitTimes?.[d] || patient.visitTime || '';
                return t ? `${d}曜 ${t}` : `${d}曜`;
              }).join('　')
            : (days ? `${days}曜日` : '')
        } />
        <InfoRow icon={<Clock size={15} />} label="開始日" value={formatDate(patient.startDate)} />
        {patient.diagnosis && <InfoRow icon={<User size={15} />} label="傷病名" value={patient.diagnosis} />}
        {patient.medicalHistory && <InfoRow icon={<User size={15} />} label="既往歴" value={patient.medicalHistory} />}
      </InfoCard>

      {Object.values(patient.adl || {}).some(Boolean) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">ADL状況</h3>
          <div className="grid grid-cols-3 gap-2">
            {ADL_LABELS.map(([key, label]) => patient.adl?.[key] ? (
              <div key={key} className="text-center bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                <div className="text-sm font-medium text-gray-800">{patient.adl[key]}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {patient.cautions && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-2">
            <AlertCircle size={16} />注意事項
          </div>
          <p className="text-amber-800 text-sm whitespace-pre-wrap">{patient.cautions}</p>
        </div>
      )}

      {(patient.consentDoctor || patient.consentHospital || patient.careManager) && (
        <InfoCard title="関連情報">
          {patient.consentDoctor && <InfoRow label="同意医師" value={patient.consentDoctor} />}
          {patient.consentHospital && <InfoRow label="同意病院" value={patient.consentHospital} />}
          {patient.careManager && <InfoRow label="ケアマネージャー" value={patient.careManager} />}
        </InfoCard>
      )}

      {/* 副業先：日報セクション */}

      {/* 報告書作成 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">報告書作成</h3>

        {/* 正社員先：施術内容テンプレート */}
        {patient.type === 'fullTime' && (
          <div className="mb-3 space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">施術内容テンプレート（月次報告書に自動入力）</label>
              <textarea
                value={treatmentTemplate !== null ? treatmentTemplate : (patient.treatmentTemplate || '')}
                onChange={e => setTreatmentTemplate(e.target.value)}
                rows={4}
                placeholder="例：頸肩部・下肢のマッサージを行い筋緊張や疼痛の緩和、血流循環の改善を図っています。マッサージ後、ストレッチや関節可動域訓練を行い柔軟性の改善と関節拘縮の予防・可動域の改善に取り組んでいます。"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-gray-800"
              />
            </div>
            <button
              onClick={() => {
                const val = treatmentTemplate !== null ? treatmentTemplate : (patient.treatmentTemplate || '');
                const updated = patients.map(p =>
                  p.id === patient.id ? { ...p, treatmentTemplate: val } : p
                );
                savePatients(updated);
                setTreatmentTemplate(null);
              }}
              className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              テンプレートを保存
            </button>
          </div>
        )}

        {/* 副業先：施術報告書の要否設定＋リマインダー */}
        {patient.type === 'partTime' && (
          <div className="space-y-2 mb-3">
            {/* 要否トグル */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-700">施術報告書（半年毎）が必要</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {patient.requiresSixMonthReport === false ? '不要（複数名担当など）' : '必要（担当者として作成）'}
                </p>
              </div>
              <button
                onClick={() => {
                  const current = patient.requiresSixMonthReport !== false;
                  const updated = patients.map(p =>
                    p.id === patient.id ? { ...p, requiresSixMonthReport: !current } : p
                  );
                  savePatients(updated);
                }}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  patient.requiresSixMonthReport !== false ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  patient.requiresSixMonthReport !== false ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* リマインダー（要フラグONの場合のみ） */}
            {patient.requiresSixMonthReport !== false && (
              <div className="space-y-2">
                {/* 次回作成日の手動入力 */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <label className="text-xs text-gray-500 shrink-0">次回作成日</label>
                  <input
                    type="date"
                    value={patient.nextReportDueDate || ''}
                    onChange={e => {
                      const updated = patients.map(p =>
                        p.id === patient.id ? { ...p, nextReportDueDate: e.target.value || undefined } : p
                      );
                      savePatients(updated);
                    }}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  {patient.nextReportDueDate && (
                    <button
                      onClick={() => {
                        const updated = patients.map(p =>
                          p.id === patient.id ? { ...p, nextReportDueDate: undefined } : p
                        );
                        savePatients(updated);
                      }}
                      className="text-gray-300 hover:text-red-400 transition-colors">
                      <XCircle size={15} />
                    </button>
                  )}
                </div>

                {/* 状態バッジ */}
                {(() => {
                  if (!nextDueDate && !lastReportDate) return (
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                      <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
                      <p className="text-xs font-semibold text-yellow-800">次回作成日を入力してください</p>
                    </div>
                  );
                  if (!nextDueDate) return null;
                  const nextStr = `${nextDueDate.getFullYear()}/${nextDueDate.getMonth()+1}/${nextDueDate.getDate()}`;
                  const lastStr = lastReportDate?.replace(/-/g, '/');
                  if (daysUntilDue < 0) return (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <AlertTriangle size={14} className="text-red-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-red-700">{Math.abs(daysUntilDue)}日超過　期限：{nextStr}</p>
                        {lastStr && <p className="text-xs text-red-400">前回：{lastStr}</p>}
                      </div>
                    </div>
                  );
                  if (daysUntilDue <= 30) return (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                      <Clock size={14} className="text-orange-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-orange-700">あと{daysUntilDue}日　期限：{nextStr}</p>
                        {lastStr && <p className="text-xs text-orange-400">前回：{lastStr}</p>}
                      </div>
                    </div>
                  );
                  return (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                      <Clock size={14} className="text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-700">次回：{nextStr}（あと{daysUntilDue}日）</p>
                        {lastStr && <p className="text-xs text-green-400">前回：{lastStr}</p>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {reportButtons.map(({ view, label, sub, color }) => (
            <button key={view} onClick={() => navigate(view, { patient })}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                color === 'blue'
                  ? 'bg-blue-50 border-blue-100 hover:bg-blue-100'
                  : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100'}`}>
              <div className="flex items-center gap-3">
                <FileText size={20} className={color === 'blue' ? 'text-blue-600' : 'text-emerald-600'} />
                <div className="text-left">
                  <div className={`font-semibold text-sm ${color === 'blue' ? 'text-blue-800' : 'text-emerald-800'}`}>
                    {label}
                    {view === 'report-pt-sixmonth' && dailyReports.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-emerald-600">日報{dailyReports.length}件あり</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{sub}</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* 報告書履歴（常時表示） */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600">
            報告書履歴 <span className="text-gray-400 font-normal">({patientReports.length}件)</span>
          </h3>
        </div>
        {patientReports.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">保存された報告書はありません</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {patientReports.map(r => {
              const viewMap = {
                'pt-experience': 'report-pt-experience',
                'pt-sixmonth': 'report-pt-sixmonth',
                'ft-experience': 'report-ft-experience',
                'ft-monthly': 'report-ft-monthly',
              };
              const view = viewMap[r.type];
              return (
                <div key={r.id} className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => view && navigate(view, { patient })}
                    className="flex-1 flex items-center justify-between text-left min-w-0">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800">{REPORT_LABELS[r.type] || r.type}</div>
                      <div className="text-xs text-gray-500">
                        {r.year && r.month ? `${r.year}年${r.month}月` : formatDate(r.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mx-2">
                      <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('ja-JP')}</span>
                      {view && <ChevronRight size={15} className="text-gray-300" />}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`「${REPORT_LABELS[r.type] || r.type}」を削除しますか？`)) {
                        saveReports(reports.filter(rep => rep.id !== r.id));
                      }
                    }}
                    className="p-2 text-gray-300 hover:text-red-500 active:text-red-600 transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 施術終了 */}
      {patient.terminated ? (
        <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-600 font-semibold text-sm">
            <XCircle size={16} className="text-gray-500" />施術終了済み
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p>終了日：<span className="font-medium">{patient.terminatedDate?.replace(/-/g, '/') || '不明'}</span></p>
            <p>理由：<span className="font-medium">{patient.terminatedReason || '不明'}</span></p>
          </div>
          <button onClick={handleReactivate}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            終了を取り消して再開する
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowTerminateForm(!showTerminateForm)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-gray-400" />
              施術終了を記録する
            </div>
            {showTerminateForm ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {showTerminateForm && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 bg-white">
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">終了理由</p>
                <div className="flex gap-2 flex-wrap">
                  {['お亡くなり', '転居', '卒業', 'その他'].map(r => (
                    <button key={r} onClick={() => setTerminateReason(r)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        terminateReason === r
                          ? 'bg-gray-700 text-white border-gray-700'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {r}
                    </button>
                  ))}
                </div>
                {terminateReason === 'その他' && (
                  <input value={terminateReasonNote} onChange={e => setTerminateReasonNote(e.target.value)}
                    placeholder="理由を入力..."
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">終了日</p>
                <input type="date" value={terminateDate} onChange={e => setTerminateDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <button onClick={handleTerminate} disabled={!terminateReason}
                className="w-full py-2.5 bg-gray-700 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors">
                施術終了として記録する
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
      {title && <h3 className="text-sm font-semibold text-gray-600 mb-1">{title}</h3>}
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>}
      <span className="text-gray-500 shrink-0 w-24">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
