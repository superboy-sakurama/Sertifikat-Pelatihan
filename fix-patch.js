import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');

code = code.replace(
`      const canvas1 = await html2canvas(certRef.current, { 
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY
      });`,
`      const canvas1 = await html2canvas(certRef.current, { 
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false
      });`
);

code = code.replace(
`        const canvas2 = await html2canvas(certPage2Ref.current, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          scrollX: 0,
          scrollY: -window.scrollY
        });`,
`        const canvas2 = await html2canvas(certPage2Ref.current, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false
        });`
);

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
