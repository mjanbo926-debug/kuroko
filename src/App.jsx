import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import PasswordScreen from './components/Auth/PasswordScreen';
import Layout from './components/Layout/Layout';
import PatientList from './components/Patients/PatientList';
import PatientForm from './components/Patients/PatientForm';
import PatientDetail from './components/Patients/PatientDetail';
import PatientDailyReportForm from './components/Patients/PatientDailyReportForm';
import FullTimeExperienceReport from './components/Reports/FullTimeExperienceReport';
import FullTimeMonthlyReport from './components/Reports/FullTimeMonthlyReport';
import PartTimeExperienceReport from './components/Reports/PartTimeExperienceReport';
import PartTimeSixMonthReport from './components/Reports/PartTimeSixMonthReport';
import Settings from './components/Settings/Settings';
import ScheduleView from './components/Schedule/ScheduleView';
import DailyReport from './components/Schedule/DailyReport';
import MonthlyStats from './components/Stats/MonthlyStats';
import { storage } from './utils/storage';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('patients');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [patients, setPatients] = useState([]);
  const [reports, setReports] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [patientDailyReports, setPatientDailyReports] = useState([]);
  const [scheduleOverrides, setScheduleOverrides] = useState({});
  const [settings, setSettings] = useState({ apiKey: '' });

  useEffect(() => {
    setPatients(storage.get('patients', []));
    setReports(storage.get('reports', []));
    setDailyReports(storage.get('dailyReports', []));
    setPatientDailyReports(storage.get('patientDailyReports', []));
    setScheduleOverrides(storage.get('scheduleOverrides', {}));
    setSettings(storage.get('settings', { apiKey: '' }));
  }, []);

  const savePatients = useCallback((v) => { setPatients(v); storage.set('patients', v); }, []);
  const saveReports = useCallback((v) => { setReports(v); storage.set('reports', v); }, []);
  const saveDailyReports = useCallback((v) => { setDailyReports(v); storage.set('dailyReports', v); }, []);
  const savePatientDailyReports = useCallback((v) => { setPatientDailyReports(v); storage.set('patientDailyReports', v); }, []);
  const saveScheduleOverrides = useCallback((v) => { setScheduleOverrides(v); storage.set('scheduleOverrides', v); }, []);
  const saveSettings = useCallback((v) => { setSettings(v); storage.set('settings', v); }, []);

  const navigate = useCallback((view, opts = {}) => {
    setCurrentView(view);
    if ('patient' in opts) setSelectedPatient(opts.patient);
    if ('editingPatient' in opts) setEditingPatient(opts.editingPatient);
    if ('date' in opts) setSelectedDate(opts.date);
    window.scrollTo(0, 0);
  }, []);

  if (!isAuthenticated) {
    return <PasswordScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  const ctx = {
    currentView, selectedPatient, editingPatient, selectedDate,
    patients, reports, dailyReports, patientDailyReports, scheduleOverrides, settings,
    navigate, savePatients, saveReports, saveDailyReports, savePatientDailyReports, saveScheduleOverrides, saveSettings,
  };

  const views = {
    'patients': <PatientList />,
    'patient-form': <PatientForm />,
    'patient-detail': <PatientDetail />,
    'patient-daily-report': <PatientDailyReportForm />,
    'report-ft-experience': <FullTimeExperienceReport />,
    'report-ft-monthly': <FullTimeMonthlyReport />,
    'report-pt-experience': <PartTimeExperienceReport />,
    'report-pt-sixmonth': <PartTimeSixMonthReport />,
    'schedule': <ScheduleView />,
    'daily-report': <DailyReport />,
    'stats': <MonthlyStats />,
    'settings': <Settings />,
  };

  return (
    <AppContext.Provider value={ctx}>
      <Layout>
        {views[currentView] || <PatientList />}
      </Layout>
    </AppContext.Provider>
  );
}
