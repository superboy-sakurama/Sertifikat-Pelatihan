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

  const headers = ['AssessmentID', 'RegID', 'Status', 'Timestamp', 'BB', 'TB', 'TekananDarah', 'GDA', 'SkriningTB', 'HBsAg'];
  let headerRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/HealthAssessments!A1:J1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [headers] })
  });
  console.log("Update headers:", await headerRes.json());
}
fix();
