import fs from 'fs';

for (const file of ['server.ts', 'api/index.ts']) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/const __dirname = path\.dirname\(fileURLToPath\(import\.meta\.url\)\);\n/g, '');
    fs.writeFileSync(file, code);
  }
}
