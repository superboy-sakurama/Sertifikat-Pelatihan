import fs from 'fs';

for (const file of ['server.ts', 'api/index.ts']) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(
      `'Events': ['EventID', 'Judul', 'Tema', 'TanggalMulai', 'TanggalSelesai', 'TanggalPelaksanaan', 'TemplateURL', 'TTD1_Nama', 'TTD2_Nama', 'TTD_LayoutConfig', 'TTD1_NIP', 'TTD2_NIP', 'TemplateImage'],`,
      `'Events': ['EventID', 'Judul', 'Tema', 'TanggalMulai', 'TanggalSelesai', 'TanggalPelaksanaan', 'TemplateURL', 'TTD1_Nama', 'TTD2_Nama', 'TTD_LayoutConfig', 'TTD1_NIP', 'TTD2_NIP', 'TemplateImage', 'BatasPendaftaran'],`
    );
    code = code.replace(
      `['EventID', 'Judul', 'Tema', 'TanggalMulai', 'TanggalSelesai', 'TanggalPelaksanaan', 'TemplateURL', 'TTD1_Nama', 'TTD2_Nama', 'TTD_LayoutConfig', 'TTD1_NIP', 'TTD2_NIP', 'TemplateImage'],`,
      `['EventID', 'Judul', 'Tema', 'TanggalMulai', 'TanggalSelesai', 'TanggalPelaksanaan', 'TemplateURL', 'TTD1_Nama', 'TTD2_Nama', 'TTD_LayoutConfig', 'TTD1_NIP', 'TTD2_NIP', 'TemplateImage', 'BatasPendaftaran'],`
    );
    code = code.replace(
      `['EVT-1', 'Pelatihan Dasar Web Development', '', '2023-11-01', '2023-11-02', '2023-11-03', 'https://i.ibb.co/hW0t3y1/template-sertifikat-kosong.jpg', 'Budi Santoso, M.Kom', '', 'Kiri', '', '', '=IMAGE(INDIRECT("G"&ROW()))']`,
      `['EVT-1', 'Pelatihan Dasar Web Development', '', '2023-11-01', '2023-11-02', '2023-11-03', 'https://i.ibb.co/hW0t3y1/template-sertifikat-kosong.jpg', 'Budi Santoso, M.Kom', '', 'Kiri', '', '', '=IMAGE(INDIRECT("G"&ROW()))', '2023-11-01']`
    );
    fs.writeFileSync(file, code);
  }
}
