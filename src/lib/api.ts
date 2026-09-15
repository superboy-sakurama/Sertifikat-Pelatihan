/**
 * API Utility for communicating with our backend Express server
 * which proxies requests to Google Sheets API.
 */

const API_BASE = '/api/sheets';

// Helper to convert sheet rows (arrays) to objects based on a header row
export function rowsToObjects(rows: any[][]) {
  if (!rows || rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj: any = {};
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

// Helper to safely fetch and parse JSON, handling Vercel HTML error pages gracefully
async function safeFetchJson(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || `Server error: ${response.status}`);
      }
      return data;
    } else {
      // Server returned something else (e.g., HTML 404 page from Vercel)
      throw new Error(`Koneksi backend gagal. Terjadi kesalahan pada server (Endpoint tidak ditemukan).`);
    }
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Gagal terhubung ke server. Pastikan koneksi internet stabil dan backend berjalan.');
    }
    throw err;
  }
}

export async function fetchSheetData(sheetName: string) {
  const data = await safeFetchJson(`${API_BASE}/${sheetName}`);
  
  if (data.error) throw new Error(data.error.message || data.error);
  
  // Handle empty sheet case (API returns 200 OK but no values)
  if (!data.values || data.values.length === 0) {
     return []; // Return empty array explicitly
  }
  
  return rowsToObjects(data.values);
}

export async function fetchSystemStatus() {
  try {
    return await safeFetchJson('/api/sheets-status');
  } catch (err: any) {
    return { status: 'error', message: err.message || 'Gagal mengecek status server.' };
  }
}

export async function initializeSpreadsheet() {
  return await safeFetchJson('/api/sheets-init', { method: 'POST' });
}

export async function appendSheetData(sheetName: string, values: any[][]) {
  return await safeFetchJson(`${API_BASE}/${sheetName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
}

export async function updateSheetData(sheetName: string, id: string, values: any[][]) {
  return await safeFetchJson(`${API_BASE}/${sheetName}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
}
