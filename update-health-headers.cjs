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

  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/HealthAssessments!A1:Z`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await getRes.json();
  const rows = data.values || [];

  if (rows.length > 0) {
    const headers = rows[0];
    const expectedHeaders = ['AssessmentID', 'RegID', 'Status', 'Timestamp', 'BB', 'TB', 'TekananDarah', 'GDA', 'SkriningTB', 'HBsAg'];
    
    let needsUpdate = false;
    for (let i = 0; i < expectedHeaders.length; i++) {
        if (headers[i] !== expectedHeaders[i]) {
            headers[i] = expectedHeaders[i];
            needsUpdate = true;
        }
    }
    
    if (needsUpdate) {
        rows[0] = headers;
        const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/HealthAssessments!A1:J1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [headers] })
        });
        console.log("Update HealthAssessments headers:", await updateRes.json());
    } else {
        console.log("HealthAssessments headers are already correct.");
    }
  }
}
fix();
