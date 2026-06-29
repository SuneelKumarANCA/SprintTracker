import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'leave.db');

let db;

export function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initSchema(db);
        seedHolidaysIfEmpty(db);
    }
    return db;
}

function initSchema(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      doj TEXT,
      department TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      el_opening REAL DEFAULT 0,
      el_availed REAL DEFAULT 0,
      el_balance REAL DEFAULT 0,
      cl_opening REAL DEFAULT 0,
      cl_availed REAL DEFAULT 0,
      cl_balance REAL DEFAULT 0,
      sl_opening REAL DEFAULT 0,
      sl_availed REAL DEFAULT 0,
      sl_balance REAL DEFAULT 0,
      UNIQUE(employee_id, month, year),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leave_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL CHECK(leave_type IN ('EL','CL','SL','LWP','CO','RH')),
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      days REAL NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      remarks TEXT,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'gazetted' CHECK(type IN ('gazetted','restricted','optional')),
      location TEXT DEFAULT 'Bangalore',
      year INTEGER NOT NULL,
      UNIQUE(date, location)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_dedup ON leave_records(employee_id, leave_type, from_date, to_date);
    CREATE INDEX IF NOT EXISTS idx_records_month_year ON leave_records(month, year);
    CREATE INDEX IF NOT EXISTS idx_balances_month_year ON leave_balances(month, year);
    CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);
  `);
}

/** Auto-seed holidays from default data if table is empty */
function seedHolidaysIfEmpty(db) {
    const count = db.prepare('SELECT COUNT(*) as c FROM holidays').get().c;
    if (count > 0) return;
    try {
        const dataPath = join(__dirname, '..', '..', 'src', 'data', 'defaultLeaveData.js');
        const src = readFileSync(dataPath, 'utf-8');
        // Extract holidays JSON from the ES module file
        const match = src.match(/holidays\s*:\s*(\{[\s\S]*?\n\s*\})\s*[,\n]/);
        if (!match) return;
        // Use Function to safely evaluate the object literal
        const holidays = new Function(`return ${match[1]}`)();
        const stmt = db.prepare('INSERT OR IGNORE INTO holidays (date, name, type, location, year) VALUES (?,?,?,?,?)');
        const tx = db.transaction(() => {
            for (const [location, list] of Object.entries(holidays)) {
                for (const h of list) {
                    const yr = new Date(h.date).getFullYear();
                    stmt.run(h.date, h.event || h.name, 'gazetted', location, yr);
                }
            }
        });
        tx();
        console.log('[leave-db] Auto-seeded holidays from default data');
    } catch (e) {
        // Non-critical — holidays can be added manually
        console.warn('[leave-db] Could not auto-seed holidays:', e.message);
    }
}
