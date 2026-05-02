import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text, label = 'LINEにコピー', className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
      } ${className}`}
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}
      {copied ? 'コピーしました！' : label}
    </button>
  );
}
