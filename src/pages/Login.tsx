import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchSheetData, fetchSystemStatus } from '../lib/api';
import { Database, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'unregistered' | 'wrong_password' | 'general' | null>(null);
  const [unregisteredEmail, setUnregisteredEmail] = useState('');
  
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
    setErrorType(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // Fetch users from the 'Users' sheet
      const users = await fetchSheetData('Users');
      
      if (!users || users.length === 0) {
        setError('Sistem database belum siap atau data pengguna belum tersedia.');
        setErrorType('general');
        setLoading(false);
        return;
      }

      // Cari data akun berdasarkan email terdaftar (case-insensitive & trimmed)
      const userWithEmail = users.find((u: any) => 
        (u.Email || '').toString().trim().toLowerCase() === cleanEmail
      );

      if (!userWithEmail) {
        // Email belum terdaftar di database
        setUnregisteredEmail(email.trim());
        setErrorType('unregistered');
        setError(`Email ${email.trim()} belum terdaftar di sistem.`);
        setLoading(false);
        return;
      }

      // Verifikasi kata sandi
      if (String(userWithEmail.Password || '').trim() !== cleanPassword) {
        setErrorType('wrong_password');
        setError('Password yang Anda masukkan salah. Silakan periksa kembali kata sandi Anda.');
        setLoading(false);
        return;
      }

      // Berhasil masuk
      localStorage.setItem('currentUser', JSON.stringify(userWithEmail));
      navigate('/dashboard');
    } catch (err: any) {
      setErrorType('general');
      setError(err.message || 'Gagal terhubung ke database. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      {/* Connection Indicator - Ditampilkan hanya bila ada kendala database */}
      {sysStatus && (!sysStatus.hasUsersData || sysStatus.status !== 'connected') && (
        <div className="max-w-md w-full mb-4">
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
                  <p className="mt-2 text-red-600 italic font-medium">Untuk menggunakan Inisialisasi Otomatis, Anda wajib memasukkan GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_PRIVATE_KEY di pengaturan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang</h1>
          <p className="text-gray-500 text-sm">Sistem Manajemen & Penerbitan Sertifikat</p>
        </div>

        {error && (
          errorType === 'unregistered' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-900 shadow-xs animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                  <UserPlus size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-amber-900 mb-1">
                    Akun Belum Terdaftar
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed mb-3">
                    Email <span className="font-semibold text-amber-950 underline decoration-amber-300">{unregisteredEmail}</span> belum terdaftar di sistem. Silakan mendaftar terlebih dahulu untuk dapat mengakses sertifikat & kegiatan Anda.
                  </p>
                  <Link
                    to={`/register?email=${encodeURIComponent(unregisteredEmail)}`}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-xs"
                  >
                    <UserPlus size={14} />
                    Daftar sebagai Peserta Baru
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-sm mb-6 border border-red-100 flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
              <div className="text-xs sm:text-sm font-medium">{error}</div>
            </div>
          )
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
