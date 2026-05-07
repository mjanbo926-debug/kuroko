import React, { useState } from 'react';
import { streamGenerateReport } from '../../utils/anthropic';
import { Sparkles, Loader2, RotateCcw, ClipboardCheck, FileInput } from 'lucide-react';
import CopyButton from '../Common/CopyButton';

export default function ReportAIGenerator({ patient, dailyReportList, period, reportType, apiKey, onAutoFill }) {
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const count = dailyReportList.length;

  const handleGenerate = async () => {
    if (!apiKey) { setError('APIキーが設定されていません。設定画面で入力してください。'); return; }
    if (count === 0) { setError('対象期間内の日報がありません。'); return; }
    setGenerating(true);
    setOutput('');
    setError('');
    try {
      await streamGenerateReport(
        { patientName: patient.name, period, dailyReportList, reportType },
        apiKey,
        (chunk) => setOutput(prev => prev + chunk),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
              <Sparkles size={16} className="text-purple-500" />AI報告書を生成
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {count > 0
                ? `日報 ${count}件 → ${reportType === 'monthly' ? '①〜⑥の月次フォーマット' : '■項目の半年次フォーマット'}で生成`
                : '対象期間内の日報がありません'}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || count === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0 ${
              count === 0
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60'}`}>
            {generating
              ? <><Loader2 size={15} className="animate-spin" />生成中...</>
              : <><Sparkles size={15} />{output ? '再生成' : '生成する'}</>}
          </button>
        </div>
      </div>

      {/* 出力エリア */}
      {(generating || output) && (
        <div className="px-5 py-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap min-h-20 relative">
            {output}
            {generating && (
              <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>

          {/* 文字数 */}
          {output && !generating && (
            <p className="text-xs text-gray-400 text-right mt-1">{output.length}文字</p>
          )}

          {/* アクションボタン */}
          {output && !generating && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <CopyButton text={output} />
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                <RotateCcw size={14} />再生成
              </button>
              {onAutoFill && (
                <button
                  onClick={() => onAutoFill(output)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                  <FileInput size={14} />フォームに反映
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-5 pb-4">
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        </div>
      )}
    </div>
  );
}
