const BASE = '/api/leave';

async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
}

export const fetchEmployees = () => request('/employees');
export const addEmployee = (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) });
export const deleteEmployee = (id) => request(`/employees/${id}`, { method: 'DELETE' });

export const fetchRecords = (month, year) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    return request(`/records?${params}`);
};
export const addRecord = (data) => request('/records', { method: 'POST', body: JSON.stringify(data) });
export const updateRecord = (id, data) => request(`/records/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRecord = (id) => request(`/records/${id}`, { method: 'DELETE' });

export const fetchBalances = (month, year) => request(`/balances?month=${month}&year=${year}`);
export const upsertBalance = (data) => request('/balances', { method: 'POST', body: JSON.stringify(data) });

export const fetchHolidays = (year, location) => {
    let q = `/holidays?year=${year}`;
    if (location) q += `&location=${encodeURIComponent(location)}`;
    return request(q);
};
export const addHoliday = (data) => request('/holidays', { method: 'POST', body: JSON.stringify(data) });
export const bulkAddHolidays = (holidays) => request('/holidays/bulk', { method: 'POST', body: JSON.stringify({ holidays }) });
export const deleteHoliday = (id) => request(`/holidays/${id}`, { method: 'DELETE' });

export const fetchStats = (month, year) => request(`/stats?month=${month}&year=${year}`);
export const fetchLocations = () => request('/locations');
export const fetchLatestMonth = () => request('/latest-month');
export const seedData = (data) => request('/seed', { method: 'POST', body: JSON.stringify(data) });

export async function uploadExcel(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    return res.json();
}
