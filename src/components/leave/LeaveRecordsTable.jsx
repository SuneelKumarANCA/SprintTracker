import { memo, useState, useMemo } from 'react';
import { addRecord, deleteRecord } from '../../services/leave/index.js';

function LeaveRecordsTable({ records, employees, refresh, loading }) {
    const [form, setForm] = useState(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const filtered = useMemo(() => {
        let data = records;
        if (search) { const q = search.toLowerCase(); data = data.filter(r => r.employee_name.toLowerCase().includes(q) || r.employee_code.toLowerCase().includes(q)); }
        if (typeFilter) data = data.filter(r => r.leave_type === typeFilter);
        return data;
    }, [records, search, typeFilter]);

    const handleAdd = async () => {
        if (!form || !form.employee_id || !form.from_date) return;
        await addRecord(form);
        setForm(null);
        refresh();
    };
    const handleDelete = async (id) => { await deleteRecord(id); refresh(); };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>Leave Records ({filtered.length})</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={inputStyle}>
                        <option value="">All types</option>
                        {['EL', 'CL', 'SL', 'LWP', 'CO', 'RH'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => setForm({ employee_id: '', leave_type: 'EL', from_date: '', to_date: '', days: 1, remarks: '' })} style={btnStyle}>+ Add</button>
                </div>
            </div>
            {form && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                    <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: +e.target.value })} style={inputStyle}>
                        <option value="">Employee</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} style={inputStyle}>
                        {['EL', 'CL', 'SL', 'LWP', 'CO', 'RH'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="date" value={form.from_date} onChange={e => setForm({ ...form, from_date: e.target.value })} style={inputStyle} />
                    <input type="date" value={form.to_date} onChange={e => setForm({ ...form, to_date: e.target.value })} style={inputStyle} />
                    <input type="number" value={form.days} min="0.5" step="0.5" onChange={e => setForm({ ...form, days: +e.target.value })} style={{ ...inputStyle, width: 55 }} />
                    <input placeholder="Remarks" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} style={{ ...inputStyle, width: 110 }} />
                    <button onClick={handleAdd} style={btnStyle}>Save</button>
                    <button onClick={() => setForm(null)} style={{ ...btnStyle, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>Cancel</button>
                </div>
            )}
            {loading ? <div style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading...</div> : (
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr style={{ background: 'var(--bg-primary)' }}>{['Employee', 'Type', 'From', 'To', 'Days', 'Remarks', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                    <td style={tdStyle}><div><div style={{ fontWeight: 500 }}>{r.employee_name}</div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{r.employee_code}</div></div></td>
                                    <td style={tdStyle}><span style={{ ...typeBadge, background: typeColors[r.leave_type] || '#6b7280' }}>{r.leave_type}</span></td>
                                    <td style={tdStyle}>{fmtS(r.from_date)}</td>
                                    <td style={tdStyle}>{fmtS(r.to_date)}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.days}</td>
                                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.remarks || '—'}</td>
                                    <td style={tdStyle}><button onClick={() => handleDelete(r.id)} style={delStyle}>✕</button></td>
                                </tr>
                            ))}
                            {!filtered.length && <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>No records found</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function fmtS(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
const typeColors = { EL: '#0d9488', CL: '#0891b2', SL: '#f59e0b', LWP: '#6b7280', CO: '#10b981', RH: '#8b5cf6' };
const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' };
const tdStyle = { padding: '10px 12px', color: 'var(--text-primary)' };
const typeBadge = { padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600 };
const inputStyle = { padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 };
const btnStyle = { padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--color-accent, #3b82f6)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 };
const delStyle = { padding: '2px 6px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 };

export default memo(LeaveRecordsTable);
