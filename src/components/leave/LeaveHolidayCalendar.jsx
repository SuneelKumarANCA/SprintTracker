import { memo, useState, useMemo } from 'react';
import { addHoliday, deleteHoliday } from '../../services/leave/index.js';

const TYPE_COLORS = { gazetted: '#ef4444', restricted: '#f59e0b', optional: '#10b981' };

function LeaveHolidayCalendar({ holidays, refresh, year }) {
    const [form, setForm] = useState(null);
    const [location, setLocation] = useState('');

    const locations = useMemo(() => [...new Set((holidays || []).map(h => h.location).filter(Boolean))], [holidays]);
    const filtered = useMemo(() => {
        if (!location) return holidays;
        return holidays.filter(h => h.location === location);
    }, [holidays, location]);

    const handleAdd = async () => {
        if (!form || !form.date || !form.name) return;
        await addHoliday({ ...form, location: form.location || 'Bangalore' });
        setForm(null);
        refresh();
    };
    const handleDelete = async (id) => { await deleteHoliday(id); refresh(); };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>Holidays {year} ({filtered.length})</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Public holidays by location</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <select value={location} onChange={e => setLocation(e.target.value)} style={inputStyle}>
                        <option value="">All locations</option>
                        {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button onClick={() => setForm({ date: '', name: '', type: 'gazetted', location: locations[0] || 'Bangalore' })} style={btnStyle}>+ Add</button>
                </div>
            </div>
            {form && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                    <input placeholder="Holiday name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, width: 180 }} />
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                        <option value="gazetted">Gazetted</option><option value="restricted">Restricted</option><option value="optional">Optional</option>
                    </select>
                    <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inputStyle}>
                        {(locations.length ? locations : ['Bangalore', 'Pune', 'Delhi']).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button onClick={handleAdd} style={btnStyle}>Save</button>
                    <button onClick={() => setForm(null)} style={{ ...btnStyle, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>Cancel</button>
                </div>
            )}
            <div style={{ display: 'grid', gap: 6 }}>
                {filtered.map(h => (
                    <div key={h.id} style={rowStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 80, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(h.date)}</span>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{h.name}</span>
                            <span style={{ ...badge, background: TYPE_COLORS[h.type] || '#6b7280' }}>{h.type}</span>
                            {h.location && <span style={{ fontSize: 10, color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: 4, background: 'var(--bg-primary)' }}>{h.location}</span>}
                        </div>
                        <button onClick={() => handleDelete(h.id)} style={delStyle}>✕</button>
                    </div>
                ))}
                {!filtered.length && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>No holidays</div>}
            </div>
        </div>
    );
}

function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' }); }
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' };
const badge = { padding: '2px 7px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600, textTransform: 'capitalize' };
const inputStyle = { padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 };
const btnStyle = { padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--color-accent, #3b82f6)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 };
const delStyle = { padding: '2px 6px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 };

export default memo(LeaveHolidayCalendar);
