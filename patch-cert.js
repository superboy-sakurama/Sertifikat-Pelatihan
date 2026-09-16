import fs from 'fs';

const file = 'src/pages/user/EventDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `alt="Template" className="absolute inset-0 w-full h-full object-cover z-0"`,
  `alt="Template" className="absolute inset-0 w-full h-full object-fill z-0"`
);

fs.writeFileSync(file, code);
