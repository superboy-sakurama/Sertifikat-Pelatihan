import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { fetchSheetData, appendSheetData, updateSheetData } from '../../lib/api';
import { Plus, Loader2, Edit, Check, Eye, Trash2, Layers, FileText } from 'lucide-react';
import { CertificateConfig, DEFAULT_CERT_CONFIG, parseCertConfig, serializeCertConfig, AssessmentCriterion } from '../../lib/certConfig';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'Events' | 'Users' | 'Registrations' | 'Tests' | 'Questions' | 'HealthAssessments'>('Events');
  const [data, setData] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewTab, setPreviewTab] = useState<'page1' | 'page2'>('page1');
  
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
  const [certConfig, setCertConfig] = useState<CertificateConfig>(DEFAULT_CERT_CONFIG);
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
    TTD_LayoutConfig: 'Kiri-Kanan',
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
      const serializedConfig = serializeCertConfig(certConfig);
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
        serializedConfig,
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
      setCertConfig(DEFAULT_CERT_CONFIG);
      setNewEvent({ Judul: '', Tema: '', TanggalMulai: '', TanggalSelesai: '', TanggalPelaksanaan: '', BatasPendaftaran: '', TemplateURL: '', TTD1_Nama: '', TTD2_Nama: '', TTD_LayoutConfig: 'Kiri-Kanan', TTD1_NIP: '', TTD2_NIP: '' });
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan kegiatan');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEventClick = (ev: any) => {
    setEditingEventId(ev.EventID);
    const parsed = parseCertConfig(ev.TTD_LayoutConfig, ev.Judul);
    setCertConfig(parsed);
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
      TTD_LayoutConfig: ev.TTD_LayoutConfig || 'Kiri-Kanan',
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
          <div className="flex justify-between items-center mb-4 pb-3 border-b">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{editingEventId ? 'Edit Kegiatan & Pengaturan Sertifikat' : 'Tambah Kegiatan & Pengaturan Sertifikat'}</h2>
              <p className="text-xs text-gray-500">Atur informasi kegiatan dan kustomisasi tata letak sertifikat (A4 Standar).</p>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setShowEventForm(false);
                setEditingEventId(null);
              }}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕ Tutup
            </button>
          </div>

          <form onSubmit={handleAddEvent} className="space-y-6">
            {/* Section 1: Informasi Dasar Kegiatan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-lg border border-gray-200">
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">1. Informasi Pokok Kegiatan</h3>
              </div>

              {/* Judul Kegiatan & Toggle */}
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Judul Kegiatan</label>
                <input 
                  type="text" 
                  required 
                  value={newEvent.Judul} 
                  onChange={(e) => setNewEvent({...newEvent, Judul: e.target.value})} 
                  placeholder="Contoh: Pemeriksaan Kesehatan Berkala Puskesmas Kalitengah"
                  className="w-full px-3 py-2 border rounded-md" 
                />
                
                {/* Toggle & Position Controls for Judul */}
                <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={certConfig.showJudul} 
                      onChange={(e) => setCertConfig({...certConfig, showJudul: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded" 
                    />
                    <span className="text-sm font-medium text-gray-800">Tampilkan Judul di Sertifikat</span>
                  </label>
                  
                  {certConfig.showJudul && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1 text-xs">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Posisi Horizontal Judul</label>
                        <select 
                          value={certConfig.judulAlign} 
                          onChange={(e) => setCertConfig({...certConfig, judulAlign: e.target.value as any})}
                          className="w-full px-2 py-1.5 border rounded text-xs"
                        >
                          <option value="center">Center Horizontal (Tengah)</option>
                          <option value="left">Rata Kiri</option>
                          <option value="right">Rata Kanan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Posisi Vertikal / Margin Atas: {certConfig.judulTop}px</label>
                        <input 
                          type="range" 
                          min="80" 
                          max="350" 
                          value={certConfig.judulTop} 
                          onChange={(e) => setCertConfig({...certConfig, judulTop: Number(e.target.value)})}
                          className="w-full" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tema Kegiatan & Toggle */}
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Tema Kegiatan</label>
                <input 
                  type="text" 
                  value={newEvent.Tema} 
                  onChange={(e) => setNewEvent({...newEvent, Tema: e.target.value})} 
                  placeholder="Contoh: Menuju Masyarakat Sehat dan Produktif"
                  className="w-full px-3 py-2 border rounded-md" 
                />

                {/* Toggle & Position Controls for Tema */}
                <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={certConfig.showTema} 
                      onChange={(e) => setCertConfig({...certConfig, showTema: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded" 
                    />
                    <span className="text-sm font-medium text-gray-800">Tampilkan Tema di Sertifikat</span>
                  </label>
                  
                  {certConfig.showTema && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1 text-xs">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Posisi Horizontal Tema</label>
                        <select 
                          value={certConfig.temaAlign} 
                          onChange={(e) => setCertConfig({...certConfig, temaAlign: e.target.value as any})}
                          className="w-full px-2 py-1.5 border rounded text-xs"
                        >
                          <option value="center">Center Horizontal (Tengah)</option>
                          <option value="left">Rata Kiri</option>
                          <option value="right">Rata Kanan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Posisi Vertikal / Margin Atas: {certConfig.temaTop}px</label>
                        <input 
                          type="range" 
                          min="150" 
                          max="400" 
                          value={certConfig.temaTop} 
                          onChange={(e) => setCertConfig({...certConfig, temaTop: Number(e.target.value)})}
                          className="w-full" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                <input type="date" required value={newEvent.TanggalMulai} onChange={(e) => setNewEvent({...newEvent, TanggalMulai: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                <input type="date" required value={newEvent.TanggalSelesai} onChange={(e) => setNewEvent({...newEvent, TanggalSelesai: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>

              {/* Tanggal Pelaksanaan & Toggle */}
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Tanggal Pelaksanaan / Pemeriksaan</label>
                <input type="date" required value={newEvent.TanggalPelaksanaan} onChange={(e) => setNewEvent({...newEvent, TanggalPelaksanaan: e.target.value})} className="w-full px-3 py-2 border rounded-md" />

                {/* Toggle & Position Controls for Tanggal */}
                <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={certConfig.showTanggal} 
                      onChange={(e) => setCertConfig({...certConfig, showTanggal: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded" 
                    />
                    <span className="text-sm font-medium text-gray-800">Tampilkan Tanggal Pelaksanaan di Sertifikat</span>
                  </label>
                  
                  {certConfig.showTanggal && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1 text-xs">
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Posisi Horizontal Tanggal</label>
                        <select 
                          value={certConfig.tanggalAlign} 
                          onChange={(e) => setCertConfig({...certConfig, tanggalAlign: e.target.value as any})}
                          className="w-full px-2 py-1.5 border rounded text-xs"
                        >
                          <option value="right">Kanan (Di atas Penandatangan Kanan)</option>
                          <option value="center">Center Horizontal (Tengah)</option>
                          <option value="left">Kiri</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-gray-600 mb-1">Posisi Vertikal / Margin Atas: {certConfig.tanggalTop}px</label>
                        <input 
                          type="range" 
                          min="450" 
                          max="680" 
                          value={certConfig.tanggalTop} 
                          onChange={(e) => setCertConfig({...certConfig, tanggalTop: Number(e.target.value)})}
                          className="w-full" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Batas Pendaftaran */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Batas Waktu Pendaftaran (Expired Date)</label>
                <input 
                  type="date" 
                  value={newEvent.BatasPendaftaran} 
                  onChange={(e) => setNewEvent({...newEvent, BatasPendaftaran: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Peserta tidak akan bisa melakukan pendaftaran baru jika tanggal saat ini telah melewati batas ini. Kosongkan jika tanpa batas waktu.
                </p>
              </div>
            </div>

            {/* Section 2: Penandatanganan & Tata Letak Kolom */}
            <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">2. Penandatanganan (Tanda Tangan)</h3>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border border-gray-200">
                  <input 
                    type="checkbox" 
                    checked={certConfig.showTTD} 
                    onChange={(e) => setCertConfig({...certConfig, showTTD: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded" 
                  />
                  <span className="text-xs font-semibold text-gray-800">Tampilkan Tanda Tangan di Sertifikat</span>
                </label>
              </div>

              {certConfig.showTTD && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded border border-gray-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Tata Letak Kolom Tanda Tangan</label>
                      <select 
                        value={certConfig.layout} 
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setCertConfig({...certConfig, layout: val});
                          setNewEvent({...newEvent, TTD_LayoutConfig: val});
                        }} 
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="Kiri-Kanan">2 Kolom: Kiri (TTD1) dan Kanan (TTD2)</option>
                        <option value="Tengah">1 Kolom: Center Horizontal (Tengah)</option>
                        <option value="Kanan">1 Kolom: Rata Kanan</option>
                        <option value="Kiri">1 Kolom: Rata Kiri</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Margin Bawah TTD: {certConfig.ttdBottom}px</label>
                      <input 
                        type="range" 
                        min="20" 
                        max="140" 
                        value={certConfig.ttdBottom} 
                        onChange={(e) => setCertConfig({...certConfig, ttdBottom: Number(e.target.value)})}
                        className="w-full mt-2" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Penandatangan 1 (Nama & Gelar)</label>
                    <input 
                      type="text" 
                      value={newEvent.TTD1_Nama} 
                      onChange={(e) => setNewEvent({...newEvent, TTD1_Nama: e.target.value})} 
                      placeholder="Contoh: dr. Budi Santoso"
                      className="w-full px-3 py-2 border rounded-md" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIP / SIP Penandatangan 1</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: NIP. 19850315 201101 1 002" 
                      value={newEvent.TTD1_NIP} 
                      onChange={(e) => setNewEvent({...newEvent, TTD1_NIP: e.target.value})} 
                      className="w-full px-3 py-2 border rounded-md" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Penandatangan 2 (Nama & Gelar - Opsional)</label>
                    <input 
                      type="text" 
                      value={newEvent.TTD2_Nama} 
                      onChange={(e) => setNewEvent({...newEvent, TTD2_Nama: e.target.value})} 
                      placeholder="Contoh: Hj. Siti Aminah, S.Kep., Ns."
                      className="w-full px-3 py-2 border rounded-md" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIP Penandatangan 2 (Opsional)</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: NIP. 19780512 200212 2 001" 
                      value={newEvent.TTD2_NIP} 
                      onChange={(e) => setNewEvent({...newEvent, TTD2_NIP: e.target.value})} 
                      className="w-full px-3 py-2 border rounded-md" 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Desain Template Sertifikat & Format A4 */}
            <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">3. Template Sertifikat & Format Standar A4</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Sertifikat Gambar (Background)</label>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      placeholder="Masukkan URL gambar template sertifikat (contoh dari Google Drive / Cloud)" 
                      value={newEvent.TemplateURL} 
                      onChange={(e) => setNewEvent({...newEvent, TemplateURL: e.target.value})} 
                      className="w-full px-3 py-2 border rounded-md text-sm" 
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">Atau upload file:</span>
                      <input type="file" accept="image/*" onChange={handleTemplateUpload} disabled={uploadingTemplate} className="w-full px-3 py-1 border rounded-md text-sm" />
                    </div>
                    {uploadingTemplate && <p className="text-xs text-blue-600 font-medium">Sedang mengupload...</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Penyesuaian Skala Template ke Kertas A4</label>
                  <select 
                    value={certConfig.bgFit} 
                    onChange={(e) => setCertConfig({...certConfig, bgFit: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="contain">Muat Penuh Gambar (Presisi A4 - Tanpa Terpotong)</option>
                    <option value="cover">Isi Seluruh Kertas A4 (Penuh Tanpa Tepi)</option>
                    <option value="fill">Regangkan Menyesuaikan Dimensi A4 (Stretch)</option>
                  </select>
                </div>

                <div className="flex items-center text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                  <span>ℹ️ <strong>Format Standar A4:</strong> PDF sertifikat akan dicetak tepat berukuran 297 × 210 mm (Landscape) pada resolusi tinggi 300 DPI tanpa terpotong.</span>
                </div>
              </div>

              {/* Live Miniature A4 Preview */}
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Eye size={14} className="text-blue-600" /> Pratinjau Langsung Tata Letak Sertifikat (A4 Landscape)
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-200 p-0.5 rounded text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('page1')}
                        className={`px-2.5 py-1 rounded font-medium transition ${previewTab === 'page1' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        Halaman 1 (Depan)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('page2')}
                        className={`px-2.5 py-1 rounded font-medium transition ${previewTab === 'page2' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        Halaman 2 (Belakang {certConfig.showHalaman2 ? '• Aktif' : '• Nonaktif'})
                      </button>
                    </div>
                    <span className="text-[11px] text-gray-400 hidden sm:inline">297 x 210 mm</span>
                  </div>
                </div>

                {previewTab === 'page1' ? (
                  <div className="w-full max-w-2xl mx-auto aspect-[297/210] bg-white rounded border-2 border-dashed border-gray-300 relative overflow-hidden shadow-inner flex flex-col items-center">
                    {newEvent.TemplateURL ? (
                      <img 
                        src={newEvent.TemplateURL} 
                        alt="Template Preview" 
                        className={`absolute inset-0 w-full h-full ${
                          certConfig.bgFit === 'contain' ? 'object-contain' : 
                          certConfig.bgFit === 'cover' ? 'object-cover' : 'object-fill'
                        }`} 
                      />
                    ) : (
                      <div className="absolute inset-0 border-8 border-double border-blue-900 bg-blue-50/30 flex flex-col items-center justify-center p-4 text-center">
                        <p className="text-[10px] font-serif font-bold text-blue-950 uppercase tracking-widest">SERTIFIKAT PENGHARGAAN</p>
                      </div>
                    )}

                    {/* Elements overlay in preview scaled to container */}
                    <div className="absolute inset-0 z-10 pointer-events-none p-2 flex flex-col justify-between">
                      {/* Top: Judul & Tema */}
                      <div className="w-full text-center space-y-1 mt-2">
                        {certConfig.showJudul && (
                          <p className={`text-[11px] font-bold text-gray-900 uppercase tracking-wide leading-tight ${
                            certConfig.judulAlign === 'left' ? 'text-left pl-6' : 
                            certConfig.judulAlign === 'right' ? 'text-right pr-6' : 'text-center'
                          }`}>
                            {newEvent.Judul || 'Judul Kegiatan'}
                          </p>
                        )}
                        {certConfig.showTema && (
                          <p className={`text-[9px] italic text-gray-700 leading-tight ${
                            certConfig.temaAlign === 'left' ? 'text-left pl-6' : 
                            certConfig.temaAlign === 'right' ? 'text-right pr-6' : 'text-center'
                          }`}>
                            "{newEvent.Tema || 'Tema Kegiatan'}"
                          </p>
                        )}
                      </div>

                      {/* Middle: Participant Name Sample */}
                      <div className="w-full text-center my-auto">
                        <p className="text-[7px] uppercase tracking-widest text-gray-500 font-semibold mb-0.5">Diberikan Kepada</p>
                        <h4 className="text-[15px] font-bold text-gray-900 border-b border-gray-400 inline-block px-4 pb-0.5" style={{ fontFamily: 'serif' }}>
                          Nama Peserta Sertifikat
                        </h4>
                      </div>

                      {/* Bottom: Date & Signatures */}
                      <div className="w-full space-y-2">
                        {certConfig.showTanggal && (
                          <p className={`text-[8px] font-semibold text-gray-800 ${
                            certConfig.tanggalAlign === 'left' ? 'text-left pl-6' : 
                            certConfig.tanggalAlign === 'right' ? 'text-right pr-6' : 'text-center'
                          }`}>
                            Tanggal: {newEvent.TanggalPelaksanaan || 'Tanggal Pelaksanaan'}
                          </p>
                        )}

                        {certConfig.showTTD && (
                          <div className={`w-full px-6 flex text-[8px] text-gray-800 pb-1 ${
                            certConfig.layout === 'Tengah' ? 'justify-center' :
                            certConfig.layout === 'Kanan' ? 'justify-end' :
                            certConfig.layout === 'Kiri' ? 'justify-start' :
                            'justify-between'
                          }`}>
                            {(certConfig.layout === 'Kiri' || certConfig.layout === 'Kiri-Kanan') && (
                              <div className="text-center w-28">
                                <p className="font-bold border-b border-gray-700 pb-0.5">{newEvent.TTD1_Nama || 'Nama Penandatangan 1'}</p>
                                <p className="text-[7px] text-gray-600">{newEvent.TTD1_NIP || 'NIP/SIP'}</p>
                              </div>
                            )}

                            {certConfig.layout === 'Tengah' && (
                              <div className="text-center w-32">
                                <p className="font-bold border-b border-gray-700 pb-0.5">{newEvent.TTD1_Nama || newEvent.TTD2_Nama || 'Nama Penandatangan'}</p>
                                <p className="text-[7px] text-gray-600">{newEvent.TTD1_NIP || newEvent.TTD2_NIP || 'NIP/SIP'}</p>
                              </div>
                            )}

                            {(certConfig.layout === 'Kanan' || certConfig.layout === 'Kiri-Kanan') && (
                              <div className="text-center w-28">
                                <p className="font-bold border-b border-gray-700 pb-0.5">{newEvent.TTD2_Nama || 'Nama Penandatangan 2'}</p>
                                <p className="text-[7px] text-gray-600">{newEvent.TTD2_NIP || 'NIP/SIP'}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-2xl mx-auto aspect-[297/210] bg-white rounded border-2 border-dashed border-gray-300 relative overflow-hidden shadow-inner flex flex-col items-center justify-center p-4">
                    {!certConfig.showHalaman2 ? (
                      <div className="text-center text-gray-400 p-4">
                        <FileText size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-semibold text-gray-600">Halaman Kedua Belum Diaktifkan</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Centang opsi "Aktifkan Halaman Kedua" di bawah untuk memunculkan halaman belakang dengan kriteria penilaian.</p>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center border-4 border-double border-blue-900 bg-blue-50/20 p-3 rounded">
                        <div className="w-full max-w-lg bg-white/95 border border-gray-200 rounded p-3 shadow-xs flex flex-col items-center my-auto">
                          <h4 className="text-[11px] font-bold text-blue-950 uppercase tracking-wider text-center border-b border-gray-300 pb-1 w-full">
                            {certConfig.judulHalaman2 || 'Hasil Pemeriksaan / Kriteria Penilaian'}
                          </h4>
                          <p className="text-[8px] text-gray-500 my-1">Peserta: Nama Peserta Sertifikat • Lampiran Resmi Sertifikat A4</p>
                          
                          {/* Centered Assessment Table */}
                          <div className="w-full border rounded overflow-hidden mt-1 text-[8px]">
                            <div className="grid grid-cols-12 bg-gray-100 font-bold px-2 py-1 text-gray-700 border-b">
                              <div className="col-span-1 text-center">No</div>
                              <div className="col-span-7">Nama Kriteria Penilaian</div>
                              <div className="col-span-4 text-center">Hasil / Keterangan</div>
                            </div>
                            <div className="divide-y divide-gray-100 bg-white">
                              {(certConfig.kriteriaPenilaian && certConfig.kriteriaPenilaian.length > 0) ? (
                                certConfig.kriteriaPenilaian.slice(0, 6).map((item, idx) => (
                                  <div key={idx} className="grid grid-cols-12 px-2 py-1 items-center">
                                    <div className="col-span-1 text-center text-gray-500 font-semibold">{idx + 1}</div>
                                    <div className="col-span-7 text-gray-800 truncate">{item.nama || 'Nama Kriteria'}</div>
                                    <div className="col-span-4 text-center font-bold text-emerald-700 truncate">{item.hasil || 'Normal'}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-2 text-center text-[8px] text-gray-400">Belum ada kriteria penilaian yang ditambahkan</div>
                              )}
                            </div>
                          </div>

                          <p className="text-[7px] text-gray-400 text-center mt-2">Posisi Center Otomatis (Vertikal & Horizontal)</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Halaman Kedua (Belakang Sertifikat) & Kriteria Penilaian */}
            <div className="bg-gray-50/70 p-4 rounded-lg border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">4. Halaman Kedua (Belakang Sertifikat) & Kriteria Penilaian</h3>
                  <p className="text-xs text-gray-500">Aktifkan untuk menambahkan halaman belakang berupa lampiran kriteria penilaian atau hasil pemeriksaan.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border border-gray-200 shadow-sm hover:bg-gray-50 transition">
                  <input 
                    type="checkbox" 
                    checked={certConfig.showHalaman2} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCertConfig({
                        ...certConfig, 
                        showHalaman2: checked,
                        kriteriaPenilaian: (checked && (!certConfig.kriteriaPenilaian || certConfig.kriteriaPenilaian.length === 0)) ? [
                          { id: '1', nama: 'Kriteria Penilaian 1', hasil: 'Sesuai Standar / Baik' }
                        ] : (certConfig.kriteriaPenilaian || [])
                      });
                      if (checked) setPreviewTab('page2');
                    }}
                    className="w-4 h-4 text-blue-600 rounded" 
                  />
                  <span className="text-xs font-bold text-gray-800">Aktifkan Halaman Kedua</span>
                </label>
              </div>

              {certConfig.showHalaman2 && (
                <div className="space-y-4 pt-1">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Judul Lampiran Halaman Kedua</label>
                    <input 
                      type="text" 
                      value={certConfig.judulHalaman2 || ''} 
                      onChange={(e) => setCertConfig({...certConfig, judulHalaman2: e.target.value})}
                      placeholder="Contoh: Hasil Pemeriksaan Kesehatan / Penilaian Uji Kompetensi"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 uppercase">Daftar Kriteria Penilaian</h4>
                        <p className="text-[11px] text-gray-500">Kriteria otomatis tertanam rapi di posisi <strong>center (tengah horizontal dan vertikal)</strong> pada halaman kedua sertifikat.</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button 
                          type="button"
                          onClick={() => {
                            const newId = `crit-${Date.now()}`;
                            setCertConfig({
                              ...certConfig,
                              kriteriaPenilaian: [
                                ...(certConfig.kriteriaPenilaian || []),
                                { id: newId, nama: '', hasil: '' }
                              ]
                            });
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Plus size={14} /> Tambah Kriteria Penilaian
                        </button>
                      </div>
                    </div>

                    {/* Presets buttons */}
                    <div className="flex items-center gap-2 pt-1 pb-1 flex-wrap">
                      <span className="text-[11px] text-gray-500 font-medium">Muat Contoh:</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setCertConfig({
                            ...certConfig,
                            judulHalaman2: 'Hasil Pemeriksaan Kesehatan Medical Check Up',
                            kriteriaPenilaian: [
                              { id: '1', nama: 'Tekanan Darah', hasil: 'Normal (120/80 mmHg)' },
                              { id: '2', nama: 'Gula Darah Acak (GDA)', hasil: 'Normal (< 200 mg/dL)' },
                              { id: '3', nama: 'Skrining TB Paru', hasil: 'Negatif / Tidak Gejala' },
                              { id: '4', nama: 'Pemeriksaan HBsAg', hasil: 'Non-Reaktif' },
                              { id: '5', nama: 'Indeks Massa Tubuh (IMT)', hasil: 'Normal / Ideal' }
                            ]
                          });
                        }}
                        className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded transition font-medium"
                      >
                        + Contoh MCU Kesehatan
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setCertConfig({
                            ...certConfig,
                            judulHalaman2: 'Hasil Penilaian Uji Kompetensi & Pelatihan',
                            kriteriaPenilaian: [
                              { id: '1', nama: 'Ujian Pemahaman Teori (Post-Test)', hasil: '85 / 100 (Lulus)' },
                              { id: '2', nama: 'Keterampilan Praktek & Simulasi', hasil: 'Sangat Baik (A)' },
                              { id: '3', nama: 'Tingkat Kehadiran & Partisipasi', hasil: '100% (Lengkap)' },
                              { id: '4', nama: 'Evaluasi Sikap & Disiplin', hasil: 'Memuaskan' }
                            ]
                          });
                        }}
                        className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded transition font-medium"
                      >
                        + Contoh Pelatihan / Ujian
                      </button>
                    </div>

                    {/* Criteria List */}
                    <div className="space-y-2 mt-2">
                      {(!certConfig.kriteriaPenilaian || certConfig.kriteriaPenilaian.length === 0) ? (
                        <div className="text-center py-6 border border-dashed rounded-lg bg-gray-50 text-gray-500 text-xs">
                          Belum ada kriteria penilaian. Klik tombol <strong>"+ Tambah Kriteria Penilaian"</strong> atau pilih tombol contoh cepat di atas.
                        </div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="grid grid-cols-12 gap-2 bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-700 uppercase">
                            <div className="col-span-1 text-center">No</div>
                            <div className="col-span-6">Nama Kriteria Penilaian</div>
                            <div className="col-span-4">Hasil / Standar / Nilai</div>
                            <div className="col-span-1 text-center">Aksi</div>
                          </div>
                          <div className="divide-y divide-gray-100 bg-white">
                            {certConfig.kriteriaPenilaian.map((item, index) => (
                              <div key={item.id || index} className="grid grid-cols-12 gap-2 px-3 py-2 items-center text-xs">
                                <div className="col-span-1 text-center font-bold text-gray-500">{index + 1}</div>
                                <div className="col-span-6">
                                  <input 
                                    type="text" 
                                    value={item.nama} 
                                    onChange={(e) => {
                                      const updated = [...certConfig.kriteriaPenilaian];
                                      updated[index] = { ...updated[index], nama: e.target.value };
                                      setCertConfig({ ...certConfig, kriteriaPenilaian: updated });
                                    }}
                                    placeholder="Contoh: Tekanan Darah / Praktek"
                                    className="w-full px-2 py-1.5 border rounded text-xs"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <input 
                                    type="text" 
                                    value={item.hasil} 
                                    onChange={(e) => {
                                      const updated = [...certConfig.kriteriaPenilaian];
                                      updated[index] = { ...updated[index], hasil: e.target.value };
                                      setCertConfig({ ...certConfig, kriteriaPenilaian: updated });
                                    }}
                                    placeholder="Contoh: Normal (120/80 mmHg) / 85 (Lulus)"
                                    className="w-full px-2 py-1.5 border rounded text-xs font-medium text-emerald-800"
                                  />
                                </div>
                                <div className="col-span-1 text-center">
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      const updated = certConfig.kriteriaPenilaian.filter((_, i) => i !== index);
                                      setCertConfig({ ...certConfig, kriteriaPenilaian: updated });
                                    }}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                    title="Hapus Kriteria"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEventId(null);
                  setCertConfig(DEFAULT_CERT_CONFIG);
                  setNewEvent({ Judul: '', Tema: '', TanggalMulai: '', TanggalSelesai: '', TanggalPelaksanaan: '', BatasPendaftaran: '', TemplateURL: '', TTD1_Nama: '', TTD2_Nama: '', TTD_LayoutConfig: 'Kiri-Kanan', TTD1_NIP: '', TTD2_NIP: '' });
                }} 
                className="px-5 py-2.5 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 transition shadow-sm"
              >
                {editingEventId ? 'Simpan Perubahan Kegiatan' : 'Simpan Kegiatan Baru'}
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
