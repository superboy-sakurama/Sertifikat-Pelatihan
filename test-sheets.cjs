const { GoogleAuth } = require('google-auth-library');
async function test() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/Questions?key=${process.env.GOOGLE_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
