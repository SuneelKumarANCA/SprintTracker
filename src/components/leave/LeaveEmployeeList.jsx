import { memo, useState, useMemo } from 'react';
import { addEmployee, deleteEmployee } from '../../services/leave/index.js';

function LeaveEmployeeList({ employees, balances, records, refresh }) {
    const [form, setForm] = useState(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const balMap = new Map((balances || []).map(b => [b.employee_id, b]));

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return employees.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q));
    }, [search, employees]);

    const handleAdd = async () => {
        if (!form || !form.code || !form.name) return;
        await addEmployee(form);
        setForm(null);
        refresh();
    };
    const handleDelete = async (id) => {
        if (!confirm('Remove this employee and all their records?')) return;
        await deleteEmployee(id);
        refresh();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>Employees ({employees.length})</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Click to view details</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input placeholder="Search name or code..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
                    <button onClick={() => setForm({ code: '', name: '', doj: '', department: '' })} style={btnStyle}>+ Add</button>
                </div>
            </div>
            {form && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <input placeholder="Code (AMTI-001)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} style={inputStyle} />
                    <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
                    <input type="date" value={form.doj} onChange={e => setForm({ ...form, doj: e.target.value })} style={inputStyle} />
                    <input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} style={inputStyle} />
                    <button onClick={handleAdd} style={btnStyle}>Save</button>
                    <button onClick={() => setForm(null)} style={{ ...btnStyle, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>Cancel</button>
                </div>
            )}
            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: 'var(--bg-primary)' }}>
                        {['Employee', 'Code', 'DOJ', 'EL', 'CL', 'SL', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {filtered.map((emp, i) => {
                            const bal = balMap.get(emp.id);
                            const initials = emp.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('');
                            return (
                                <tr key={emp.id} onClick={() => setSelected(emp)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-primary)' }}>
                                    <td style={tdStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>{initials}</div>
                                        <span style={{ fontWeight: 500 }}>{emp.name}</span>
                                    </div></td>
                                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{emp.code}</td>
                                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{emp.doj || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#0d9488' }}>{bal?.el_balance ?? '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#0891b2' }}>{bal?.cl_balance ?? '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>{bal?.sl_balance ?? '—'}</td>
                                    <td style={tdStyle}><button onClick={e => { e.stopPropagation(); handleDelete(emp.id); }} style={delStyle}>✕</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {/* Detail Modal */}
            {selected && <EmployeeModal emp={selected} records={records} balances={balances} onClose={() => setSelected(null)} />}
        </div>
    );
}

function EmployeeModal({ emp, records, balances, onClose }) {
    const empRecords = (records || []).filter(r => r.employee_code === emp.code);
    const totalUsed = empRecords.reduce((s, r) => s + r.days, 0);
    const bal = (balances || []).find(b => b.employee_id === emp.id);
    const initials = emp.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('');

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #14b8a6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{initials}</div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.code} · Joined {emp.doj || 'N/A'}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
                </div>
                {/* Balances */}
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Current Balances</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                    <BalCard label="Earned (EL)" value={bal?.el_balance ?? '—'} color="#0d9488" />
                    <BalCard label="Casual (CL)" value={bal?.cl_balance ?? '—'} color="#0891b2" />
                    <BalCard label="Sick (SL)" value={bal?.sl_balance ?? '—'} color="#f59e0b" />
                </div>
                {/* Leave History */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Leave History</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{empRecords.length} records · {totalUsed} days</span>
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {empRecords.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>No leaves taken</div>}
                    {empRecords.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginBottom: 4, borderRadius: 6, background: 'var(--bg-primary)' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ padding: '2px 7px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600, background: r.leave_type === 'EL' ? '#0d9488' : r.leave_type === 'CL' ? '#0891b2' : '#f59e0b' }}>{r.leave_type}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtS(r.from_date)} → {fmtS(r.to_date)}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.days}d</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function BalCard({ label, value, color }) {
    return <div style={{ padding: 12, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}30` }}>
        <div style={{ fontSize: 11, color, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>;
}

function fmtS(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }

const COLORS = ['#0d9488', '#0891b2', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: 'var(--bg-secondary)', borderRadius: 14, padding: 24, width: 560, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' };
const inputStyle = { padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 };
const btnStyle = { padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--color-accent, #3b82f6)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 };
const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle = { padding: '10px 12px', color: 'var(--text-primary)' };
const delStyle = { padding: '2px 6px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 };

export default memo(LeaveEmployeeList);
