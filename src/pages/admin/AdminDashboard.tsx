import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { fetchSheetData, appendSheetData, updateSheetData } from '../../lib/api';
import { Plus, Loader2, Edit } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'Events' | 'Users' | 'Registrations' | 'Tests' | 'Questions' | 'HealthAssessments'>('Events');
  const [data, setData] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom labels for Health Assessments
  const [passLabel, setPassLabel] = useState('Laik');
  const [failLabel, setFailLabel] = useState('Tidak Laik');

  // Health Assessment form state
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [selectedRegId, setSelectedRegId] = useState('');
  const [healthForm, setHealthForm] = useState({
    Status: '',
    BB: '',
    TB: '',
    TekananDarah: '',
    GDA: '',
    SkriningTB: '',
    HBsAg: ''
  });

  // Existing data states for dropdowns
  const [eventsList, setEventsList] = useState<any[]>([]);

  // Form states for Event creation
  const [showEventForm, setShowEventForm] = useState(false);

  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const handleTemplateUpload = async (e: ChangeEvent<HTMLInputElement>) => {
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

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    Judul: '',
    Tema: '',
    TanggalMulai: '',
    TanggalSelesai: '',
    TanggalPelaksanaan: '',
    BatasPendaftaran: '',
    TemplateURL: '',
    TTD1_Nama: '',
    TTD2_Nama: '',
    TTD_LayoutConfig: 'Kiri',
    TTD1_NIP: '',
    TTD2_NIP: ''
  });

  // Form states for User creation
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    Role: 'User',
    Nama: '',
    Email: '',
    Password: '',
  });

  // Form states for Question creation
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    EventID: '',
    Type: 'PRETEST',
    QuestionText: '',
    OptionA: '',
    OptionB: '',
    OptionC: '',
    OptionD: '',
    CorrectOption: 'A'
  });

  const loadData = async (sheetName: string) => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchSheetData(sheetName);
      setData(rows);
      
      if (sheetName === 'Registrations') {
        const hData = await fetchSheetData('HealthAssessments');
        setHealthData(hData);
      }

      // If we are on Questions tab, we also need to load Events for the dropdown
      if (sheetName === 'Questions') {
        const events = await fetchSheetData('Events');
        setEventsList(events);
        if (events.length > 0 && !newQuestion.EventID) {
          setNewQuestion(prev => ({...prev, EventID: events[0].EventID}));
        }
      }
    } catch (err: any) {
      setError(err.message || `Gagal memuat data ${sheetName}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const handleAddEvent = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEditing = !!editingEventId;
      const eventId = isEditing ? editingEventId : `EVT-${Date.now()}`;
      const row = [
        eventId,
        newEvent.Judul,
        newEvent.Tema,
        newEvent.TanggalMulai,
        newEvent.TanggalSelesai,
        newEvent.TanggalPelaksanaan,
        newEvent.TemplateURL,
        newEvent.TTD1_Nama,
        newEvent.TTD2_Nama,
        newEvent.TTD_LayoutConfig,
        newEvent.TTD1_NIP || '',
        newEvent.TTD2_NIP || '',
        `=IF(ISBLANK(INDIRECT("G"&ROW())), "", IMAGE(INDIRECT("G"&ROW())))`, // Column M (TemplateImage)
        newEvent.BatasPendaftaran || ''
      ];
      
      if (isEditing) {
        await updateSheetData('Events', eventId, [row]);
      } else {
        await appendSheetData('Events', [row]);
      }
      
      setShowEventForm(false);
      setEditingEventId(null);
      loadData('Events');
      setNewEvent({ Judul: '', Tema: '', TanggalMulai: '', TanggalSelesai: '', TanggalPelaksanaan: '', TemplateURL: '', TTD1_Nama: '', TTD2_Nama: '', TTD_LayoutConfig: 'Kiri', TTD1_NIP: '', TTD2_NIP: '' });
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan kegiatan');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEventClick = (ev: any) => {
    setEditingEventId(ev.EventID);
    setNewEvent({
      Judul: ev.Judul || '',
      Tema: ev.Tema || '',
      TanggalMulai: ev.TanggalMulai || '',
      TanggalSelesai: ev.TanggalSelesai || '',
      TanggalPelaksanaan: ev.TanggalPelaksanaan || '',
      BatasPendaftaran: ev.BatasPendaftaran || '',
      TemplateURL: ev.TemplateURL || '',
      TTD1_Nama: ev.TTD1_Nama || '',
      TTD2_Nama: ev.TTD2_Nama || '',
      TTD_LayoutConfig: ev.TTD_LayoutConfig || 'Kiri',
      TTD1_NIP: ev.TTD1_NIP || '',
      TTD2_NIP: ev.TTD2_NIP || ''
    });
    setShowEventForm(true);
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userId = `USR-${Date.now()}`;
      const row = [
        userId,
        newUser.Role,
        newUser.Nama,
        newUser.Email,
        newUser.Password
      ];
      await appendSheetData('Users', [row]);
      setShowUserForm(false);
      loadData('Users');
      setNewUser({ Role: 'User', Nama: '', Email: '', Password: '' });
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan user');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const questionId = `Q-${Date.now()}`;
      const row = [
        questionId,
        newQuestion.EventID,
        newQuestion.Type,
        newQuestion.QuestionText,
        newQuestion.OptionA,
        newQuestion.OptionB,
        newQuestion.OptionC,
        newQuestion.OptionD,
        newQuestion.CorrectOption
      ];
      await appendSheetData('Questions', [row]);
      setShowQuestionForm(false);
      loadData('Questions');
      setNewQuestion({ ...newQuestion, QuestionText: '', OptionA: '', OptionB: '', OptionC: '', OptionD: '' });
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan soal');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHealth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const row = [
        `HA-${Date.now()}`,
        selectedRegId,
        healthForm.Status,
        new Date().toISOString(),
        healthForm.BB,
        healthForm.TB,
        healthForm.TekananDarah,
        healthForm.GDA,
        healthForm.SkriningTB,
        healthForm.HBsAg
      ];
      await appendSheetData('HealthAssessments', [row]);
      setShowHealthForm(false);
      loadData('Registrations');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan penilaian');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        {activeTab === 'Events' && (
          <button 
            onClick={() => setShowEventForm(!showEventForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Tambah Kegiatan
          </button>
        )}
        {activeTab === 'Users' && (
          <button 
            onClick={() => setShowUserForm(!showUserForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Tambah User
          </button>
        )}
        {activeTab === 'Questions' && (
          <button 
            onClick={() => setShowQuestionForm(!showQuestionForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Tambah Soal
          </button>
        )}
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['Events', 'Users', 'Registrations', 'Attendance', 'Tests', 'Certificates', 'Questions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 text-sm">
          {error}
        </div>
      )}

      {activeTab === 'Registrations' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-6 items-center">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-sm">Konfigurasi Label Penilaian</h3>
            <p className="text-xs text-gray-500">Ubah teks tombol penilaian kesehatan di bawah ini.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Teks Lulus (Positif)</label>
            <input 
              type="text" 
              value={passLabel} 
              onChange={e => setPassLabel(e.target.value)} 
              className="border px-3 py-1.5 rounded-md text-sm w-32 focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Teks Gagal (Negatif)</label>
            <input 
              type="text" 
              value={failLabel} 
              onChange={e => setFailLabel(e.target.value)} 
              className="border px-3 py-1.5 rounded-md text-sm w-32 focus:ring-red-500 focus:border-red-500" 
            />
          </div>
        </div>
      )}

      {showEventForm && activeTab === 'Events' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{editingEventId ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h2>
          <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul Kegiatan</label>
              <input type="text" required value={newEvent.Judul} onChange={(e) => setNewEvent({...newEvent, Judul: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tema Kegiatan</label>
              <input type="text" required value={newEvent.Tema} onChange={(e) => setNewEvent({...newEvent, Tema: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input type="date" required value={newEvent.TanggalMulai} onChange={(e) => setNewEvent({...newEvent, TanggalMulai: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
              <input type="date" required value={newEvent.TanggalSelesai} onChange={(e) => setNewEvent({...newEvent, TanggalSelesai: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pelaksanaan / Pemeriksaan</label>
              <input type="date" required value={newEvent.TanggalPelaksanaan} onChange={(e) => setNewEvent({...newEvent, TanggalPelaksanaan: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Sertifikat URL (Gambar)</label>
              
              <div className="flex flex-col gap-2">
                <input type="text" placeholder="Masukkan URL gambar (misal: dari ImgBB / GDrive)" value={newEvent.TemplateURL} onChange={(e) => setNewEvent({...newEvent, TemplateURL: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Atau upload (Sementara):</span>
                  <input type="file" accept="image/*" onChange={handleTemplateUpload} disabled={uploadingTemplate} className="w-full px-3 py-1 border rounded-md text-sm" />
                </div>
                {uploadingTemplate && <p className="text-xs text-blue-600">Mengupload...</p>}
                {newEvent.TemplateURL && (
                  <div className="relative mt-2">
                    <img src={newEvent.TemplateURL} alt="Template Preview" className="h-20 object-contain rounded border" crossOrigin="anonymous" />
                    <button type="button" onClick={() => setNewEvent({...newEvent, TemplateURL: ''})} className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                  </div>
                )}
              </div>

            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Penandatangan 1 (Nama & Jabatan)</label>
              <input type="text" required value={newEvent.TTD1_Nama} onChange={(e) => setNewEvent({...newEvent, TTD1_Nama: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIP/SIP Dokter Pemeriksa (Opsional)</label>
              <input type="text" placeholder="NIP/SIP..." value={newEvent.TTD1_NIP} onChange={(e) => setNewEvent({...newEvent, TTD1_NIP: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Penandatangan 2 (Opsional)</label>
              <input type="text" value={newEvent.TTD2_Nama} onChange={(e) => setNewEvent({...newEvent, TTD2_Nama: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Puskesmas (Opsional)</label>
              <input type="text" placeholder="NIP..." value={newEvent.TTD2_NIP} onChange={(e) => setNewEvent({...newEvent, TTD2_NIP: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Layout Tanda Tangan</label>
              <select value={newEvent.TTD_LayoutConfig} onChange={(e) => setNewEvent({...newEvent, TTD_LayoutConfig: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                <option value="Kiri">Kiri</option>
                <option value="Tengah">Tengah</option>
                <option value="Kanan">Kanan</option>
                <option value="Kiri-Kanan">Kiri (TTD1) dan Kanan (TTD2)</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => {
                setShowEventForm(false);
                setEditingEventId(null);
                setNewEvent({ Judul: '', Tema: '', TanggalMulai: '', TanggalSelesai: '', TanggalPelaksanaan: '', TemplateURL: '', TTD1_Nama: '', TTD2_Nama: '', TTD_LayoutConfig: 'Kiri', TTD1_NIP: '', TTD2_NIP: '' });
              }} className="px-4 py-2 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg">Batal</button>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50">
                {editingEventId ? 'Simpan Perubahan' : 'Simpan Kegiatan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showUserForm && activeTab === 'Users' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tambah User Baru</h2>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input type="text" required value={newUser.Nama} onChange={(e) => setNewUser({...newUser, Nama: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={newUser.Email} onChange={(e) => setNewUser({...newUser, Email: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="text" required value={newUser.Password} onChange={(e) => setNewUser({...newUser, Password: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role (Peran)</label>
              <select value={newUser.Role} onChange={(e) => setNewUser({...newUser, Role: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                <option value="User">Peserta (User)</option>
                <option value="Admin">Administrator</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 text-gray-600 font-medium">Batal</button>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50">Simpan User</button>
            </div>
          </form>
        </div>
      )}

      {showQuestionForm && activeTab === 'Questions' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tambah Soal Baru</h2>
          <form onSubmit={handleAddQuestion} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kegiatan (Event)</label>
              <select required value={newQuestion.EventID} onChange={(e) => setNewQuestion({...newQuestion, EventID: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                {eventsList.map(ev => (
                  <option key={ev.EventID} value={ev.EventID}>{ev.Judul}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Ujian</label>
              <select value={newQuestion.Type} onChange={(e) => setNewQuestion({...newQuestion, Type: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                <option value="PRETEST">Pre-Test</option>
                <option value="POSTTEST">Post-Test</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan</label>
              <textarea required value={newQuestion.QuestionText} onChange={(e) => setNewQuestion({...newQuestion, QuestionText: e.target.value})} className="w-full px-3 py-2 border rounded-md" rows={2}></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opsi A</label>
              <input type="text" required value={newQuestion.OptionA} onChange={(e) => setNewQuestion({...newQuestion, OptionA: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opsi B</label>
              <input type="text" required value={newQuestion.OptionB} onChange={(e) => setNewQuestion({...newQuestion, OptionB: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opsi C</label>
              <input type="text" required value={newQuestion.OptionC} onChange={(e) => setNewQuestion({...newQuestion, OptionC: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opsi D</label>
              <input type="text" required value={newQuestion.OptionD} onChange={(e) => setNewQuestion({...newQuestion, OptionD: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Jawaban Benar</label>
              <select value={newQuestion.CorrectOption} onChange={(e) => setNewQuestion({...newQuestion, CorrectOption: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                <option value="A">Opsi A</option>
                <option value="B">Opsi B</option>
                <option value="C">Opsi C</option>
                <option value="D">Opsi D</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowQuestionForm(false)} className="px-4 py-2 text-gray-600 font-medium">Batal</button>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50">Simpan Soal</button>
            </div>
          </form>
        </div>
      )}

      {showHealthForm && activeTab === 'Registrations' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Penilaian Kesehatan</h2>
              <button onClick={() => setShowHealthForm(false)} className="text-gray-500 hover:text-gray-700">Tutup</button>
            </div>
            
            <form onSubmit={handleSaveHealth} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status Penilaian</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="healthStatus" 
                      value={passLabel}
                      checked={healthForm.Status === passLabel}
                      onChange={(e) => setHealthForm({...healthForm, Status: e.target.value})}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-green-700">{passLabel}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="healthStatus" 
                      value={failLabel}
                      checked={healthForm.Status === failLabel}
                      onChange={(e) => setHealthForm({...healthForm, Status: e.target.value})}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-red-700">{failLabel}</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Pemeriksaan Dasar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Berat Badan (BB)</label>
                    <input type="text" value={healthForm.BB} onChange={(e) => setHealthForm({...healthForm, BB: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Contoh: 65 kg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tinggi Badan (TB)</label>
                    <input type="text" value={healthForm.TB} onChange={(e) => setHealthForm({...healthForm, TB: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Contoh: 170 cm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tekanan Darah</label>
                    <input type="text" value={healthForm.TekananDarah} onChange={(e) => setHealthForm({...healthForm, TekananDarah: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Contoh: 120/80 mmHg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gula Darah Acak (GDA)</label>
                    <input type="text" value={healthForm.GDA} onChange={(e) => setHealthForm({...healthForm, GDA: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Contoh: 110 mg/dL" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skrining TB</label>
                    <input type="text" value={healthForm.SkriningTB} onChange={(e) => setHealthForm({...healthForm, SkriningTB: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Hasil skrining" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 mt-6">Pemeriksaan Penyakit Menular</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HBsAg</label>
                    <input type="text" value={healthForm.HBsAg} onChange={(e) => setHealthForm({...healthForm, HBsAg: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Positif / Negatif" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => setShowHealthForm(false)} className="px-4 py-2 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg">Batal</button>
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center">
                  {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                  Simpan Penilaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && data.length === 0 ? (
          <div className="flex justify-center items-center p-12 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={24} /> Memuat data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {data[0] ? Object.keys(data[0]).map((key) => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {key}
                    </th>
                  )) : (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  )}
                  {activeTab === 'Registrations' && data.length > 0 && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Penilaian Kesehatan
                    </th>
                  )}
                  {activeTab === 'Events' && data.length > 0 && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length > 0 ? data.map((row, i) => {
                  const regId = row.RegID;
                  const currentHealth = healthData.filter(h => h.RegID === regId).pop(); // Get latest
                  const healthStatus = currentHealth ? currentHealth.Status : 'Belum Dinilai';

                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {val}
                        </td>
                      ))}
                      {activeTab === 'Registrations' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              healthStatus === 'Belum Dinilai' ? 'bg-gray-100 text-gray-800' :
                              (healthStatus === passLabel || healthStatus === 'Laik' || healthStatus === 'Lulus') ? 'bg-green-100 text-green-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {healthStatus}
                            </span>
                            <div className="flex gap-1 ml-2">
                              <button 
                                onClick={() => {
                                  setSelectedRegId(regId);
                                  setHealthForm({
                                    Status: currentHealth?.Status || passLabel,
                                    BB: currentHealth?.BB || '',
                                    TB: currentHealth?.TB || '',
                                    TekananDarah: currentHealth?.TekananDarah || '',
                                    GDA: currentHealth?.GDA || '',
                                    SkriningTB: currentHealth?.SkriningTB || '',
                                    HBsAg: currentHealth?.HBsAg || ''
                                  });
                                  setShowHealthForm(true);
                                }}
                                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                              >
                                Nilai / Edit
                              </button>
                            </div>
                          </div>
                        </td>
                      )}
                      {activeTab === 'Events' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <button 
                            onClick={() => handleEditEventClick(row)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md flex items-center gap-1 ml-auto transition-colors"
                          >
                            <Edit size={16} />
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={100} className="px-6 py-12 text-center text-gray-500 text-sm">
                      Belum ada data pada sheet {activeTab}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
