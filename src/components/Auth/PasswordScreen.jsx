import React, { useState } from 'react';
import { authStorage } from '../../utils/storage';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function PasswordScreen({ onAuthenticated }) {
  const hasPassword = authStorage.hasPassword();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!hasPassword) {
      if (password.length < 4) { setError('パスワードは4文字以上で設定してください。'); return; }
      if (password !== confirmPassword) { setError('パスワードが一致しません。'); return; }
      authStorage.setPassword(password);
      onAuthenticated();
    } else {
      if (password === authStorage.getPassword()) {
        onAuthenticated();
      } else {
        setError('パスワードが正しくありません。');
        setPassword('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 text-center">訪問マッサージ 業務管理</h1>
          <p className="text-gray-500 mt-1 text-sm text-center">
            {hasPassword ? 'パスワードを入力してください' : '初回設定：パスワードを決めてください'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {!hasPassword && (
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="パスワード（確認）"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            {hasPassword ? 'ログイン' : 'パスワードを設定してはじめる'}
          </button>
        </form>
      </div>
    </div>
  );
}
