import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/leave/index.js';

export function useLeaveData() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [employees, setEmployees] = useState([]);
    const [records, setRecords] = useState([]);
    const [balances, setBalances] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const initialLoad = useRef(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [emp, rec, bal, hol, st] = await Promise.all([
                api.fetchEmployees(),
                api.fetchRecords(month, year),
                api.fetchBalances(month, year),
                api.fetchHolidays(year),
                api.fetchStats(month, year),
            ]);
            setEmployees(emp); setRecords(rec); setBalances(bal); setHolidays(hol); setStats(st);
        } catch (e) { console.error('Leave data fetch failed:', e); }
        setLoading(false);
    }, [month, year]);

    useEffect(() => {
        if (initialLoad.current) {
            initialLoad.current = false;
            // On first load, jump to the latest month that has data
            api.fetchLatestMonth().then(({ month: m, year: y }) => {
                if (m !== month || y !== year) { setMonth(m); setYear(y); }
                else refresh();
            }).catch(() => refresh());
        } else {
            refresh();
        }
    }, [refresh]);

    const uploadFile = useCallback(async (file) => {
        const result = await api.uploadExcel(file);
        await refresh();
        return result;
    }, [refresh]);

    return { month, year, setMonth, setYear, employees, records, balances, holidays, stats, loading, refresh, uploadFile };
}
