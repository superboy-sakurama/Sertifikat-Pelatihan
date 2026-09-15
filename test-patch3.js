import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');

code = code.replace(
`      const canvas1 = await html2canvas(certRef.current, { 
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: 800,
        height: 565
      });`,
`      const canvas1 = await html2canvas(certRef.current, { 
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY
      });`
);

code = code.replace(
`        const canvas2 = await html2canvas(certPage2Ref.current, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
          width: 800,
          height: 565
        });`,
`        const canvas2 = await html2canvas(certPage2Ref.current, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          scrollX: 0,
          scrollY: -window.scrollY
        });`
);

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
