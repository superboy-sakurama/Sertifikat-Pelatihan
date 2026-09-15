import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');

// 1. Container dimensions
code = code.replace(/w-\[800px\]/g, 'w-[1122px]');
code = code.replace(/h-\[565px\]/g, 'h-[794px]');

// 2. Adjust internal positions for Page 1
code = code.replace('top-[265px]', 'top-[372px]');
code = code.replace('w-[580px] h-[70px]', 'w-[813px] h-[98px]');
// name font size
code = code.replace("text-[28px]'", "text-[39px]'");
code = code.replace("text-[34px]'", "text-[48px]'");
code = code.replace("text-[42px]'", "text-[59px]'");

// QR Code
code = code.replace('top-[305px] right-[85px]', 'top-[429px] right-[119px]');
code = code.replace('size={48}', 'size={67}');
code = code.replace('text-[6px]', 'text-[8px]');

// Health Status
code = code.replace('top-[362px]', 'top-[509px]');
code = code.replace('w-[400px]', 'w-[561px]');
code = code.replace('text-[22px]', 'text-[31px]');

// Date
code = code.replace('top-[402px] left-[450px]', 'top-[565px] left-[631px]');
code = code.replace('text-[14px]', 'text-[20px]');

// Signatures
code = code.replace('bottom-[40px] w-full px-20', 'bottom-[56px] w-full px-[112px]');
code = code.replace('w-56', 'w-[314px]');
code = code.replace('pl-8', 'pl-[45px]');
code = code.replace('text-[12px]', 'text-[17px]');
code = code.replace('text-[10px]', 'text-[14px]');

code = code.replace('w-64', 'w-[358px]');
code = code.replace('pr-4', 'pr-[22px]');

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
