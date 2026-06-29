import { memo, useCallback, useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STAT_CARDS = [
    { key: 'totalEmployees', label: 'TOTAL EMPLOYEES', sub: 'Active across all locations', color: '#3b82f6' },
    { key: 'totalDays', label: 'LEAVES TAKEN', sub: 'Days · all types', color: '#0d9488' },
    { key: 'onLeaveToday', label: 'ON LEAVE TODAY', sub: 'Currently out', color: '#f59e0b' },
    { key: 'totalRecords', label: 'RECORDS ON FILE', sub: 'Leave entries', color: '#8b5cf6' },
];
const TYPE_COLORS = { EL: '#0d9488', CL: '#0891b2', SL: '#f59e0b' };
const TREND_PERIODS = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
];

function getISOWeekStart(d) {
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - day.getDay()); return day;
}
function weekLabel(d) {
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return `W${Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)}`;
}

function LeaveDashboard({ stats, records, employees, loading, month, year }) {
    const [trendPeriod, setTrendPeriod] = useState('monthly');
    const [densityPeriod, setDensityPeriod] = useState('monthly');

    const typeData = useMemo(() => {
        if (!stats) return [];
        return (stats.byType || []).map(t => ({
            name: t.leave_type === 'EL' ? 'Earned' : t.leave_type === 'CL' ? 'Casual' : t.leave_type === 'SL' ? 'Sick' : t.leave_type,
            code: t.leave_type, value: t.days,
        }));
    }, [stats?.byType]);

    const empUsage = useMemo(() => {
        const map = {};
        records.forEach(r => { map[r.employee_name] = (map[r.employee_name] || 0) + r.days; });
        return Object.entries(map).map(([name, days]) => ({ name: name.split(' ')[0], fullName: name, days }))
            .sort((a, b) => b.days - a.days).slice(0, 8);
    }, [records]);

    const trendData = useMemo(() => {
        if (!records.length) return [];
        const latestDate = records.reduce((m, r) => r.from_date > m ? r.from_date : m, records[0].from_date);
        const anchor = new Date(latestDate);

        if (trendPeriod === 'daily') {
            const end = new Date(anchor); const start = new Date(anchor); start.setDate(end.getDate() - 29);
            const map = {};
            records.forEach(r => { const d = new Date(r.from_date); if (d >= start && d <= end) { const k = d.toISOString().slice(0, 10); map[k] = (map[k] || 0) + r.days; } });
            const arr = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const k = d.toISOString().slice(0, 10);
                arr.push({ label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), days: map[k] || 0 });
            }
            return arr;
        }
        if (trendPeriod === 'weekly') {
            const map = {};
            records.forEach(r => { const ws = getISOWeekStart(new Date(r.from_date)); const k = ws.toISOString().slice(0, 10); map[k] = (map[k] || 0) + r.days; });
            const cur = getISOWeekStart(anchor); const arr = [];
            for (let i = 11; i >= 0; i--) {
                const w = new Date(cur); w.setDate(cur.getDate() - i * 7);
                const k = w.toISOString().slice(0, 10);
                arr.push({ label: weekLabel(w), days: map[k] || 0 });
            }
            return arr;
        }
        if (trendPeriod === 'monthly') {
            const arr = Array.from({ length: 12 }, (_, i) => ({ label: new Date(year, i, 1).toLocaleString('en', { month: 'short' }), days: 0 }));
            records.forEach(r => { const m = new Date(r.from_date).getMonth(); if (m >= 0 && m < 12) arr[m].days += r.days; });
            return arr;
        }
        if (trendPeriod === 'yearly') {
            const map = {};
            records.forEach(r => { const y = new Date(r.from_date).getFullYear(); map[y] = (map[y] || 0) + r.days; });
            return Object.entries(map).sort((a, b) => +a[0] - +b[0]).map(([y, days]) => ({ label: String(y), days }));
        }
        return [];
    }, [records, trendPeriod, year]);

    const trendSubLabel = { daily: 'Last 30 days', weekly: 'Last 12 weeks', monthly: `12-month · ${year}`, yearly: 'All years' }[trendPeriod];

    if (loading || !stats) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {STAT_CARDS.map(c => (
                    <div key={c.key} style={cardStyle}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{c.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: c.color, marginTop: 6 }}>{stats[c.key] ?? 0}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{c.sub}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Top leave usage by employee</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Days</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={empUsage} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false}
                                interval={0} angle={-25} textAnchor="end" height={40} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<EmpTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                            <Bar dataKey="days" fill="#0d9488" radius={[5, 5, 0, 0]}>
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div style={cardStyle}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Leave type breakdown</span>
                    <ResponsiveContainer width="100%" height={170}>
                        <PieChart><Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={2}>
                            {typeData.map((d, i) => <Cell key={i} fill={TYPE_COLORS[d.code] || '#6b7280'} />)}
                        </Pie><Tooltip contentStyle={ttStyle} /></PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {typeData.map((d, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[d.code] || '#6b7280' }} /><span style={{ color: 'var(--text-secondary)' }}>{d.name}</span></span>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.value} days</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Leave trend</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>{trendSubLabel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, background: 'var(--bg-primary)', borderRadius: 8, padding: 3 }}>
                        {TREND_PERIODS.map(p => (
                            <button key={p.key} onClick={() => setTrendPeriod(p.key)} aria-pressed={trendPeriod === p.key}
                                style={{
                                    padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                                    background: trendPeriod === p.key ? '#0d9488' : 'transparent',
                                    color: trendPeriod === p.key ? '#fff' : 'var(--text-secondary)',
                                    boxShadow: trendPeriod === p.key ? '0 1px 4px rgba(13,148,136,0.35)' : 'none',
                                }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={170}>
                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <defs><linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} /><stop offset="100%" stopColor="#0d9488" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false}
                            interval={trendPeriod === 'daily' ? 4 : 'preserveStartEnd'} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={ttStyle} />
                        <Area type="monotone" dataKey="days" stroke="#0d9488" strokeWidth={2} fill="url(#aGrad)" dot={trendPeriod === 'yearly'} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Leave density</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>
                            {{ daily: 'Last 30 days', weekly: 'Last 12 weeks', monthly: `${year}`, yearly: 'All years' }[densityPeriod]}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, background: 'var(--bg-primary)', borderRadius: 8, padding: 3 }}>
                        {TREND_PERIODS.map(p => (
                            <button key={p.key} onClick={() => setDensityPeriod(p.key)} aria-pressed={densityPeriod === p.key}
                                style={{
                                    padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                                    background: densityPeriod === p.key ? '#0d9488' : 'transparent',
                                    color: densityPeriod === p.key ? '#fff' : 'var(--text-secondary)',
                                    boxShadow: densityPeriod === p.key ? '0 1px 4px rgba(13,148,136,0.35)' : 'none',
                                }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                <Heatmap records={records} year={year} period={densityPeriod} />
            </div>
            <div style={cardStyle}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 10 }}>Recent leave activity</span>
                {records.slice(0, 6).map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 6, background: 'var(--bg-primary)', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ ...badge, background: TYPE_COLORS[r.leave_type] || '#6b7280' }}>{r.leave_type}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.employee_name}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtS(r.from_date)} → {fmtS(r.to_date)}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.days}d</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmpTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const { fullName, days } = payload[0].payload;
    return (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{fullName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0d9488', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0d9488' }}>{days}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>days leave</span>
            </div>
        </div>
    );
}

