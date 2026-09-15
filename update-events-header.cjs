const { GoogleAuth } = require('google-auth-library');

async function fix() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

  // Let's first get the existing data of Events to see what we have
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Events!A1:J`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await getRes.json();
  const rows = data.values || [];

  if (rows.length > 0) {
    const headers = rows[0];
    if (!headers.includes('TanggalPelaksanaan')) {
        // Insert TanggalPelaksanaan after TanggalSelesai (index 3)
        for (let i = 0; i < rows.length; i++) {
            rows[i].splice(4, 0, i === 0 ? 'TanggalPelaksanaan' : '');
        }
        const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Events!A1:K?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: rows })
        });
        console.log("Update Events sheet:", await updateRes.json());
    } else {
        console.log("TanggalPelaksanaan already exists in Events sheet.");
    }
  }
}
fix();
