import fs from 'fs';
let code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

code = code.replace(
`    TanggalPelaksanaan: '',`,
`    TanggalPelaksanaan: '',
    BatasPendaftaran: '',`
);

code = code.replace(
`        newEvent.TTD1_NIP || '',
        newEvent.TTD2_NIP || '',
        \`=IF(ISBLANK(INDIRECT("G"&ROW())), "", IMAGE(INDIRECT("G"&ROW())))\` // Column M (TemplateImage)
      ];`,
`        newEvent.TTD1_NIP || '',
        newEvent.TTD2_NIP || '',
        \`=IF(ISBLANK(INDIRECT("G"&ROW())), "", IMAGE(INDIRECT("G"&ROW())))\`, // Column M (TemplateImage)
        newEvent.BatasPendaftaran || ''
      ];`
);

code = code.replace(
`      TanggalPelaksanaan: ev.TanggalPelaksanaan || '',`,
`      TanggalPelaksanaan: ev.TanggalPelaksanaan || '',
      BatasPendaftaran: ev.BatasPendaftaran || '',`
);

// Add the field in the form
const formField = `                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai (Acara)</label>
                    <input type="date" required value={newEvent.TanggalSelesai} onChange={e => setNewEvent({...newEvent, TanggalSelesai: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>`;

const newFormField = `                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai (Acara)</label>
                    <input type="date" required value={newEvent.TanggalSelesai} onChange={e => setNewEvent({...newEvent, TanggalSelesai: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batas Akhir Pendaftaran</label>
                    <input type="date" required value={newEvent.BatasPendaftaran} onChange={e => setNewEvent({...newEvent, BatasPendaftaran: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>`;

code = code.replace(formField, newFormField);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', code);
