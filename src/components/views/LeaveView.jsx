import { memo, useState, useCallback, createContext, useContext } from 'react';
import { useLeaveData } from '../../hooks/useLeaveData.js';
import LeaveNavTabs from '../leave/LeaveNavTabs.jsx';
import LeaveDashboard from '../leave/LeaveDashboard.jsx';
import LeaveRecordsTable from '../leave/LeaveRecordsTable.jsx';
import LeaveEmployeeList from '../leave/LeaveEmployeeList.jsx';
import LeaveHolidayCalendar from '../leave/LeaveHolidayCalendar.jsx';
import WorkingDaysCalc from '../leave/WorkingDaysCalc.jsx';
import LeaveReports from '../leave/LeaveReports.jsx';
import LeaveDataSources from '../leave/LeaveDataSources.jsx';

const TABS = ['Dashboard', 'Records', 'Employees', 'Holidays', 'Calculator', 'Reports', 'Data Sources'];

// --- Toast Context ---
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const push = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    }, []);
    return (
        <ToastCtx.Provider value={push}>
            {children}
            <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.15)', background: t.type === 'error' ? '#ef4444' : t.type === 'success' ? '#10b981' : '#3b82f6' }}>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastCtx.Provider>
    );
}

function LeaveView() {
    return (
        <ToastProvider>
            <LeaveViewInner />
        </ToastProvider>
    );
}

function LeaveViewInner() {
    const [activeTab, setActiveTab] = useState('Dashboard');
    const leave = useLeaveData();

    return (
        <div style={{ padding: '16px 24px 24px', maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <LeaveNavTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
                <MonthYearPicker month={leave.month} year={leave.year} setMonth={leave.setMonth} setYear={leave.setYear} />
            </div>
            {activeTab === 'Dashboard' && <LeaveDashboard stats={leave.stats} records={leave.records} employees={leave.employees} loading={leave.loading} month={leave.month} year={leave.year} />}
            {activeTab === 'Records' && <LeaveRecordsTable records={leave.records} employees={leave.employees} refresh={leave.refresh} loading={leave.loading} />}
            {activeTab === 'Employees' && <LeaveEmployeeList employees={leave.employees} balances={leave.balances} records={leave.records} refresh={leave.refresh} />}
            {activeTab === 'Holidays' && <LeaveHolidayCalendar holidays={leave.holidays} refresh={leave.refresh} year={leave.year} />}
            {activeTab === 'Calculator' && <WorkingDaysCalc holidays={leave.holidays} employees={leave.employees} records={leave.records} />}
            {activeTab === 'Reports' && <LeaveReports records={leave.records} employees={leave.employees} balances={leave.balances} month={leave.month} year={leave.year} />}
            {activeTab === 'Data Sources' && <LeaveDataSources onUpload={leave.uploadFile} refresh={leave.refresh} />}
        </div>
    );
}

function MonthYearPicker({ month, year, setMonth, setYear }) {
    return (
        <div style={{ display: 'flex', gap: 6 }}>
            <select value={month} onChange={e => setMonth(+e.target.value)} style={selectStyle}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'short' })}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)} style={selectStyle}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
    );
}

const selectStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 };

export default memo(LeaveView);
