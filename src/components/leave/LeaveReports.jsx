import { memo } from 'react';
import { utils, writeFile } from 'xlsx-js-style';

function LeaveReports({ records, employees, balances, month, year }) {
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    const exportRecords = () => {
        const data = records.map(r => ({ Employee: r.employee_name, Code: r.employee_code, Type: r.leave_type, From: r.from_date, To: r.to_date, Days: r.days, Remarks: r.remarks || '' }));
        download(data, `Leave_Records_${monthName}_${year}.xlsx`, 'Records');
    };

    const exportBalances = () => {
        const data = (balances || []).map(b => ({ Employee: b.employee_name, Code: b.employee_code, 'EL Opening': b.el_opening, 'EL Availed': b.el_availed, 'EL Balance': b.el_balance, 'CL Opening': b.cl_opening, 'CL Availed': b.cl_availed, 'CL Balance': b.cl_balance, 'SL Opening': b.sl_opening, 'SL Availed': b.sl_availed, 'SL Balance': b.sl_balance }));
        download(data, `Leave_Balances_${monthName}_${year}.xlsx`, 'Balances');
    };

    const exportSummary = () => {
        const data = employees.map(emp => {
            const empRecs = records.filter(r => r.employee_code === emp.code);
            const el = empRecs.filter(r => r.leave_type === 'EL').reduce((s, r) => s + r.days, 0);
            const cl = empRecs.filter(r => r.leave_type === 'CL').reduce((s, r) => s + r.days, 0);
            const sl = empRecs.filter(r => r.leave_type === 'SL').reduce((s, r) => s + r.days, 0);
            return { Employee: emp.name, Code: emp.code, EL: el, CL: cl, SL: sl, Total: el + cl + sl };
        });
        download(data, `Leave_Summary_${monthName}_${year}.xlsx`, 'Summary');
    };

    const exportPDF = () => {
        const rows = records.map(r => [r.employee_name, r.employee_code, r.leave_type, r.from_date, r.to_date, r.days]);
        const cols = ['Employee', 'Code', 'Type', 'From', 'To', 'Days'];
        generatePDF(`Leave Records — ${monthName} ${year}`, cols, rows, `Leave_Records_${monthName}_${year}.pdf`);
    };

    return (
        <div>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)' }}>Reports — {monthName} {year}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <ReportCard title="Leave Records" desc="All leave entries for the month" onClick={exportRecords} format="Excel" />
                <ReportCard title="Leave Balances" desc="EL/CL/SL balance per employee" onClick={exportBalances} format="Excel" />
                <ReportCard title="Monthly Summary" desc="Leave utilization per person" onClick={exportSummary} format="Excel" />
                <ReportCard title="Records PDF" desc="Leave records as PDF document" onClick={exportPDF} format="PDF" />
            </div>
        </div>
    );
}

function ReportCard({ title, desc, onClick, format }) {
    return (
        <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>{desc}</div>
            <button onClick={onClick} style={btnStyle}>Export {format}</button>
        </div>
    );
}

function download(data, filename, sheetName) {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, sheetName);
    writeFile(wb, filename);
}

async function generatePDF(title, columns, rows, filename) {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 14, 21);
    autoTable(doc, { head: [columns], body: rows, startY: 26, theme: 'grid', headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 9 }, styles: { fontSize: 8, cellPadding: 2 } });
    doc.save(filename);
}

const cardStyle = { padding: 18, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' };
const btnStyle = { padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--color-accent, #3b82f6)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 };

export default memo(LeaveReports);
