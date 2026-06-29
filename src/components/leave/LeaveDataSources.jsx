import { memo, useState, useCallback } from 'react';
import { useToast } from '../views/LeaveView.jsx';
import { seedData } from '../../services/leave/index.js';

function LeaveDataSources({ onUpload, refresh }) {
    const toast = useToast();
    const [excelFile, setExcelFile] = useState(null);
    const [excelDrag, setExcelDrag] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const handleExcelDrop = useCallback((e) => {
        e.preventDefault();
        setExcelDrag(false);
        const f = e.dataTransfer?.files?.[0];
        if (f && /\.(xlsx|xls)$/i.test(f.name)) setExcelFile(f);
    }, []);

    const handleExcelUpload = async () => {
        if (!excelFile) return;
        setUploading(true);
        try {
            const result = await onUpload(excelFile);
            if (result.employeeCount === 0 && result.debug) {
                const d = result.debug;
                toast?.(`No data parsed. Sheets: ${d.sheetNames?.join(', ')}. Headers: ${d.empHeaders?.slice(0, 5).join(', ')}...`, 'error');
            } else {
                toast?.(`Imported ${result.employeeCount} employees, ${result.recordCount} records`, 'success');
            }
            setExcelFile(null);
            refresh();
        } catch (e) { toast?.(`Upload failed: ${e.message}`, 'error'); }
        setUploading(false);
    };

    const handleSeedDefault = async () => {
        setSeeding(true);
        try {
            const { DEFAULT_DATA } = await import('../../data/defaultLeaveData.js');
            const result = await seedData(DEFAULT_DATA);
            toast?.(`Seeded ${result.employeeCount} employees, ${result.recordCount} records, ${result.holidayCount} holidays`, 'success');
            refresh();
        } catch (e) { toast?.(`Seed failed: ${e.message}`, 'error'); }
        setSeeding(false);
    };

    return (
        <div>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, color: 'var(--text-primary)' }}>Data Sources</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Excel Upload */}
                <div style={cardStyle}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Upload Leave Excel</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                        Two-sheet format: "consolidated-India" (employees) + "Details" (leave records)
                    </div>
                    <div
                        onDragOver={e => { e.preventDefault(); setExcelDrag(true); }}
                        onDragLeave={() => setExcelDrag(false)}
                        onDrop={handleExcelDrop}
                        style={{ ...dropZone, borderColor: excelDrag ? 'var(--color-accent, #3b82f6)' : 'var(--border-primary)' }}
                    >
                        {excelFile ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>{excelFile.name}</div>
                                <button onClick={handleExcelUpload} disabled={uploading} style={btnStyle}>
                                    {uploading ? 'Importing...' : 'Import'}
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Drag & drop .xlsx here</div>
                                <label style={fileLabelStyle}>
                                    Browse
                                    <input type="file" accept=".xlsx,.xls" onChange={e => setExcelFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Seed Default Data */}
                <div style={cardStyle}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Seed Default Data</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                        Load the embedded AMT India leave data (33 employees, 170+ records, holiday calendars for Bangalore/Pune/Delhi)
                    </div>
                    <button onClick={handleSeedDefault} disabled={seeding} style={{ ...btnStyle, width: '100%', padding: '12px' }}>
                        {seeding ? 'Seeding...' : 'Load Default Data'}
                    </button>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10 }}>
                        This will upsert employees and add leave records. Existing data is preserved.
                    </div>
                </div>
            </div>
        </div>
    );
}

const cardStyle = { padding: 20, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' };
const dropZone = { padding: 28, border: '2px dashed var(--border-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, transition: 'border-color .2s' };
const btnStyle = { padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--color-accent, #3b82f6)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 };
const fileLabelStyle = { display: 'inline-block', padding: '6px 14px', borderRadius: 6, background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', border: '1px solid var(--border-primary)' };

export default memo(LeaveDataSources);
