const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');

// Update initial state
code = code.replace("TTD_LayoutConfig: 'Kiri',", "TTD_LayoutConfig: 'Kiri',\n    TTD1_NIP: '',\n    TTD2_NIP: ''");

// Update handleEditEventClick
code = code.replace("TTD_LayoutConfig: ev.TTD_LayoutConfig || 'Kiri'", "TTD_LayoutConfig: ev.TTD_LayoutConfig || 'Kiri',\n      TTD1_NIP: ev.TTD1_NIP || '',\n      TTD2_NIP: ev.TTD2_NIP || ''");

// Update reset states
code = code.replace(/setNewEvent\({ Judul: '', Tema: '', TanggalMulai: '', TanggalSelesai: '', TanggalPelaksanaan: '', TemplateURL: '', TTD1_Nama: '', TTD2_Nama: '', TTD_LayoutConfig: 'Kiri' }\)/g, "setNewEvent({ Judul: '', Tema: '', TanggalMulai: '', TanggalSelesai: '', TanggalPelaksanaan: '', TemplateURL: '', TTD1_Nama: '', TTD2_Nama: '', TTD_LayoutConfig: 'Kiri', TTD1_NIP: '', TTD2_NIP: '' })");
code = code.replace(/setNewEvent\({ Judul: '', TanggalMulai: '', TanggalSelesai: '', TanggalPelaksanaan: '', TemplateURL: '', TTD1_Nama: '', TTD2_Nama: '', TTD_LayoutConfig: 'Kiri' }\)/g, "setNewEvent({ Judul: '', Tema: '', TanggalMulai: '', TanggalSelesai: '', TanggalPelaksanaan: '', TemplateURL: '', TTD1_Nama: '', TTD2_Nama: '', TTD_LayoutConfig: 'Kiri', TTD1_NIP: '', TTD2_NIP: '' })");

// Add a file upload handler function
const fileUploadLogic = `
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload gagal');
      
      const data = await res.json();
      setNewEvent({ ...newEvent, TemplateURL: data.url });
    } catch (err: any) {
      setError('Gagal mengupload template: ' + err.message);
    } finally {
      setUploadingTemplate(false);
    }
  };
`;
// insert fileUploadLogic after "const [showEventForm, setShowEventForm] = useState(false);" (or similar place)
code = code.replace("const [showEventForm, setShowEventForm] = useState(false);", "const [showEventForm, setShowEventForm] = useState(false);\n" + fileUploadLogic);


// Replace the template URL input field with a file upload
const oldTemplateInput = `<input type="url" placeholder="https://example.com/template.png" required value={newEvent.TemplateURL} onChange={(e) => setNewEvent({...newEvent, TemplateURL: e.target.value})} className="w-full px-3 py-2 border rounded-md" />`;
const newTemplateInput = `
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" onChange={handleTemplateUpload} disabled={uploadingTemplate} className="w-full px-3 py-2 border rounded-md" />
                {uploadingTemplate && <p className="text-xs text-blue-600">Mengupload...</p>}
                {newEvent.TemplateURL && (
                  <div className="relative mt-2">
                    <img src={newEvent.TemplateURL} alt="Template Preview" className="h-20 object-contain rounded border" />
                    <button type="button" onClick={() => setNewEvent({...newEvent, TemplateURL: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                  </div>
                )}
              </div>
`;
code = code.replace(oldTemplateInput, newTemplateInput);

// Add TTD1_NIP and TTD2_NIP inputs below TTD1_Nama and TTD2_Nama
const oldTTD1 = `<input type="text" required value={newEvent.TTD1_Nama} onChange={(e) => setNewEvent({...newEvent, TTD1_Nama: e.target.value})} className="w-full px-3 py-2 border rounded-md" />`;
const newTTD1 = oldTTD1 + `
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIP/SIP Dokter Pemeriksa (Opsional)</label>
              <input type="text" placeholder="NIP/SIP..." value={newEvent.TTD1_NIP} onChange={(e) => setNewEvent({...newEvent, TTD1_NIP: e.target.value})} className="w-full px-3 py-2 border rounded-md" />`;
code = code.replace(oldTTD1, newTTD1);

const oldTTD2 = `<input type="text" value={newEvent.TTD2_Nama} onChange={(e) => setNewEvent({...newEvent, TTD2_Nama: e.target.value})} className="w-full px-3 py-2 border rounded-md" />`;
const newTTD2 = oldTTD2 + `
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Puskesmas (Opsional)</label>
              <input type="text" placeholder="NIP..." value={newEvent.TTD2_NIP} onChange={(e) => setNewEvent({...newEvent, TTD2_NIP: e.target.value})} className="w-full px-3 py-2 border rounded-md" />`;
code = code.replace(oldTTD2, newTTD2);

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', code);
