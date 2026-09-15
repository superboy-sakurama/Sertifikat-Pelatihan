import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSheetData } from '../lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Validation() {
  const { certId } = useParams();
  const [loading, setLoading] = useState(true);
  const [certData, setCertData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const validate = async () => {
      try {
        const [certs, regs, events, users, healths] = await Promise.all([
          fetchSheetData('Certificates'),
          fetchSheetData('Registrations'),
          fetchSheetData('Events'),
          fetchSheetData('Users'),
          fetchSheetData('HealthAssessments').catch(() => [])
        ]);

        const cert = certs.find((c: any) => c.CertID === certId);
        if (!cert) {
          setError('Sertifikat tidak ditemukan atau tidak valid.');
          return;
        }

        const reg = regs.find((r: any) => r.RegID === cert.RegID);
        const event = events.find((e: any) => e.EventID === reg?.EventID);
        const user = users.find((u: any) => u.ID === reg?.UserID);
        const health = healths.filter((h: any) => h.RegID === reg?.RegID).pop();

        if (cert && reg && event && user) {
          setCertData({ cert, event, user, health });
        } else {
          setError('Data sertifikat tidak lengkap.');
        }
      } catch (err: any) {
        setError('Gagal memvalidasi sertifikat: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    if (certId) validate();
  }, [certId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-6 text-center">
          <h1 className="text-xl font-bold text-white">Validasi Sertifikat</h1>
        </div>
        
        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center text-gray-500 py-8">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>Memverifikasi data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center py-4">
              <XCircle className="text-red-500 mb-4" size={64} />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Tidak Valid</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="text-green-500 mb-4" size={64} />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Dokumen Asli</h2>
              <p className="text-sm text-gray-500 mb-6 border-b pb-6 w-full">Data sesuai dengan hasil pemeriksaan</p>
              
              <div className="w-full space-y-4 text-left">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Nama Peserta</p>
                  <p className="font-medium text-gray-900">{certData.user.Nama}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Nomor Sertifikat</p>
                  <p className="font-medium text-gray-900">{certData.cert.CertNumber}</p>
                </div>
                {certData.health && certData.health.Status && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Hasil Penilaian</p>
                    <p className="font-bold text-blue-800 uppercase">{certData.health.Status}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Penandatangan</p>
                  <p className="font-medium text-gray-900">{certData.event.TTD1_Nama}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Tanggal Pelaksanaan/Pemeriksaan</p>
                  <p className="font-medium text-gray-900">{certData.event.TanggalPelaksanaan || certData.event.TanggalMulai}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
