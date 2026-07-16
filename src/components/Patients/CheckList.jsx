import React, { useState } from 'react';
import { useApp } from '../../App';
import { Printer, Plus, X, ChevronLeft } from 'lucide-react';

const DEFAULT_ITEMS = ['保険証確認', 'お知らせ配布'];

export default function CheckList() {
  const { patients, settings, saveSettings, navigate } = useApp();
  const [newItem, setNewItem] = useState('');

  const items = settings.checkListItems || DEFAULT_ITEMS;

  const addItem = () => {
    if (!newItem.trim()) return;
    saveSettings({ ...settings, checkListItems: [...items, newItem.trim()] });
    setNewItem('');
  };

  const removeItem = (idx) => {
    saveSettings({ ...settings, checkListItems: items.filter((_, i) => i !== idx) });
  };

  const ftPatients = patients.filter(p => p.type === 'fullTime' && !p.terminated && !p.isTrial);

  return (
    <>
      <style>{`
        @media print {
          #screen-ui { display: none !important; }
          #print-sheet { display: block !important; }
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body { margin: 0; }
        }
        #print-sheet { display: none; }
      `}</style>

      {/* 画面UI */}
      <div id="screen-ui" className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('patients')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-gray-800">確認チェックリスト</h2>
        </div>

        {/* チェック項目設定 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">チェック項目</p>
          {items.length === 0 && <p className="text-sm text-gray-400">項目がありません</p>}
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700">{item}</span>
                <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 p-1 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <input
              type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="項目を追加（例：同意書確認）"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={addItem}
              className="flex items-center gap-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Plus size={15} />追加
            </button>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 font-medium">
          正社員先 {ftPatients.length}名のチェックリストを印刷します
        </div>

        <button onClick={() => window.print()}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-4 rounded-2xl font-semibold hover:bg-gray-700 transition-colors">
          <Printer size={20} />印刷する
        </button>
      </div>

      {/* 印刷シート */}
      <div id="print-sheet">
        <PrintSheet patients={ftPatients} items={items} />
      </div>
    </>
  );
}

function PrintSheet({ patients, items }) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const colW = items.length > 0 ? Math.min(80, Math.floor(180 / items.length)) : 80;

  // A4印刷可能高さ(297mm - 余白16mm) - タイトル(14mm) - ヘッダ行(12mm) = 255mm を行数で割る
  const rowH = `${Math.floor(255 / Math.max(patients.length, 1))}mm`;

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#111' }}>
      {/* タイトル */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>確認チェックリスト　正社員先</div>
        <div style={{ fontSize: '12px', color: '#555' }}>印刷日：{dateStr}</div>
      </div>

      {/* テーブル */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ height: '12mm' }}>
            <th style={thStyle({ width: '28px' })}>No.</th>
            <th style={thStyle({})}>患者名</th>
            <th style={thStyle({ width: '60px' })}>訪問曜日</th>
            {items.map((item, i) => (
              <th key={i} style={thStyle({ width: `${colW}px`, textAlign: 'center' })}>{item}</th>
            ))}
            <th style={thStyle({ width: '90px', textAlign: 'center' })}>備考</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p, i) => (
            <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f5f5f5', height: rowH }}>
              <td style={tdStyle({ textAlign: 'center', color: '#888' })}>{i + 1}</td>
              <td style={tdStyle({ fontWeight: '600', overflow: 'hidden', whiteSpace: 'nowrap' })}>{p.name}</td>
              <td style={tdStyle({ textAlign: 'center', color: '#555' })}>
                {Array.isArray(p.visitDays) ? p.visitDays.join('・') : (p.visitDays || '')}
              </td>
              {items.map((_, j) => (
                <td key={j} style={tdStyle({ textAlign: 'center' })}>
                  <div style={{ width: '18px', height: '18px', border: '2px solid #333', margin: '0 auto', borderRadius: '2px' }} />
                </td>
              ))}
              <td style={tdStyle({})} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = (extra = {}) => ({
  border: '1.5px solid #888',
  padding: '6px 8px',
  background: '#e0e0e0',
  fontWeight: '700',
  textAlign: 'left',
  fontSize: '13px',
  ...extra,
});

const tdStyle = (extra = {}) => ({
  border: '1px solid #bbb',
  padding: '4px 8px',
  fontSize: '13px',
  verticalAlign: 'middle',
  ...extra,
});
