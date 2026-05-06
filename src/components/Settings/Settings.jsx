import React, { useState, useRef } from 'react';
import { useApp } from '../../App';
import { authStorage, storage } from '../../utils/storage';
import { Key, Lock, Eye, EyeOff, Check, AlertCircle, Download, Upload, Smartphone, DatabaseBackup, Shield } from 'lucide-react';

const DATA_KEYS = ['patients', 'reports', 'dailyReports', 'patientDailyReports', 'scheduleOverrides'];

export default function Settings() {
  const { settings, saveSettings, savePatients, saveReports, saveDailyReports, savePatientDailyReports, saveScheduleOverrides } = useApp();

  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const [importStatus, setImportStatus] = useState(''); // '' | 'success' | 'error'
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef();

  const handleSaveApiKey = () => {
    saveSettings({ ...settings, apiKey });
    setApiSaved(true);
    setTimeout(() => setApiSaved(false), 2500);
  };

  const handleChangePassword = () => {
    setPwError('');
    if (oldPw !== authStorage.getPassword()) { setPwError('現在のパスワードが正しくありません。'); return; }
    if (newPw.length < 4) { setPwError('新しいパスワードは4文字以上で設定してください。'); return; }
    if (newPw !== confirmPw) { setPwError('新しいパスワードが一致しません。'); return; }
    authStorage.setPassword(newPw);
    setOldPw(''); setNewPw(''); setConfirmPw('');
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  };

  // --- データエクスポート ---
  const handleExport = () => {
    const data = {};
    DATA_KEYS.forEach(key => { data[key] = storage.get(key, key.endsWith('s') ? [] : {}); });
    data._exportedAt = new Date().toISOString();
    data._version = 1;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `massage_data_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- データインポート ---
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportStatus('');
    setImportMsg('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data._version) throw new Error('このファイルはこのアプリのバックアップではありません。');

        const counts = {};
        if (data.patients) { savePatients(data.patients); counts['患者'] = data.patients.length; }
        if (data.reports) { saveReports(data.reports); counts['報告書'] = data.reports.length; }
        if (data.dailyReports) { saveDailyReports(data.dailyReports); counts['スケジュール日報'] = data.dailyReports.length; }
        if (data.patientDailyReports) { savePatientDailyReports(data.patientDailyReports); counts['施術日報'] = data.patientDailyReports.length; }
        if (data.scheduleOverrides) { saveScheduleOverrides(data.scheduleOverrides); }

        const summary = Object.entries(counts).map(([k, v]) => `${k}${v}件`).join('、');
        setImportStatus('success');
        setImportMsg(`読み込み完了：${summary}`);
      } catch (err) {
        setImportStatus('error');
        setImportMsg(err.message || 'ファイルの読み込みに失敗しました。');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const patientCount = (storage.get('patients', [])).length;
  const reportCount = (storage.get('reports', [])).length;
  const dailyCount = (storage.get('dailyReports', [])).length;
  const exportedAt = patientCount > 0 ? `患者${patientCount}名のデータあり` : 'データなし';

  const handleBackup = () => {
    const data = {};
    DATA_KEYS.forEach(key => { data[key] = storage.get(key, key.endsWith('s') ? [] : {}); });
    data._exportedAt = new Date().toISOString();
    data._version = 1;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const d = new Date();
    a.download = `kuroko_backup_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800">設定</h2>

      {/* バックアップ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Shield size={18} className="text-emerald-600" />データバックアップ
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 space-y-1">
          <p>患者 <span className="font-bold text-gray-800">{patientCount}名</span>
             報告書 <span className="font-bold text-gray-800">{reportCount}件</span>
             日報 <span className="font-bold text-gray-800">{dailyCount}件</span></p>
          <p className="text-xs text-gray-400">定期的にバックアップを保存することをおすすめします</p>
        </div>
        <button onClick={handleBackup}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          <Download size={18} />今すぐバックアップ
        </button>
      </div>

      {/* データ移行 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Smartphone size={18} className="text-blue-600" />スマホへのデータ移行
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">手順</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>このPC画面で「エクスポート」→ JSONファイルを保存</li>
            <li>そのファイルをスマホに送る（AirDrop・メール・LINEなど）</li>
            <li>スマホのブラウザでアプリを開き「インポート」でファイルを選択</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <button onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
            <Download size={18} />エクスポート
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors">
            <Upload size={18} />インポート
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        <p className="text-xs text-gray-400 text-center">{exportedAt}</p>

        {importStatus === 'success' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
            <Check size={16} />{importMsg}
          </div>
        )}
        {importStatus === 'error' && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
            <AlertCircle size={16} />{importMsg}
          </div>
        )}
      </div>

      {/* APIキー */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Key size={18} className="text-blue-600" />AI添削 APIキー設定
        </div>
        <p className="text-sm text-gray-500">
          Anthropic APIキーを設定すると、AI添削機能が使えます。<br />
          <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
            className="text-blue-600 underline">console.anthropic.com</a> で取得できます。
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">APIキーはこのデバイスにのみ保存されます。スマホ側でも別途入力が必要です。</p>
        </div>
        <div className="relative">
          <input type={showKey ? 'text' : 'password'} value={apiKey}
            onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
          <button type="button" onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button onClick={handleSaveApiKey}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            apiSaved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {apiSaved ? <><Check size={16} />保存しました</> : 'APIキーを保存'}
        </button>
      </div>

      {/* パスワード変更 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Lock size={18} className="text-blue-600" />パスワード変更
        </div>
        <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
          placeholder="現在のパスワード"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
          placeholder="新しいパスワード（4文字以上）"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
          placeholder="新しいパスワード（確認）"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
        {pwSaved && <p className="text-green-600 text-sm flex items-center gap-1"><Check size={14} />パスワードを変更しました</p>}
        <button onClick={handleChangePassword}
          className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors">
          パスワードを変更
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="font-semibold text-gray-700 mb-2 text-sm">アプリについて</div>
        <div className="text-sm text-gray-500 space-y-1">
          <p>訪問マッサージ 業務管理アプリ v1.0</p>
          <p>データはすべてこのデバイスのブラウザに保存されます。</p>
          <p>AI添削には Anthropic API (claude-sonnet-4-20250514) を使用します。</p>
        </div>
      </div>
    </div>
  );
}
