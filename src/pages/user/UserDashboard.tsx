import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchSheetData, appendSheetData } from '../../lib/api';
import { Calendar, CheckCircle, Clock, Loader2 } from 'lucide-react';

export default function UserDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const loadData = async () => {
    try {
      const [allEvents, allRegs] = await Promise.all([
        fetchSheetData('Events'),
        fetchSheetData('Registrations')
      ]);
      setEvents(allEvents);
      setMyRegistrations(allRegs.filter((r: any) => r.UserID === user.ID));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (eventId: string) => {
    setRegistering(eventId);
    try {
      const regId = `REG-${Date.now()}`;
      await appendSheetData('Registrations', [[regId, user.ID, eventId, 'Registered']]);
      await loadData(); // Reload
    } catch (error) {
      alert('Gagal mendaftar kegiatan');
    } finally {
      setRegistering(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Kegiatan Saya</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myRegistrations.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-500">
              Anda belum mendaftar kegiatan apapun.
            </div>
          ) : (
            myRegistrations.map(reg => {
              const event = events.find(e => e.EventID === reg.EventID);
              if (!event) return null;
              
              return (
                <Link to={`/event/${event.EventID}`} key={reg.RegID} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition group">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition">{event.Judul}</h3>
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle size={12} /> Terdaftar
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 gap-2 mb-1">
                    <Calendar size={14} /> {event.TanggalMulai} - {event.TanggalSelesai}
                  </div>
                  {event.TanggalPelaksanaan && (
                    <div className="flex items-center text-sm text-gray-500 gap-2 mb-1">
                      <Clock size={14} /> Plksn: {event.TanggalPelaksanaan}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-blue-600">
                    Buka Kelas &rarr;
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Kegiatan Tersedia</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.filter(e => !myRegistrations.some(r => r.EventID === e.EventID)).map(event => (
            <div key={event.EventID} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">{event.Judul}</h3>
                <div className="flex items-center text-sm text-gray-500 gap-2 mb-1">
                  <Calendar size={14} /> {event.TanggalMulai}
                </div>
                <div className="flex items-center text-sm text-gray-500 gap-2 mb-4">
                  <Clock size={14} /> Sampai {event.TanggalSelesai}
                </div>
                {event.TanggalPelaksanaan && (
                  <div className="flex items-center text-sm text-gray-500 gap-2 mb-4">
                    <CheckCircle size={14} /> Plksn: {event.TanggalPelaksanaan}
                  </div>
                )}
              </div>
              <button 
                onClick={() => handleRegister(event.EventID)}
                disabled={registering === event.EventID}
                className="w-full bg-gray-50 hover:bg-blue-50 text-blue-600 font-medium py-2 rounded-lg border border-gray-200 hover:border-blue-200 transition disabled:opacity-50 flex justify-center items-center h-10"
              >
                {registering === event.EventID ? <Loader2 className="animate-spin" size={18} /> : 'Daftar Sekarang'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