function Heatmap({ records, year, period }) {
    const [tip, setTip] = useState(null);

    const counts = useMemo(() => {
        const m = {};
        records.forEach(r => { const s = new Date(r.from_date), e = new Date(r.to_date); for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) { const k = d.toISOString().slice(0, 10); m[k] = (m[k] || 0) + 1; } });
        return m;
    }, [records]);

    const handleSvgOver = useCallback(e => {
        const el = e.target.closest('[data-date]');
        if (!el) { setTip(null); return; }
        const count = +el.dataset.count;
        if (count > 0) setTip({ x: e.clientX, y: e.clientY, date: el.dataset.date, count });
        else setTip(null);
    }, []);
    const handleSvgLeave = useCallback(() => setTip(null), []);

    const { cells, vb, fixedW, minW } = useMemo(() => {
        const max = Math.max(1, ...Object.values(counts), 1);
        const cc = c => { if (!c) return 'rgba(255,255,255,0.04)'; const t = c / max; return t > 0.75 ? '#0d9488' : t > 0.5 ? '#14b8a6' : t > 0.25 ? '#5eead4' : '#99f6e4'; };
        const dp = (k, c) => ({ 'data-date': k, 'data-count': c });

        if (period === 'daily') {
            if (!records.length) return { cells: [], vb: '0 0 540 30', fixedW: null, minW: 400 };
            const earliest = records.reduce((m, r) => r.from_date < m ? r.from_date : m, records[0].from_date);
            const latest = records.reduce((m, r) => r.to_date > m ? r.to_date : m, records[0].to_date);
            const start = new Date(earliest), end = new Date(latest);
            const days = Math.round((end - start) / 86400000) + 1;
            const COLS = days <= 14 ? 7 : days <= 35 ? 10 : 14;
            const rows = Math.ceil(days / COLS);
            const CW = 54, CH = 28, items = [];
            for (let i = 0; i < days; i++) {
                const d = new Date(start); d.setDate(start.getDate() + i);
                const k = d.toISOString().slice(0, 10);
                const col = i % COLS, row = Math.floor(i / COLS);
                const c = counts[k] || 0;
                items.push(<g key={k} {...dp(k, c)}>
                    <rect x={col * CW} y={row * CH} width={CW - 4} height={CH - 4} rx={4}
                        fill={c ? cc(c) : 'rgba(255,255,255,0.03)'}
                        stroke={c ? 'none' : 'var(--border-primary)'} strokeWidth={0.5} />
                    <text x={col * CW + (CW - 4) / 2} y={row * CH + 11} textAnchor="middle" fontSize={8}
                        fill={c ? '#fff' : 'var(--text-secondary)'} opacity={c ? 1 : 0.35} style={{ pointerEvents: 'none' }}>
                        {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </text>
                    {c ? <text x={col * CW + (CW - 4) / 2} y={row * CH + 20} textAnchor="middle" fontSize={8} fontWeight="700" fill="rgba(255,255,255,0.85)" style={{ pointerEvents: 'none' }}>{c}</text> : null}
                </g>);
            }
            return { cells: items, vb: `0 0 ${COLS * CW} ${rows * CH + 2}`, fixedW: null, minW: Math.min(COLS * CW, 540) };
        }

        if (period === 'weekly') {
            if (!records.length) return { cells: [], vb: '0 0 320 148', fixedW: 320, minW: 0 };
            const earliest = records.reduce((m, r) => r.from_date < m ? r.from_date : m, records[0].from_date);
            const latest = records.reduce((m, r) => r.to_date > m ? r.to_date : m, records[0].to_date);
            const firstWeek = getISOWeekStart(new Date(earliest));
            const lastWeek = getISOWeekStart(new Date(latest));
            const numWeeks = Math.round((lastWeek - firstWeek) / (7 * 86400000)) + 1;
            const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const CW = 36, CH = 18, LW = 28, TOP = 30, items = [];
            // Day labels
            DAYS.forEach((lbl, i) => items.push(
                <text key={`dl${i}`} x={LW - 4} y={TOP + i * CH + CH / 2 + 3} textAnchor="end" fontSize={9} fill="var(--text-secondary)">{lbl}</text>
            ));
            // Month labels + week columns
            let lastMonthLabel = '';
            for (let w = 0; w < numWeeks; w++) {
                const ws = new Date(firstWeek); ws.setDate(firstWeek.getDate() + w * 7);
                const monthLabel = ws.toLocaleString('en', { month: 'short' });
                const xBase = LW + w * CW;
                if (monthLabel !== lastMonthLabel) {
                    items.push(<text key={`ml${w}`} x={xBase + CW / 2} y={14} textAnchor="middle" fontSize={9} fontWeight="600" fill="var(--text-primary)">{monthLabel}</text>);
                    lastMonthLabel = monthLabel;
                }
                items.push(<text key={`wl${w}`} x={xBase + CW / 2} y={TOP - 4} textAnchor="middle" fontSize={8} fill="var(--text-secondary)">{weekLabel(ws)}</text>);
                for (let day = 0; day < 7; day++) {
                    const d = new Date(ws); d.setDate(ws.getDate() + day);
                    const k = d.toISOString().slice(0, 10);
                    const c = counts[k] || 0;
                    items.push(<rect key={k} x={xBase + 2} y={TOP + day * CH + 2} width={CW - 6} height={CH - 5} rx={3}
                        fill={cc(c)} stroke={c ? 'none' : 'var(--border-primary)'} strokeWidth={0.5}
                        {...dp(k, c)} />);
                }
            }
            const W = LW + numWeeks * CW + 8, H = TOP + 7 * CH + 4;
            return { cells: items, vb: `0 0 ${W} ${H}`, fixedW: W, minW: 0 };
        }

        if (period === 'yearly') {
            const years = [...new Set(records.map(r => new Date(r.from_date).getFullYear()))].sort();
            if (!years.length) return { cells: [], vb: '0 0 580 30', fixedW: null, minW: 540 };
            const CS = 11, GAP = 1, LW = 30, TOP = 20;
            const items = [];
            // Month labels (approximate positions based on week offsets)
            const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            MONTHS.forEach((m, mi) => {
                const approxOff = Math.floor(new Date(years[0], mi, 1).getDay() +
                    (new Date(years[0], mi, 1) - new Date(years[0], 0, 1)) / 86400000);
                const x = LW + 4 + Math.floor(approxOff / 7) * (CS + GAP);
                items.push(<text key={`mth${mi}`} x={x} y={12} fontSize={8} fill="var(--text-secondary)">{m}</text>);
            });
            years.forEach((y, yi) => {
                items.push(<text key={`yl${y}`} x={LW - 3} y={TOP + yi * (CS + GAP + 6) + CS} textAnchor="end" fontSize={9} fontWeight="600" fill="var(--text-secondary)">{y}</text>);
                const s = new Date(y, 0, 1);
                for (let d = new Date(s); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
                    const off = Math.floor((d - s) / 86400000) + s.getDay();
                    const k = d.toISOString().slice(0, 10);
                    const c = counts[k] || 0;
                    items.push(<rect key={k} x={LW + 4 + Math.floor(off / 7) * (CS + GAP)} y={TOP + yi * (CS + GAP + 6)}
                        width={CS} height={CS} rx={2}
                        fill={cc(c)} stroke={c ? 'none' : 'rgba(255,255,255,0.06)'} strokeWidth={0.5}
                        {...dp(k, c)} />);
                }
            });
            const H = TOP + years.length * (CS + GAP + 6) + 6;
            return { cells: items, vb: `0 0 580 ${H}`, fixedW: null, minW: 540 };
        }

        // monthly — GitHub-style grid with month labels
        const CS = 11, GAP = 1, LW = 4, TOP = 22;
        const items = [];
        const s = new Date(year, 0, 1);
        // Month labels
        for (let mi = 0; mi < 12; mi++) {
            const md = new Date(year, mi, 1);
            const off = Math.floor((md - s) / 86400000) + s.getDay();
            items.push(<text key={`mth${mi}`} x={LW + Math.floor(off / 7) * (CS + GAP)} y={12} fontSize={9} fill="var(--text-secondary)">
                {md.toLocaleString('en', { month: 'short' })}
            </text>);
        }
        for (let d = new Date(s); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
            const off = Math.floor((d - s) / 86400000) + s.getDay();
            const k = d.toISOString().slice(0, 10);
            const c = counts[k] || 0;
            items.push(<rect key={k} x={LW + Math.floor(off / 7) * (CS + GAP)} y={TOP + (off % 7) * (CS + GAP)}
                width={CS} height={CS} rx={2}
                fill={cc(c)} stroke={c ? 'none' : 'rgba(255,255,255,0.06)'} strokeWidth={0.5}
                {...dp(k, c)} />);
        }
        return { cells: items, vb: `0 0 580 ${TOP + 7 * (CS + GAP) + 2}`, fixedW: null, minW: 540 };
    }, [counts, year, period, records]);

    const fmtTipDate = iso => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div style={{ overflowX: 'auto', position: 'relative' }}>
            <svg width={fixedW ?? '100%'} viewBox={vb} style={{ display: 'block', minWidth: fixedW ? undefined : minW, cursor: 'default' }}
                onMouseOver={handleSvgOver} onMouseLeave={handleSvgLeave}>{cells}</svg>
            {tip && (
                <div style={{
                    position: 'fixed', left: tip.x + 14, top: tip.y - 58, pointerEvents: 'none', zIndex: 9999,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    borderRadius: 8, padding: '7px 12px', boxShadow: '0 4px 18px rgba(0,0,0,0.5)', minWidth: 130
                }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{fmtTipDate(tip.date)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0d9488', flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0d9488' }}>{tip.count}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tip.count === 1 ? 'person' : 'people'} on leave</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function fmtS(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
const cardStyle = { padding: 18, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' };
const ttStyle = { borderRadius: 8, fontSize: 12, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' };
const badge = { padding: '2px 7px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 600 };

export default memo(LeaveDashboard);
