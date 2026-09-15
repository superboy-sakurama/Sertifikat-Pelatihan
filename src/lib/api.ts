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

export async function fetchSheetData(sheetName: string) {
  const response = await fetch(`${API_BASE}/${sheetName}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sheetName}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || data.error);
  
  // Handle empty sheet case (API returns 200 OK but no values)
  if (!data.values || data.values.length === 0) {
     return []; // Return empty array explicitly
  }
  
  return rowsToObjects(data.values);
}

export async function fetchSystemStatus() {
  const response = await fetch('/api/sheets-status');
  return response.json();
}

export async function initializeSpreadsheet() {
  const response = await fetch('/api/sheets-init', {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gagal inisialisasi sheet');
  }
  return data;
}

export async function appendSheetData(sheetName: string, values: any[][]) {
  const response = await fetch(`${API_BASE}/${sheetName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `Failed to write to ${sheetName}`);
  }
  return data;
}

export async function updateSheetData(sheetName: string, id: string, values: any[][]) {
  const response = await fetch(`${API_BASE}/${sheetName}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `Failed to update ${sheetName}`);
  }
  return data;
}
