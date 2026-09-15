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

  // Get current Questions
  let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Questions?key=${process.env.GOOGLE_API_KEY}`);
  let data = await res.json();
  let values = data.values || [];

  if (values.length > 0 && values[0][0] !== 'QuestionID') {
     console.log("Headers missing, fixing...");
     const headers = ['QuestionID', 'EventID', 'Type', 'QuestionText', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'CorrectOption'];
     values.unshift(headers);

     // Clear sheet
     await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Questions:clear`, {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${token}` }
     });

     // Write back
     let writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Questions?valueInputOption=USER_ENTERED`, {
       method: 'PUT',
       headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
       body: JSON.stringify({ values })
     });
     console.log(await writeRes.json());
  } else {
     console.log("Already has headers or empty.");
  }
}
fix();
