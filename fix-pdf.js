import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');

code = code.replace(
`      const pdfWidth = certRef.current.offsetWidth;
      const pdfHeight = certRef.current.offsetHeight;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });
      pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);`,
`      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = 297;
      const pdfHeight = 210;
      pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);`
);

code = code.replace(
`        const pdfWidth2 = certPage2Ref.current.offsetWidth;
        const pdfHeight2 = certPage2Ref.current.offsetHeight;
        pdf.addPage([pdfWidth2, pdfHeight2], 'landscape');
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth2, pdfHeight2);`,
`        pdf.addPage('a4', 'l');
        pdf.addImage(imgData2, 'JPEG', 0, 0, 297, 210);`
);

// Scale up to 1122x794 if requested? The user explicitly said:
// "Buat kontainer/wrapper HTML sertifikat memiliki ukuran tetap yang proporsional dengan kertas A4 Landscape (misalnya 1122px x 794px). Gunakan Tailwind CSS yang sesuai."

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
