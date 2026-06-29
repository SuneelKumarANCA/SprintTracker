import XLSX from 'xlsx-js-style';
const { read, utils } = XLSX;

/**
 * Parse an uploaded Excel buffer.
 * Handles the AMT India HR format:
 *   - "consolidated-India" sheet: employee master (grouped header)
 *   - "Details" sheet: per-employee grouped leave entries (NOT a flat table)
 */
export function parseLeaveExcel(buffer) {
    const wb = read(buffer, { type: 'buffer' });
    const debug = { sheetNames: wb.SheetNames };

    // Find employee sheet
    const empSheetName = wb.SheetNames.find(n => /consol|employee|master|india|summary/i.test(n)) || wb.SheetNames[0];
    debug.empSheet = empSheetName;

    const empSheet = wb.Sheets[empSheetName];
    const empRaw = utils.sheet_to_json(empSheet, { header: 1, defval: '' });
    const employees = parseConsolidatedSheet(empRaw, debug);

    // Find details sheet
    const detSheetName = wb.SheetNames.find(n => /detail/i.test(n)) || wb.SheetNames[1];
    let records = [];
    if (detSheetName && wb.Sheets[detSheetName]) {
        debug.detSheet = detSheetName;
        const detRaw = utils.sheet_to_json(wb.Sheets[detSheetName], { header: 1, defval: '' });
        records = parseGroupedDetailsSheet(detRaw, employees, debug);
    }

    return { employees, records, debug };
}

/**
 * Parse consolidated-India sheet.
 * Find the header row (has EMP_CODE / Employee Name), then parse rows below it.
 */
function parseConsolidatedSheet(rawRows, debug) {
    // Find header row containing EMP_CODE or similar
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        const cells = (rawRows[i] || []).map(c => String(c || '').trim().toUpperCase());
        if (cells.some(c => /EMP.?CODE|EMPLOYEE.?CODE/i.test(c)) && cells.some(c => /NAME/i.test(c))) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) {
        debug.empHeaderRow = -1;
        debug.empNote = 'Could not find header row with EMP_CODE + Name';
        return [];
    }

    const headers = rawRows[headerIdx].map(c => String(c || '').trim());
    debug.empHeaderRow = headerIdx;
    debug.empHeaders = headers.filter(Boolean);

    // Map column indexes
    const codeIdx = headers.findIndex(h => /emp.?code/i.test(h));
    const nameIdx = headers.findIndex(h => /name/i.test(h));
    const dojIdx = headers.findIndex(h => /doj/i.test(h));

    const employees = [];
    for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i] || [];
        const codeRaw = row[codeIdx];
        const nameRaw = row[nameIdx];
        const code = normalizeCode(codeRaw);
        if (!code) continue;
        const name = String(nameRaw || '').trim();
        if (!name || /^name$/i.test(name)) continue;

        employees.push({
            code,
            name,
            doj: parseDate(row[dojIdx]) || '',
            department: '',
            el_opening: 0, el_availed: 0, el_balance: 0,
            cl_opening: 0, cl_availed: 0, cl_balance: 0,
            sl_opening: 0, sl_availed: 0, sl_balance: 0,
        });
    }

    debug.parsedEmployees = employees.length;
    return employees;
}

/**
 * Parse the "Details" sheet which has a grouped per-employee format:
 *   Row: DOJ | EMP_CODE | Employee Name | From | To | Credit | Utilized | Closing | From | To | Credit | Utilized | Closing | From | To | ...
 *   The first 3 cols identify employee, then EL(5 cols), CL(5 cols), SL(5 cols)
 *   Leave entries are rows below each employee header with dates in the From/To columns.
 */
function parseGroupedDetailsSheet(rawRows, employees, debug) {
    const codeSet = new Set(employees.map(e => e.code));
    const records = [];
    let currentCode = null;

    // Find the structure: look for a row that has AMTI-xxx code
    // The columns after DOJ/CODE/Name are: EL(From,To,Credit,Utilized,Closing), CL(From,To,...), SL(From,To,...)
    // Based on debug: col0=DOJ, col1=EMP_CODE, col2=Employee Name, col3-7=EL, col8-12=CL, col13-17=SL

    // Column offsets for leave entries (From, To relative to each leave type group)
    const EL_FROM = 3, EL_TO = 4;
    const CL_FROM = 8, CL_TO = 9;
    const SL_FROM = 13, SL_TO = 14;

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i] || [];
        const col1 = String(row[1] || '').trim();

        // Check if this is an employee header row (has AMTI-xxx in col 1)
        if (/^AMTI-?\d+/i.test(col1)) {
            currentCode = normalizeCode(col1);
            continue;
        }

        // Skip if no current employee or row is a meta row (OB, Leave Credit, etc.)
        if (!currentCode || !codeSet.has(currentCode)) continue;
        const col0str = String(row[0] || '').trim();
        if (/^(OB|Leave Credit|Opening|Credit|Total|Closing)/i.test(col0str)) continue;
        if (!row[EL_FROM] && !row[CL_FROM] && !row[SL_FROM]) continue;

        // Try to extract leave entries from EL columns
        const elFrom = parseDate(row[EL_FROM]);
        const elTo = parseDate(row[EL_TO]);
        if (elFrom) {
            records.push(makeRecord(currentCode, 'EL', elFrom, elTo || elFrom));
        }

        // CL columns
        const clFrom = parseDate(row[CL_FROM]);
        const clTo = parseDate(row[CL_TO]);
        if (clFrom) {
            records.push(makeRecord(currentCode, 'CL', clFrom, clTo || clFrom));
        }

        // SL columns
        const slFrom = parseDate(row[SL_FROM]);
        const slTo = parseDate(row[SL_TO]);
        if (slFrom) {
            records.push(makeRecord(currentCode, 'SL', slFrom, slTo || slFrom));
        }
    }

    debug.parsedRecords = records.length;
    return records;
}

function makeRecord(code, type, fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
    return {
        employee_code: code,
        leave_type: type,
        from_date: fromDate,
        to_date: toDate,
        days,
        month: from.getMonth() + 1,
        year: from.getFullYear(),
        remarks: '',
    };
}

function normalizeCode(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toUpperCase();
    if (!s || s === '0' || s === 'NAN') return null;
    if (/^AMTI-?\d+/i.test(s)) return s.replace(/^AMTI-?/i, 'AMTI-').replace(/AMTI-(\d+)/, (_, d) => `AMTI-${d.padStart(3, '0')}`);
    const m = s.match(/(\d+)/);
    if (m) return `AMTI-${m[1].padStart(3, '0')}`;
    return s;
}

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

function parseDate(raw) {
    if (!raw) return null;
    if (typeof raw === 'number') {
        // Excel serial date
        if (raw > 40000 && raw < 60000) {
            const d = new Date((raw - 25569) * 86400000);
            if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
        return null;
    }
    const s = String(raw).trim();
    if (!s || /^(From|To|Credit|Utilized|Closing|Balance)/i.test(s)) return null;
    // Try ISO
    const iso = new Date(s);
    if (!isNaN(iso.getTime()) && iso.getFullYear() > 1970) return iso.toISOString().slice(0, 10);
    // Try DD/MM/YYYY or DD-MM-YYYY
    const m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (m) {
        const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
        const d = new Date(yr, Number(m[2]) - 1, Number(m[1]));
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
}
