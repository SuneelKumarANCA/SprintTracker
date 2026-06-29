import { memo } from 'react';

function LeaveNavTabs({ tabs, active, onChange }) {
    return (
        <nav style={{ display: 'flex', gap: 2, background: 'var(--bg-secondary)', borderRadius: 8, padding: 3 }}>
            {tabs.map(tab => (
                <button
                    key={tab}
                    onClick={() => onChange(tab)}
                    aria-current={active === tab ? 'page' : undefined}
                    style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                        background: active === tab ? 'var(--bg-primary)' : 'transparent',
                        color: active === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: active === tab ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                    }}
                >
                    {tab}
                </button>
            ))}
        </nav>
    );
}

export default memo(LeaveNavTabs);
