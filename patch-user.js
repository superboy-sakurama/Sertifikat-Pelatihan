import fs from 'fs';
let code = fs.readFileSync('src/pages/user/UserDashboard.tsx', 'utf8');

const handleRegOld = `  const handleRegister = async (eventId: string) => {
    setRegistering(eventId);
    try {
      const regId = \`REG-\${Date.now()}\`;
      await appendSheetData('Registrations', [[regId, user.ID, eventId, 'Registered']]);
      await loadData(); // Reload
    } catch (error) {
      alert('Gagal mendaftar kegiatan');
    } finally {
      setRegistering(null);
    }
  };`;

const handleRegNew = `  const handleRegister = async (eventId: string) => {
    setRegistering(eventId);
    try {
      const regId = \`REG-\${Date.now()}\`;
      const res = await appendSheetData('Registrations', [[regId, user.ID, eventId, 'Registered']]);
      if (res && res.mock) {
         // Mock fallback: append locally so UI responds even without Service Account
         setMyRegistrations(prev => [...prev, { RegID: regId, UserID: user.ID, EventID: eventId, Status: 'Registered' }]);
      } else {
         await loadData(); // Reload from real DB
      }
      alert('Berhasil mendaftar kegiatan!');
    } catch (error) {
      alert('Gagal mendaftar kegiatan');
    } finally {
      setRegistering(null);
    }
  };

  const isExpired = (deadlineStr: string) => {
    if (!deadlineStr) return false; // If no deadline set, it's open
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    return today > deadline;
  };
`;

code = code.replace(handleRegOld, handleRegNew);

const oldCard = `            <div key={event.EventID} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
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
            </div>`;

const newCard = `            <div key={event.EventID} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">{event.Judul}</h3>
                <div className="flex items-center text-sm text-gray-500 gap-2 mb-1">
                  <Calendar size={14} /> {event.TanggalMulai}
                </div>
                <div className="flex items-center text-sm text-gray-500 gap-2 mb-1">
                  <Clock size={14} /> Sampai {event.TanggalSelesai}
                </div>
                {event.TanggalPelaksanaan && (
                  <div className="flex items-center text-sm text-gray-500 gap-2 mb-1">
                    <CheckCircle size={14} /> Plksn: {event.TanggalPelaksanaan}
                  </div>
                )}
                {event.BatasPendaftaran && (
                  <div className="flex items-center text-sm text-red-500 gap-2 mb-4 font-medium mt-2">
                    <Clock size={14} /> Pendaftaran Ditutup: {event.BatasPendaftaran}
                  </div>
                )}
                {!event.BatasPendaftaran && <div className="mb-4"></div>}
              </div>
              <button 
                onClick={() => handleRegister(event.EventID)}
                disabled={registering === event.EventID || isExpired(event.BatasPendaftaran)}
                className="w-full bg-gray-50 hover:bg-blue-50 text-blue-600 font-medium py-2 rounded-lg border border-gray-200 hover:border-blue-200 transition disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 flex justify-center items-center h-10"
              >
                {registering === event.EventID ? <Loader2 className="animate-spin" size={18} /> : (isExpired(event.BatasPendaftaran) ? 'Pendaftaran Ditutup' : 'Daftar Sekarang')}
              </button>
            </div>`;

code = code.replace(oldCard, newCard);

fs.writeFileSync('src/pages/user/UserDashboard.tsx', code);
