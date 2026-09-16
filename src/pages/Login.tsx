import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchSheetData, fetchSystemStatus } from '../lib/api';
import { Database, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // System Status State
  const [sysStatus, setSysStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const navigate = useNavigate();

  const checkConnection = async () => {
    setCheckingStatus(true);
    try {
      const status = await fetchSystemStatus();
      setSysStatus(status);
    } catch (err) {
      setSysStatus({ status: 'error', message: 'Gagal mengecek status server.' });
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const { initializeSpreadsheet } = await import('../lib/api');
      await initializeSpreadsheet();
      await checkConnection(); // Refresh status
      alert('Spreadsheet berhasil diinisialisasi dengan data awal!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInitializing(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Fetch users from the 'Users' sheet
      const users = await fetchSheetData('Users');
      
      if (users.length === 0) {
        if (sysStatus?.hasUsersTab) {
          setError('Data Users di Spreadsheet masih kosong. Harap isi baris pertama dengan header: ID, Role, Nama, Email, Password, dan baris kedua dengan data admin.');
        } else {
          setError('Sheet "Users" belum ditemukan atau data kosong.');
        }
        setLoading(false);
        return;
      }

      const user = users.find((u: any) => u.Email === email && u.Password === password);
      
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        navigate('/dashboard');
      } else {
        setError('Email atau password salah. (Coba Admin: admin@example.com / 12345)');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke Google Sheets API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      {/* Connection Indicator */}
      <div className="max-w-md w-full mb-4">
        {checkingStatus ? (
          <div className="bg-white border rounded-lg p-3 text-sm text-gray-500 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            Mengecek koneksi database...
          </div>
        ) : sysStatus?.status === 'connected' ? (
          <div className={`border rounded-lg p-3 text-sm flex items-start gap-3 ${
            sysStatus?.hasUsersData ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            {sysStatus?.hasUsersData ? <CheckCircle2 className="shrink-0 mt-0.5 text-green-600" size={18} /> : <AlertCircle className="shrink-0 mt-0.5 text-yellow-600" size={18} />}
            
            <div>
              <p className="font-semibold">{sysStatus?.message}</p>
              <div className="mt-1 text-xs opacity-90">
                <p>Spreadsheet: <strong>{sysStatus.spreadsheetTitle}</strong></p>
                
                {!sysStatus.hasServiceAccount && (
                   <p className="mt-1 text-orange-600 font-medium">⚠️ Akun Layanan belum diatur. Penulisan data akan menggunakan Mock Demo.</p>
                )}
                
                {!sysStatus.hasUsersTab && <p className="mt-1 font-bold text-red-600">⚠️ Tab 'Users' tidak ditemukan!</p>}
                {sysStatus.hasUsersTab && !sysStatus.hasUsersData && <p className="mt-1 font-bold text-red-600">⚠️ Tab 'Users' kosong. Aplikasi tidak bisa login jika tidak ada data akun!</p>}
                
                {(!sysStatus.hasUsersTab || !sysStatus.hasUsersData) && sysStatus.hasServiceAccount && (
                  <button 
                    type="button"
                    onClick={handleInitialize}
                    disabled={initializing}
                    className="mt-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {initializing ? 'Menginisialisasi...' : 'Inisialisasi Tab & Data Otomatis'}
                  </button>
                )}
                
                {(!sysStatus.hasUsersTab || !sysStatus.hasUsersData) && !sysStatus.hasServiceAccount && (
                  <p className="mt-2 text-red-600 italic font-medium">Untuk menggunakan Inisialisasi Otomatis, Anda wajib memasukkan GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_PRIVATE_KEY di pengaturan AI Studio.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang</h1>
          <p className="text-gray-500 text-sm">Sistem Manajemen & Penerbitan Sertifikat</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Masukkan email terdaftar"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-70 flex justify-center items-center h-11 shadow-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 mb-3">Belum memiliki akun peserta?</p>
          <Link
            to="/register"
            className="w-full inline-flex items-center justify-center gap-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2 px-4 rounded-lg transition text-sm"
          >
            <UserPlus size={17} />
            Daftar sebagai Peserta Baru
          </Link>
        </div>
      </div>
    </div>
  );
}
