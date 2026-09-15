import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');

code = code.replace('text-2xl font-serif', 'text-4xl font-serif');
code = code.replace('flex-1 space-y-6 text-left', 'flex-1 space-y-8 text-left text-lg');
code = code.replace(/text-gray-600/g, 'text-gray-600 text-xl');
code = code.replace(/font-semibold text-gray-800/g, 'font-semibold text-gray-800 text-xl');
code = code.replace(/font-bold text-\[\#1a5b57\] mb-3/g, 'font-bold text-[#1a5b57] mb-4 text-2xl');

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
