import { memo, useState, useMemo, useEffect } from 'react';
import { calcWorkingDays } from '../../utils/workingDaysCalc.js';
import { fetchRecords } from '../../services/leave/index.js';

function WorkingDaysCalc({ holidays, employees, records }) {
    const [startDate, setStartDate] = useState('2026-06-01');
    const [endDate, setEndDate] = useState('2026-06-30');
    const [location, setLocation] = useState('Bangalore');
    const [empCode, setEmpCode] = useState('');
    const [empSearch, setEmpSearch] = useState('');
    const [allRecords, setAllRecords] = useState([]);

    // Fetch ALL records for the relevant year (not just selected month)
    useEffect(() => {
        if (!startDate) return;
        const yr = new Date(startDate).getFullYear();
        fetchRecords(null, yr).then(setAllRecords).catch(() => setAllRecords(records || []));
    }, [startDate, records]);

    const locations = useMemo(() => {
        const locs = [...new Set((holidays || []).map(h => h.location).filter(Boolean))];
        return locs.length ? locs : ['Bangalore', 'Pune', 'Delhi'];
    }, [holidays]);

    const locHolidays = useMemo(() => (holidays || []).filter(h => h.location === location), [holidays, location]);
    const holidayDates = useMemo(() => locHolidays.map(h => h.date), [locHolidays]);

    const result = useMemo(() => {
        if (!startDate || !endDate) return null;
        const wd = calcWorkingDays(startDate, endDate, holidayDates);
        const holidaysHit = locHolidays.filter(h => h.date >= startDate && h.date <= endDate);
        const empLeaves = empCode && allRecords.length ? allRecords.filter(r => r.employee_code === empCode && r.from_date <= endDate && r.to_date >= startDate) : [];
        const leavesTaken = empLeaves.reduce((s, r) => s + r.days, 0);
        return { ...wd, holidaysHit, leavesTaken, leaveRecords: empLeaves, effectiveDays: wd.workingDays - leavesTaken };
    }, [startDate, endDate, holidayDates, locHolidays, empCode, allRecords]);

    const filteredEmps = useMemo(() => {
        if (!employees) return [];
        const q = empSearch.toLowerCase();
        return employees.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q));
    }, [empSearch, employees]);

    const selectedEmp = empCode ? (employees || []).find(e => e.code === empCode) : null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
            {/* Inputs Panel */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Inputs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Field label="From date"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} /></Field>
                    <Field label="To date"><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} /></Field>
                    <Field label="Location">
                        <select value={location} onChange={e => setLocation(e.target.value)} style={inputStyle}>
                            {locations.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </Field>
                    <Field label="Employee (optional)">
                        <input type="text" placeholder="Search name or code..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} style={inputStyle} />
                        <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: 6, marginTop: 6, background: 'var(--bg-primary)' }}>
                            <EmpBtn active={!empCode} onClick={() => setEmpCode('')}>— None —</EmpBtn>
                            {filteredEmps.slice(0, 30).map(e => (
                                <EmpBtn key={e.code} active={empCode === e.code} onClick={() => setEmpCode(e.code)}>
                                    <span>{e.name}</span><span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{e.code}</span>
                                </EmpBtn>
                            ))}
                        </div>
                    </Field>
                </div>
            </div>

            {/* Results Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {result && (
                    <>
                        {/* Hero */}
                        <div style={{ padding: 24, borderRadius: 12, background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff' }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Effective working days</div>
                            <div style={{ fontSize: 52, fontWeight: 800, marginTop: 4 }}>{result.effectiveDays}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                {selectedEmp ? `For ${selectedEmp.name}` : 'No employee selected'} · {fmtD(startDate)} → {fmtD(endDate)}
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div style={cardStyle}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>Calculation breakdown</div>
                            <Row label="Total calendar days" value={result.totalDays} />
                            <Row label="Weekends (Sat + Sun)" value={`-${result.weekends}`} sub />
                            <Row label={`Public holidays (${location})`} value={`-${result.holidays}`} sub detail={result.holidaysHit.map(h => `${fmtS(h.date)} ${h.name}`).join(', ')} />
                            <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-primary)', marginTop: 6 }}>
                                <Row label="Net working days" value={result.workingDays} accent />
                            </div>
                            {selectedEmp && <Row label={`Leaves taken by ${selectedEmp.name}`} value={`-${result.leavesTaken}`} sub detail={`${result.leaveRecords.length} record(s)`} />}
                            <div style={{ padding: '12px 14px', borderRadius: 8, background: '#0d9488', color: '#fff', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>Effective working days</span>
                                <span style={{ fontSize: 22, fontWeight: 800 }}>{result.effectiveDays}</span>
                            </div>
                        </div>

                        {/* Leave records in range */}
                        {result.leaveRecords.length > 0 && (
                            <div style={cardStyle}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>Leave records in this range</div>
                                {result.leaveRecords.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginBottom: 4, borderRadius: 6, background: 'var(--bg-primary)' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ ...typeBadge, background: r.leave_type === 'EL' ? '#0d9488' : r.leave_type === 'CL' ? '#0891b2' : '#f59e0b' }}>{r.leave_type}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtS(r.from_date)} → {fmtS(r.to_date)}</span>
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.days}d</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return <div><label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</label>{children}</div>;
}
function EmpBtn({ active, onClick, children }) {
    return <button onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '5px 8px', fontSize: 11, cursor: 'pointer', border: 'none', background: active ? 'rgba(13,148,136,0.12)' : 'transparent', color: active ? '#0d9488' : 'var(--text-primary)', fontWeight: active ? 600 : 400, display: 'flex', justifyContent: 'space-between' }}>{children}</button>;
}
function Row({ label, value, sub, accent, detail }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0' }}>
            <div><div style={{ fontSize: 12, color: sub ? '#ef4444' : accent ? '#0d9488' : 'var(--text-primary)', fontWeight: accent ? 600 : 400 }}>{label}</div>{detail && <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{detail}</div>}</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: sub ? '#ef4444' : accent ? '#0d9488' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        </div>
    );
}

function fmtD(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtS(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
const cardStyle = { padding: 18, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' };
const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 };
const typeBadge = { padding: '2px 7px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600 };

export default memo(WorkingDaysCalc);
