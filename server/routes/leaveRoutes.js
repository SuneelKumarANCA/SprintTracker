import { Router } from 'express';
import multer from 'multer';
import { getDb } from '../db/leaveDb.js';
import { parseLeaveExcel } from '../services/leaveExcelParser.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// --- Employees ---
router.get('/employees', (req, res) => {
    const rows = getDb().prepare('SELECT * FROM employees ORDER BY name').all();
    res.json(rows);
});

router.post('/employees', (req, res) => {
    const { code, name, doj, department } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name required' });
    const stmt = getDb().prepare(
        'INSERT INTO employees (code, name, doj, department) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, doj=excluded.doj, department=excluded.department'
    );
    const info = stmt.run(code, name, doj || null, department || null);
    res.json({ id: info.lastInsertRowid, code, name });
});

router.delete('/employees/:id', (req, res) => {
    getDb().prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// --- Leave Records ---
router.get('/records', (req, res) => {
    const { month, year } = req.query;
    let sql = `SELECT lr.*, e.name as employee_name, e.code as employee_code
             FROM leave_records lr JOIN employees e ON lr.employee_id = e.id`;
    const params = [];
    if (month && year) { sql += ' WHERE lr.month = ? AND lr.year = ?'; params.push(month, year); }
    else if (year) { sql += ' WHERE lr.year = ?'; params.push(year); }
    sql += ' ORDER BY lr.from_date DESC';
    res.json(getDb().prepare(sql).all(...params));
});

router.post('/records', (req, res) => {
    const { employee_id, leave_type, from_date, to_date, days, month, year, remarks } = req.body;
    if (!employee_id || !leave_type || !from_date || !days) {
        return res.status(400).json({ error: 'employee_id, leave_type, from_date, days required' });
    }
    const m = month || new Date(from_date).getMonth() + 1;
    const y = year || new Date(from_date).getFullYear();
    const info = getDb().prepare(
        'INSERT INTO leave_records (employee_id, leave_type, from_date, to_date, days, month, year, remarks) VALUES (?,?,?,?,?,?,?,?)'
    ).run(employee_id, leave_type, from_date, to_date || from_date, days, m, y, remarks || null);
    res.json({ id: info.lastInsertRowid });
});

router.put('/records/:id', (req, res) => {
    const { leave_type, from_date, to_date, days, remarks } = req.body;
    getDb().prepare(
        'UPDATE leave_records SET leave_type=?, from_date=?, to_date=?, days=?, remarks=? WHERE id=?'
    ).run(leave_type, from_date, to_date, days, remarks || null, req.params.id);
    res.json({ ok: true });
});

router.delete('/records/:id', (req, res) => {
    getDb().prepare('DELETE FROM leave_records WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// --- Balances ---
router.get('/balances', (req, res) => {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });
    const rows = getDb().prepare(
        `SELECT lb.*, e.name as employee_name, e.code as employee_code
     FROM leave_balances lb JOIN employees e ON lb.employee_id = e.id
     WHERE lb.month = ? AND lb.year = ? ORDER BY e.name`
    ).all(month, year);
    res.json(rows);
});

router.post('/balances', (req, res) => {
    const { employee_id, month, year, el_opening, el_availed, el_balance, cl_opening, cl_availed, cl_balance, sl_opening, sl_availed, sl_balance } = req.body;
    if (!employee_id || !month || !year) return res.status(400).json({ error: 'employee_id, month, year required' });
    getDb().prepare(
        `INSERT INTO leave_balances (employee_id, month, year, el_opening, el_availed, el_balance, cl_opening, cl_availed, cl_balance, sl_opening, sl_availed, sl_balance)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(employee_id, month, year) DO UPDATE SET
       el_opening=excluded.el_opening, el_availed=excluded.el_availed, el_balance=excluded.el_balance,
       cl_opening=excluded.cl_opening, cl_availed=excluded.cl_availed, cl_balance=excluded.cl_balance,
       sl_opening=excluded.sl_opening, sl_availed=excluded.sl_availed, sl_balance=excluded.sl_balance`
    ).run(employee_id, month, year, el_opening || 0, el_availed || 0, el_balance || 0, cl_opening || 0, cl_availed || 0, cl_balance || 0, sl_opening || 0, sl_availed || 0, sl_balance || 0);
    res.json({ ok: true });
});

// --- Holidays ---
router.get('/holidays', (req, res) => {
    const { year, location } = req.query;
    let sql = 'SELECT * FROM holidays WHERE 1=1';
    const params = [];
    if (year) { sql += ' AND year = ?'; params.push(year); }
    if (location) { sql += ' AND location = ?'; params.push(location); }
    sql += ' ORDER BY date';
    res.json(getDb().prepare(sql).all(...params));
});

router.post('/holidays', (req, res) => {
    const { date, name, type, location } = req.body;
    if (!date || !name) return res.status(400).json({ error: 'date and name required' });
    const year = new Date(date).getFullYear();
    const loc = location || 'Bangalore';
    getDb().prepare(
        'INSERT INTO holidays (date, name, type, location, year) VALUES (?,?,?,?,?) ON CONFLICT(date, location) DO UPDATE SET name=excluded.name, type=excluded.type'
    ).run(date, name, type || 'gazetted', loc, year);
    res.json({ ok: true });
});

router.post('/holidays/bulk', (req, res) => {
    const { holidays } = req.body;
    if (!Array.isArray(holidays)) return res.status(400).json({ error: 'holidays array required' });
    const db = getDb();
    const stmt = db.prepare(
        'INSERT INTO holidays (date, name, type, location, year) VALUES (?,?,?,?,?) ON CONFLICT(date, location) DO UPDATE SET name=excluded.name, type=excluded.type'
    );
    const tx = db.transaction(() => {
        for (const h of holidays) {
            const yr = new Date(h.date).getFullYear();
            stmt.run(h.date, h.name || h.event, h.type || 'gazetted', h.location || 'Bangalore', yr);
        }
    });
    tx();
    res.json({ ok: true, count: holidays.length });
});

router.delete('/holidays/:id', (req, res) => {
    getDb().prepare('DELETE FROM holidays WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// --- Stats ---
router.get('/stats', (req, res) => {
    const { month, year } = req.query;
    const db = getDb();
    const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
    const params = month && year ? [month, year] : [];
    const whereClause = month && year ? 'WHERE month = ? AND year = ?' : '';
    const totalRecords = db.prepare(`SELECT COUNT(*) as count FROM leave_records ${whereClause}`).get(...params).count;
    const totalDays = db.prepare(`SELECT COALESCE(SUM(days), 0) as total FROM leave_records ${whereClause}`).get(...params).total;
    const byType = db.prepare(
        `SELECT leave_type, COUNT(*) as count, COALESCE(SUM(days), 0) as days FROM leave_records ${whereClause} GROUP BY leave_type`
    ).all(...params);
    const onLeaveToday = db.prepare(
        "SELECT COUNT(DISTINCT employee_id) as count FROM leave_records WHERE from_date <= date('now') AND to_date >= date('now')"
    ).get().count;
    res.json({ totalEmployees, totalRecords, totalDays, byType, onLeaveToday });
});

// --- Excel Upload ---
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        const { employees, records, debug } = parseLeaveExcel(req.file.buffer);
        if (debug) console.log('[leave-upload]', JSON.stringify(debug, null, 2));
        const db = getDb();
        const insertEmp = db.prepare(
            'INSERT INTO employees (code, name, doj, department) VALUES (?,?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, doj=excluded.doj, department=excluded.department'
        );
        const insertBal = db.prepare(
            `INSERT INTO leave_balances (employee_id, month, year, el_opening, el_availed, el_balance, cl_opening, cl_availed, cl_balance, sl_opening, sl_availed, sl_balance)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(employee_id, month, year) DO UPDATE SET
         el_opening=excluded.el_opening, el_availed=excluded.el_availed, el_balance=excluded.el_balance,
         cl_opening=excluded.cl_opening, cl_availed=excluded.cl_availed, cl_balance=excluded.cl_balance,
         sl_opening=excluded.sl_opening, sl_availed=excluded.sl_availed, sl_balance=excluded.sl_balance`
        );
        const insertRec = db.prepare(
            'INSERT INTO leave_records (employee_id, leave_type, from_date, to_date, days, month, year, remarks) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(employee_id, leave_type, from_date, to_date) DO NOTHING'
        );

        const now = new Date();
        const curMonth = now.getMonth() + 1;
        const curYear = now.getFullYear();

        const importTransaction = db.transaction(() => {
            const empIds = new Map();
            for (const emp of employees) {
                insertEmp.run(emp.code, emp.name, emp.doj || null, emp.department || null);
                const row = db.prepare('SELECT id FROM employees WHERE code = ?').get(emp.code);
                empIds.set(emp.code, row.id);
                insertBal.run(row.id, curMonth, curYear, emp.el_opening, emp.el_availed, emp.el_balance, emp.cl_opening, emp.cl_availed, emp.cl_balance, emp.sl_opening, emp.sl_availed, emp.sl_balance);
            }
            let recordCount = 0;
            for (const rec of records) {
                const empId = empIds.get(rec.employee_code);
                if (!empId) continue;
                insertRec.run(empId, rec.leave_type, rec.from_date, rec.to_date, rec.days, rec.month, rec.year, rec.remarks || null);
                recordCount++;
            }
            return { employeeCount: employees.length, recordCount };
        });

        const result = importTransaction();
        res.json({ ok: true, ...result, debug });
    } catch (err) {
        res.status(422).json({ error: 'Failed to parse Excel: ' + err.message });
    }
});

// --- Seed from embedded JSON data ---
router.post('/seed', (req, res) => {
    const { employees, leaves, holidays } = req.body;
    if (!employees || !leaves) return res.status(400).json({ error: 'employees and leaves arrays required' });
    const db = getDb();
    const insertEmp = db.prepare(
        'INSERT INTO employees (code, name, doj) VALUES (?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, doj=excluded.doj'
    );
    const insertBal = db.prepare(
        `INSERT INTO leave_balances (employee_id, month, year, el_balance, cl_balance, sl_balance)
     VALUES (?,?,?,?,?,?) ON CONFLICT(employee_id, month, year) DO UPDATE SET
       el_balance=excluded.el_balance, cl_balance=excluded.cl_balance, sl_balance=excluded.sl_balance`
    );
    const insertRec = db.prepare(
        'INSERT INTO leave_records (employee_id, leave_type, from_date, to_date, days, month, year) VALUES (?,?,?,?,?,?,?)'
    );
    const insertHol = db.prepare(
        'INSERT INTO holidays (date, name, type, location, year) VALUES (?,?,?,?,?) ON CONFLICT(date, location) DO UPDATE SET name=excluded.name'
    );

    const now = new Date();
    const tx = db.transaction(() => {
        const empIds = new Map();
        for (const emp of employees) {
            insertEmp.run(emp.emp_code, emp.name, emp.doj || null);
            const row = db.prepare('SELECT id FROM employees WHERE code = ?').get(emp.emp_code);
            empIds.set(emp.emp_code, row.id);
            if (emp.balance) {
                insertBal.run(row.id, now.getMonth() + 1, now.getFullYear(), emp.balance.EL || 0, emp.balance.CL || 0, emp.balance.SL || 0);
            }
        }
        let recCount = 0;
        for (const lv of leaves) {
            const empId = empIds.get(lv.emp_code);
            if (!empId) continue;
            const d = new Date(lv.from_date);
            const type = ['EL', 'CL', 'SL', 'LWP', 'CO', 'RH'].includes(lv.leave_type) ? lv.leave_type : 'EL';
            insertRec.run(empId, type, lv.from_date, lv.to_date || lv.from_date, lv.days, d.getMonth() + 1, d.getFullYear());
            recCount++;
        }
        let holCount = 0;
        if (holidays && typeof holidays === 'object') {
            for (const [location, list] of Object.entries(holidays)) {
                for (const h of list) {
                    const yr = new Date(h.date).getFullYear();
                    insertHol.run(h.date, h.event || h.name, 'gazetted', location, yr);
                    holCount++;
                }
            }
        }
        return { employeeCount: employees.length, recordCount: recCount, holidayCount: holCount };
    });

    const result = tx();
    res.json({ ok: true, ...result });
});

// --- Locations ---
router.get('/locations', (req, res) => {
    const rows = getDb().prepare('SELECT DISTINCT location FROM holidays ORDER BY location').all();
    res.json(rows.map(r => r.location));
});

// --- Latest month with data ---
router.get('/latest-month', (req, res) => {
    const row = getDb().prepare('SELECT month, year FROM leave_records ORDER BY year DESC, month DESC LIMIT 1').get();
    res.json(row || { month: new Date().getMonth() + 1, year: new Date().getFullYear() });
});

export default router;
