import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');

code = code.replace(
  'const [actionLoading, setActionLoading] = useState(false);',
  'const [actionLoading, setActionLoading] = useState(false);\n  const [base64Template, setBase64Template] = useState<string | null>(null);'
);

code = code.replace(
  '<div className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none opacity-0 flex flex-col gap-10">',
  '<div className="absolute top-[-9999px] left-[-9999px] pointer-events-none flex flex-col gap-10">'
);

code = code.replace(
  '<img src={backgroundImageUrl.startsWith(\'http\') ? `/api/proxy-image?url=${encodeURIComponent(backgroundImageUrl)}` : backgroundImageUrl} crossOrigin="anonymous" alt="Template" className="absolute inset-0 w-full h-full object-cover z-0" />',
  '<img src={base64Template || (backgroundImageUrl.startsWith(\'http\') ? `/api/proxy-image?url=${encodeURIComponent(backgroundImageUrl)}` : backgroundImageUrl)} crossOrigin="anonymous" alt="Template" className="absolute inset-0 w-full h-full object-cover z-0" />'
);

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
