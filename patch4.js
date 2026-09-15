import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');
code = code.replace(
  'const [base64Template, setBase64Template] = useState<string | null>(null);\n  const [base64Template, setBase64Template] = useState<string | null>(null);',
  'const [base64Template, setBase64Template] = useState<string | null>(null);'
);
fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
