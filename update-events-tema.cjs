const { GoogleAuth } = require('google-auth-library');

async function fix() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!clientEmail || !privateKey) return console.log('No credentials');
  
  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Events!A1:Z`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await getRes.json();
  const rows = data.values || [];

  if (rows.length > 0) {
    const headers = rows[0];
    if (!headers.includes('Tema')) {
        // Insert Tema after Judul (index 1) -> so Judul is 1, Tema becomes 2. 
        // Wait, let's just append it at the end to be safe, or put it after Judul.
        // If we put it after Judul, it shifts everything. Let's just put it after Judul.
        // Actually, let's put it at the end to avoid messing up existing indices if anything relies on them (though we use rowsToObjects).
        // rowsToObjects uses headers, so order doesn't matter.
        // Let's put it after Judul.
        for (let i = 0; i < rows.length; i++) {
            rows[i].splice(2, 0, i === 0 ? 'Tema' : '');
        }
        const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Events!A1:Z?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: rows })
        });
        console.log("Update Events sheet:", await updateRes.json());
    } else {
        console.log("Tema already exists in Events sheet.");
    }
  }
}
fix();
