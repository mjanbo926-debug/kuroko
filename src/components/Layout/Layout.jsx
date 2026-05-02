import React, { useState } from 'react';
import { useApp } from '../../App';
import { Settings, Menu, X, ChevronLeft, Home, CalendarDays, Users } from 'lucide-react';

export default function Layout({ children }) {
  const { currentView, navigate, selectedPatient } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const isDeepView = [
    'patient-form', 'patient-detail', 'patient-daily-report',
    'report-ft-experience', 'report-ft-monthly',
    'report-pt-experience', 'report-pt-sixmonth',
    'daily-report',
  ].includes(currentView);

  const handleBack = () => {
    switch (currentView) {
      case 'patient-form':
        return navigate('patients');
      case 'patient-detail':
        return navigate('patients');
      case 'patient-daily-report':
        return navigate('patient-detail', { patient: selectedPatient });
      case 'daily-report':
        return navigate('schedule');
      default:
        return navigate('patient-detail', { patient: selectedPatient });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-40">
        <div className="flex items-center h-14 px-4 max-w-4xl mx-auto w-full">
          {isDeepView ? (
            <button onClick={handleBack} className="mr-3 p-1 rounded-lg hover:bg-blue-700">
              <ChevronLeft size={24} />
            </button>
          ) : (
            <button onClick={() => setMenuOpen(true)} className="mr-3 p-1 rounded-lg hover:bg-blue-700 md:hidden">
              <Menu size={24} />
            </button>
          )}
          <span className="text-base font-bold flex-1 truncate">訪問マッサージ 業務管理</span>
          {!isDeepView && (
            <div className="hidden md:flex items-center gap-2">
              <HeaderBtn label="患者一覧" onClick={() => navigate('patients')} active={currentView === 'patients'} />
              <HeaderBtn label="スケジュール" onClick={() => navigate('schedule')} active={currentView === 'schedule'} />
              <HeaderBtn label="設定" onClick={() => navigate('settings')} active={currentView === 'settings'} />
            </div>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <nav className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
              <span className="font-bold">メニュー</span>
              <button onClick={() => setMenuOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-3 space-y-1">
              <MenuItem icon={<Users size={20} />} label="患者一覧"
                onClick={() => { navigate('patients'); setMenuOpen(false); }}
                active={currentView === 'patients'} />
              <MenuItem icon={<CalendarDays size={20} />} label="スケジュール"
                onClick={() => { navigate('schedule'); setMenuOpen(false); }}
                active={currentView === 'schedule'} />
              <MenuItem icon={<Settings size={20} />} label="設定"
                onClick={() => { navigate('settings'); setMenuOpen(false); }}
                active={currentView === 'settings'} />
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {!isDeepView && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30">
          <div className="flex">
            <BottomTab icon={<Users size={22} />} label="患者" onClick={() => navigate('patients')} active={currentView === 'patients'} />
            <BottomTab icon={<CalendarDays size={22} />} label="スケジュール" onClick={() => navigate('schedule')} active={currentView === 'schedule'} />
            <BottomTab icon={<Settings size={22} />} label="設定" onClick={() => navigate('settings')} active={currentView === 'settings'} />
          </div>
        </nav>
      )}
    </div>
  );
}

function HeaderBtn({ label, onClick, active }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-blue-800' : 'hover:bg-blue-700'}`}>
      {label}
    </button>
  );
}

function MenuItem({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
        active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function BottomTab({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
        active ? 'text-blue-600' : 'text-gray-400'}`}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
