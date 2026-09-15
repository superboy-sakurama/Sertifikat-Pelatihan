import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');
code = code.replace(
`      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas1.width, canvas1.height]
      });
      pdf.addImage(imgData1, 'JPEG', 0, 0, canvas1.width, canvas1.height);`,
`      const pdfWidth = certRef.current.offsetWidth;
      const pdfHeight = certRef.current.offsetHeight;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });
      pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);`
);

code = code.replace(
`      if (certPage2Ref.current) {
        const canvas2 = await html2canvas(certPage2Ref.current, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 1.0);
        pdf.addPage([canvas2.width, canvas2.height], 'landscape');
        pdf.addImage(imgData2, 'JPEG', 0, 0, canvas2.width, canvas2.height);
      }`,
`      if (certPage2Ref.current) {
        const canvas2 = await html2canvas(certPage2Ref.current, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 1.0);
        const pdfWidth2 = certPage2Ref.current.offsetWidth;
        const pdfHeight2 = certPage2Ref.current.offsetHeight;
        pdf.addPage([pdfWidth2, pdfHeight2], 'landscape');
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth2, pdfHeight2);
      }`
);

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
