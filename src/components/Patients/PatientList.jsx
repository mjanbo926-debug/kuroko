import React, { useState } from 'react';
import { useApp } from '../../App';
import { Plus, Search, User, MapPin, Calendar } from 'lucide-react';

export default function PatientList() {
  const { patients, navigate } = useApp();
  const [tab, setTab] = useState('fullTime');
  const [query, setQuery] = useState('');
  const [showTerminated, setShowTerminated] = useState(false);

  const activePatients = patients.filter(p => !p.terminated);
  const terminatedPatients = patients.filter(p => p.terminated);

  const filtered = activePatients.filter(p =>
    p.type === tab &&
    (!query || p.name?.includes(query) || p.address?.includes(query))
  );
  const terminatedFiltered = terminatedPatients.filter(p =>
    p.type === tab &&
    (!query || p.name?.includes(query) || p.address?.includes(query))
  );
  const ftCount = activePatients.filter(p => p.type === 'fullTime').length;
  const ptCount = activePatients.filter(p => p.type === 'partTime').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">患者一覧</h2>
        <button
          onClick={() => navigate('patient-form', { editingPatient: null })}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={18} /><span>患者登録</span>
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-4">
        {[['fullTime', '正社員先', ftCount], ['partTime', '副業先', ptCount]].map(([val, label, count]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === val ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{count}</span>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="患者名・住所で検索..." value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User size={48} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm">患者が登録されていません</p>
          <p className="text-xs mt-1">「患者登録」から追加してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <PatientCard key={p.id} patient={p}
              onClick={() => navigate('patient-detail', { patient: p })} />
          ))}
        </div>
      )}

      {terminatedFiltered.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowTerminated(!showTerminated)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 py-2">
            {showTerminated ? '▲' : '▼'} 終了した患者（{terminatedFiltered.length}名）
          </button>
          {showTerminated && (
            <div className="space-y-3 mt-2">
              {terminatedFiltered.map(p => (
                <PatientCard key={p.id} patient={p} terminated
                  onClick={() => navigate('patient-detail', { patient: p })} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PatientCard({ patient, onClick, terminated }) {
  const days = Array.isArray(patient.visitDays)
    ? patient.visitDays.join('・')
    : (patient.visitDays || '');
  return (
    <button onClick={onClick}
      className={`w-full rounded-2xl shadow-sm border p-4 text-left transition-all ${
        terminated
          ? 'bg-gray-50 border-gray-200 opacity-70 hover:opacity-90'
          : 'bg-white border-gray-100 hover:shadow-md hover:border-blue-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className={`font-semibold text-lg ${terminated ? 'text-gray-500' : 'text-gray-900'}`}>{patient.name}</span>
            <span className="text-gray-400 text-sm">{patient.age}歳 / {patient.gender}</span>
            {terminated && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-medium">
                終了：{patient.terminatedReason}
              </span>
            )}
          </div>
          {patient.address && (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-1">
              <MapPin size={13} /><span className="truncate">{patient.address}</span>
            </div>
          )}
          {!terminated && days && (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              <Calendar size={13} /><span>{days}曜日 {patient.visitTime}</span>
            </div>
          )}
          {terminated && patient.terminatedDate && (
            <p className="text-xs text-gray-400 mt-0.5">終了日：{patient.terminatedDate.replace(/-/g, '/')}</p>
          )}
          {patient.diagnosis && (
            <p className="text-xs text-gray-400 mt-1 truncate">{patient.diagnosis}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
          patient.type === 'fullTime' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {patient.type === 'fullTime' ? '正社員先' : '副業先'}
        </span>
      </div>
    </button>
  );
}
