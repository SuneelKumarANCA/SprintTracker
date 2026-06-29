import { memo, useState, useCallback } from 'react';

function LeaveUploadModal({ onClose, onUpload }) {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer?.files?.[0];
        if (f && /\.(xlsx|xls)$/i.test(f.name)) setFile(f);
    }, []);

    const handleUpload = async () => {
        if (!file) return;
        setStatus('Uploading...');
        try {
            const result = await onUpload(file);
            setStatus(`Imported ${result.employeeCount} employees, ${result.recordCount} records`);
            setTimeout(onClose, 2000);
        } catch (e) { setStatus(`Error: ${e.message}`); }
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>Upload Excel</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    style={{ ...dropZone, borderColor: dragging ? 'var(--color-accent, #3b82f6)' : 'var(--border-primary)' }}
                >
                    {file ? <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{file.name}</span> : (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Drag & drop .xlsx here or</div>
                            <label style={fileLabelStyle}>
                                Browse
                                <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                            </label>
                        </div>
                    )}
                </div>
                {status && <div style={{ marginTop: 10, fontSize: 12, color: status.startsWith('Error') ? '#ef4444' : 'var(--text-secondary)' }}>{status}</div>}
                <button onClick={handleUpload} disabled={!file} style={{ ...btnStyle, marginTop: 16, opacity: file ? 1 : 0.5 }}>Import</button>
            </div>
        </div>
    );
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { background: 'var(--bg-primary)', borderRadius: 12, padding: 24, width: 420, maxWidth: '90vw', boxShadow: '0 10px 40px rgba(0,0,0,.2)' };
const dropZone = { padding: 32, border: '2px dashed var(--border-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 };
const fileLabelStyle = { display: 'inline-block', marginTop: 8, padding: '6px 14px', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', border: '1px solid var(--border-primary)' };
const btnStyle = { width: '100%', padding: '10px', borderRadius: 6, border: 'none', background: 'var(--color-accent, #3b82f6)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 };

export default memo(LeaveUploadModal);
