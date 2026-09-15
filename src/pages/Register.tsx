import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchSheetData, appendSheetData } from '../lib/api';
import { UserPlus, Mail, Lock, User, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validasi input
    if (!nama.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Format email tidak valid.');
      return;
    }

    if (password.length < 5) {
      setError('Password minimal harus 5 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sesuai dengan password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Cek apakah email sudah terdaftar di sheet Users
      const existingUsers = await fetchSheetData('Users').catch(() => []);
      const emailExists = existingUsers.some(
        (u: any) => u.Email && u.Email.toLowerCase() === trimmedEmail
      );

      if (emailExists) {
        setError('Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.');
        setLoading(false);
        return;
      }

      // 2. Buat ID User unik
      const userId = `USR-${Date.now()}`;
      const newUserData = {
        ID: userId,
        Role: 'User',
        Nama: nama.trim(),
        Email: trimmedEmail,
        Password: password
      };

      // 3. Sinkronkan dan simpan ke database Google Sheets (kolom: ID, Role, Nama, Email, Password)
      const row = [
        newUserData.ID,
        newUserData.Role,
        newUserData.Nama,
        newUserData.Email,
        newUserData.Password
      ];

      await appendSheetData('Users', [row]);

      // 4. Set status berhasil & auto login ke localStorage
      setSuccess(true);
      localStorage.setItem('currentUser', JSON.stringify(newUserData));

      // Beri jeda 1.5 detik agar user membaca notifikasi sukses lalu redirect ke Dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);

    } catch (err: any) {
      console.error('Registration Error:', err);
      setError(err.message || 'Gagal mendaftar. Pastikan koneksi database tersedia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        
        {/* Header navigasi balik */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke Login
          </Link>
          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
            Pendaftaran Peserta
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Akun Baru</h1>
          <p className="text-gray-500 text-sm mt-1">Daftar sebagai peserta untuk mengikuti kegiatan & tes</p>
        </div>

        {/* Alert Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-sm mb-5 border border-red-100 flex items-start gap-2.5">
            <AlertCircle className="shrink-0 mt-0.5 text-red-600" size={18} />
            <div>{error}</div>
          </div>
        )}

        {/* Alert Sukses */}
        {success && (
          <div className="bg-green-50 text-green-800 p-3.5 rounded-xl text-sm mb-5 border border-green-200 flex items-start gap-2.5">
            <CheckCircle2 className="shrink-0 mt-0.5 text-green-600" size={18} />
            <div>
              <p className="font-semibold">Pendaftaran Berhasil!</p>
              <p className="text-xs text-green-700 mt-0.5">Data telah tersinkron ke database. Mengalihkan ke dashboard...</p>
            </div>
          </div>
        )}

        {/* Form Pendaftaran */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm text-gray-900"
                placeholder="Contoh: Budi Santoso"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm text-gray-900"
                placeholder="nama@email.com"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kata Sandi / Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm text-gray-900"
                placeholder="Minimal 5 karakter"
                required
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konfirmasi Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm text-gray-900"
                placeholder="Ulangi kata sandi"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition disabled:opacity-70 flex justify-center items-center h-11 shadow-sm hover:shadow"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mendaftarkan & Menyimpan...</span>
                </div>
              ) : success ? (
                <span>Berhasil Masuk...</span>
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Sudah memiliki akun?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-semibold">
              Masuk di sini
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
