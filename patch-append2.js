import fs from 'fs';

for (const file of ['server.ts', 'api/index.ts']) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(
      /const url = \`https:\/\/sheets.googleapis.com\/v4\/spreadsheets\/\$\{SPREADSHEET_ID\}\/values\/\$\{sheetName\}\!A1:Z:append\?valueInputOption=USER_ENTERED\`;/g,
      'const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:D:append?valueInputOption=USER_ENTERED`;'
    );
    fs.writeFileSync(file, code);
  }
}
