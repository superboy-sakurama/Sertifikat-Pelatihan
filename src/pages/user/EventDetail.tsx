import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSheetData, appendSheetData } from '../../lib/api';
import { CheckCircle, Circle, Download, Loader2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export default function EventDetail() {
  const { eventId } = useParams();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const certPage2Ref = useRef<HTMLDivElement>(null);

  const [event, setEvent] = useState<any>(null);
  const [reg, setReg] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [testData, setTestData] = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);

  // Quiz state
  const [activeQuiz, setActiveQuiz] = useState<'none' | 'PRETEST' | 'POSTTEST'>('none');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [healthStatus, setHealthStatus] = useState<string>('Belum Dinilai');
  const [healthDetails, setHealthDetails] = useState<any>(null);

  const backgroundImageUrl = (event && event.TemplateImage && event.TemplateImage.startsWith('http')) ? event.TemplateImage : (event ? event.TemplateURL : '');

  const loadData = async () => {
    try {
      const [events, regs, atts, tests, certs, questions, healthAssessments] = await Promise.all([
        fetchSheetData('Events'),
        fetchSheetData('Registrations'),
        fetchSheetData('Attendance'),
        fetchSheetData('Tests'),
        fetchSheetData('Certificates'),
        fetchSheetData('Questions'),
        fetchSheetData('HealthAssessments').catch(() => []) // Fallback in case it fails
      ]);

      const ev = events.find((e: any) => e.EventID === eventId);
      const rg = regs.find((r: any) => r.EventID === eventId && r.UserID === user.ID);
      
      setEvent(ev);
      setReg(rg);
      setAllQuestions(questions || []);

      if (rg) {
        setAttendance(atts.find((a: any) => a.RegID === rg.RegID));
        
        // Find health status
        const userHealth = healthAssessments.filter((h: any) => h.RegID === rg.RegID).pop();
        if (userHealth) {
          setHealthStatus(userHealth.Status);
          setHealthDetails(userHealth);
        }
        
        // Find latest test data for this regId
        const userTests = tests.filter((t: any) => t.RegID === rg.RegID);
        if (userTests.length > 0) {
           let maxPre = 0;
           let maxPost = 0;
           let isComp = false;
           userTests.forEach((t:any) => {
              if (t.PreTestScore !== undefined && t.PreTestScore !== '') {
                maxPre = Math.max(maxPre, parseInt(t.PreTestScore) || 0);
              }
              if (t.PostTestScore !== undefined && t.PostTestScore !== '') {
                 const postScore = parseInt(t.PostTestScore) || 0;
                 maxPost = Math.max(maxPost, postScore);
                 if (t.IsCompleted === 'TRUE' || t.IsCompleted === true || t.IsCompleted === 'true' || postScore >= 70) {
                   isComp = true;
                 }
              }
           });
           setTestData({ 
             PreTestScore: maxPre > 0 ? maxPre.toString() : '', 
             PostTestScore: maxPost > 0 ? maxPost.toString() : (userTests.some((t:any) => t.PostTestScore === '0' || t.PostTestScore === 0) ? '0' : ''), 
             IsCompleted: isComp ? 'TRUE' : 'FALSE' 
           });
        }
        
        setCertificate(certs.find((c: any) => c.RegID === rg.RegID));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const handleAttend = async () => {
    setActionLoading(true);
    try {
      await appendSheetData('Attendance', [[`ATT-${Date.now()}`, reg.RegID, new Date().toISOString()]]);
      await loadData();
    } catch (e) {
      alert("Gagal menyimpan absensi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuizSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const questions = allQuestions.filter(q => q.EventID === eventId && q.Type === activeQuiz);
      if (questions.length === 0) {
        alert("Tidak ada soal untuk ujian ini.");
        setActionLoading(false);
        setActiveQuiz('none');
        return;
      }

      let correct = 0;
      questions.forEach(q => {
        if (quizAnswers[q.QuestionID] === q.CorrectOption) correct++;
      });
      const score = Math.round((correct / questions.length) * 100);

      if (activeQuiz === 'PRETEST') {
        await appendSheetData('Tests', [[`TST-${Date.now()}`, reg.RegID, score, '', 'FALSE']]);
      } else {
        const isPass = score >= 70;
        await appendSheetData('Tests', [[`TST-${Date.now()}`, reg.RegID, '', score, isPass ? 'TRUE' : 'FALSE']]);
        
        // Generate certificate if pass and not already generated
        if (isPass && !certificate) {
          const certId = `CRT-${Date.now()}`;
          const certNumber = `CERT/${new Date().getFullYear()}/${Math.floor(Math.random()*10000)}`;
          await appendSheetData('Certificates', [[certId, reg.RegID, certNumber, new Date().toISOString()]]);
        }
      }
      
      setQuizAnswers({});
      setActiveQuiz('none');
      await loadData();
    } catch (e) {
      alert("Gagal menyimpan hasil tes");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!certRef.current) return;
    setActionLoading(true);
    
    try {
      // Preload the template image explicitly to ensure it is fully fetched before canvas rendering
      if (backgroundImageUrl) {
        const proxiedUrl = backgroundImageUrl.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(backgroundImageUrl)}` : backgroundImageUrl;
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = resolve;
          img.onerror = resolve; // Continue even if it fails, fallback
          img.src = proxiedUrl;
        });
      }

      // Allow browser a moment to ensure images (like QR code and template) are fully rendered in the hidden div
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas1 = await html2canvas(certRef.current, { 
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false
      });
      const imgData1 = canvas1.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas1.width, canvas1.height]
      });
      pdf.addImage(imgData1, 'JPEG', 0, 0, canvas1.width, canvas1.height);

      if (certPage2Ref.current) {
        const canvas2 = await html2canvas(certPage2Ref.current, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 1.0);
        pdf.addPage([canvas2.width, canvas2.height], 'landscape');
        pdf.addImage(imgData2, 'JPEG', 0, 0, canvas2.width, canvas2.height);
      }

      pdf.save(`${event.Judul}_Certificate_${user.Nama}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Gagal generate PDF");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} /></div>;
  if (!event || !reg) return <div className="text-center p-12">Data tidak ditemukan.</div>;

  const hasAttended = !!attendance;
  const hasPreTest = testData?.PreTestScore !== undefined && testData?.PreTestScore !== '';
  const hasPostTest = testData?.PostTestScore !== undefined && testData?.PostTestScore !== '';
  const isPostTestPass = testData?.IsCompleted === 'TRUE';

  const validationUrl = `${window.location.origin}/validate/${certificate?.CertID || ''}`;

  const formatDateIndonesian = (dateString: string) => {
    if (!dateString) return '';
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return `${day} ${months[month]} ${year}`;
      }
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
      }
    } catch (e) {}
    return dateString;
  };

  const renderQuizForm = (type: 'PRETEST' | 'POSTTEST') => {
    const questions = allQuestions.filter(q => q.EventID === eventId && q.Type === type);
    if (questions.length === 0) return <p className="p-4 text-gray-500">Belum ada soal ujian yang ditambahkan oleh Admin.</p>;

    return (
      <form onSubmit={handleQuizSubmit} className="mt-4 p-4 border rounded-xl bg-gray-50 space-y-6">
        <h4 className="font-bold text-lg mb-2">{type === 'PRETEST' ? 'Soal Pre-Test' : 'Soal Post-Test'}</h4>
        {questions.map((q, i) => (
          <div key={q.QuestionID} className="space-y-2">
            <p className="font-medium text-gray-900">{i + 1}. {q.QuestionText}</p>
            <div className="space-y-1">
              {['A', 'B', 'C', 'D'].map(opt => (
                <label key={opt} className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    required 
                    name={q.QuestionID} 
                    value={opt}
                    checked={quizAnswers[q.QuestionID] === opt}
                    onChange={(e) => setQuizAnswers({...quizAnswers, [q.QuestionID]: e.target.value})}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">
                    {opt === 'A' ? q.OptionA : opt === 'B' ? q.OptionB : opt === 'C' ? q.OptionC : q.OptionD}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setActiveQuiz('none')} className="px-4 py-2 text-gray-600">Batal</button>
          <button type="submit" disabled={actionLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">{actionLoading ? 'Menyimpan...' : 'Kirim Jawaban'}</button>
        </div>
      </form>
    );
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.Judul}</h1>
        <p className="text-gray-500">Tanggal: {formatDateIndonesian(event.TanggalMulai)} s/d {formatDateIndonesian(event.TanggalSelesai)}</p>
        {event.TanggalPelaksanaan && (
          <p className="text-gray-500">Tanggal Pelaksanaan / Pemeriksaan: {formatDateIndonesian(event.TanggalPelaksanaan)}</p>
        )}
      </div>

      <div className="space-y-4">
        {/* Step 1: Attendance */}
        <div className={`p-5 border rounded-xl flex items-center justify-between transition ${hasAttended ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-4">
            {hasAttended ? <CheckCircle className="text-green-600" /> : <Circle className="text-gray-300" />}
            <div>
              <h3 className={`font-bold ${hasAttended ? 'text-green-900' : 'text-gray-900'}`}>1. Absensi Kehadiran</h3>
              <p className="text-sm text-gray-500">Isi daftar hadir untuk membuka akses Pre-Test.</p>
            </div>
          </div>
          {!hasAttended && (
            <button onClick={handleAttend} disabled={actionLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {actionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Hadir'}
            </button>
          )}
        </div>

        {/* Step 2: Pre-Test */}
        <div className={`p-5 border rounded-xl transition ${!hasAttended ? 'opacity-50 pointer-events-none bg-gray-50' : hasPreTest ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {hasPreTest ? <CheckCircle className="text-green-600" /> : <Circle className="text-gray-300" />}
              <div>
                <h3 className="font-bold text-gray-900">2. Pre-Test</h3>
                <p className="text-sm text-gray-500">Kerjakan soal sebelum materi dimulai.</p>
              </div>
            </div>
            {hasAttended && !hasPreTest && activeQuiz !== 'PRETEST' && (
               <button onClick={() => setActiveQuiz('PRETEST')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">Mulai Tes</button>
            )}
          </div>
          
          {activeQuiz === 'PRETEST' && renderQuizForm('PRETEST')}

          {hasPreTest && <div className="pl-10 text-sm text-green-700 font-medium">Skor Pre-Test Anda: {testData.PreTestScore} / 100</div>}
        </div>

        {/* Step 3: Post-Test */}
        <div className={`p-5 border rounded-xl transition ${!hasPreTest ? 'opacity-50 pointer-events-none bg-gray-50' : isPostTestPass ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {isPostTestPass ? <CheckCircle className="text-green-600" /> : <Circle className="text-gray-300" />}
              <div>
                <h3 className="font-bold text-gray-900">3. Post-Test</h3>
                <p className="text-sm text-gray-500">Kerjakan evaluasi akhir untuk mendapatkan sertifikat (Min. Nilai 70).</p>
              </div>
            </div>
            {hasPreTest && !isPostTestPass && activeQuiz !== 'POSTTEST' && (
               <button onClick={() => setActiveQuiz('POSTTEST')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                 {hasPostTest && !isPostTestPass ? 'Ulangi Post-Test' : 'Mulai Tes'}
               </button>
            )}
          </div>

          {activeQuiz === 'POSTTEST' && renderQuizForm('POSTTEST')}

          {hasPostTest && !isPostTestPass && activeQuiz !== 'POSTTEST' && (
             <div className="pl-10 text-sm text-red-600 font-medium">Skor terakhir Anda: {testData.PostTestScore} / 100. Anda Belum Lulus.</div>
          )}
          {isPostTestPass && (
             <div className="pl-10 text-sm text-green-700 font-medium">Skor Post-Test Anda: {testData.PostTestScore} / 100 (LULUS)</div>
          )}
        </div>

        {/* Step 4: Certificate */}
        <div className={`p-5 border rounded-xl transition flex justify-between items-center ${!isPostTestPass ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white border-blue-200 shadow-sm'}`}>
          <div className="flex items-center gap-4">
            {isPostTestPass ? <CheckCircle className="text-blue-600" /> : <Circle className="text-gray-300" />}
            <div>
              <h3 className="font-bold text-gray-900">4. Unduh Sertifikat</h3>
              <p className="text-sm text-gray-500">Sertifikat Anda telah siap.</p>
            </div>
          </div>
          {isPostTestPass && (
             <button onClick={handleDownloadCertificate} disabled={actionLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700">
               <Download size={18} /> {actionLoading ? 'Memproses...' : 'Unduh'}
             </button>
          )}
        </div>
      </div>

      {/* Hidden Certificate Template for PDF Generation */}
      {isPostTestPass && (
        <div className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none opacity-0 flex flex-col gap-10">
          <div ref={certRef} className={`w-[800px] h-[565px] bg-white relative flex flex-col items-center shrink-0 ${!backgroundImageUrl ? 'border-[10px] border-double border-blue-900 justify-center' : ''}`}>
            
            {/* Background Template Image */}
            {backgroundImageUrl && (
              <img src={backgroundImageUrl.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(backgroundImageUrl)}` : backgroundImageUrl} crossOrigin="anonymous" alt="Template" className="absolute inset-0 w-full h-full object-cover z-0" />
            )}

            {/* Fallback styling if no template image */}
            {!backgroundImageUrl && (
              <div className="absolute inset-0 bg-blue-50 opacity-50 z-0"></div>
            )}
            
            {backgroundImageUrl ? (
              <div className="absolute inset-0 z-10">
                {/* Name */}
                <div className="absolute top-[265px] left-1/2 -translate-x-1/2 w-[580px] h-[70px] flex justify-center items-center">
                  <h2 className={`${user.Nama.length > 35 ? 'text-[28px]' : user.Nama.length > 25 ? 'text-[34px]' : 'text-[42px]'} font-bold text-black leading-none text-center`} style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive' }}>{user.Nama}</h2>
                </div>
                
                {/* QR Code */}
                <div className="absolute top-[305px] right-[85px] flex flex-col items-center bg-white p-1 rounded-sm shadow-sm">
                  <QRCodeCanvas value={validationUrl} size={48} level="M" fgColor="#000000" />
                  <p className="text-[6px] mt-0.5 text-black font-bold whitespace-nowrap">{certificate.CertNumber}</p>
                </div>

                {/* Health Status */}
                <div className="absolute top-[362px] left-1/2 -translate-x-1/2 w-[400px] text-center flex justify-center">
                  <h4 className="text-[22px] font-bold text-white uppercase tracking-widest mt-0.5">
                    {healthStatus === 'Laik' ? 'SEHAT / LAIK SEHAT' : healthStatus}
                  </h4>
                </div>

                {/* Date */}
                <div className="absolute top-[402px] left-[450px]">
                  <p className="text-[14px] text-black font-bold">{formatDateIndonesian(event.TanggalPelaksanaan || event.TanggalMulai)}</p>
                </div>

                {/* Signatures */}
                <div className="absolute bottom-[40px] w-full px-20 flex justify-between">
                  <div className="text-center w-56 flex flex-col items-center pl-8">
                    {event.TTD1_Nama && (
                      <div className="w-max px-2">
                        <p className="font-bold text-[12px] text-black">{event.TTD1_Nama}</p>
                      </div>
                    )}
                    {event.TTD1_NIP && <p className="text-[10px] text-black font-medium">{event.TTD1_NIP}</p>}
                  </div>

                  <div className="text-center w-64 flex flex-col items-center pr-4">
                    {event.TTD2_Nama && (
                      <div className="w-max px-2">
                        <p className="font-bold text-[12px] text-black">{event.TTD2_Nama}</p>
                      </div>
                    )}
                    {event.TTD2_NIP && <p className="text-[10px] text-black font-medium">{event.TTD2_NIP}</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="z-10 w-full h-full flex flex-col items-center relative p-6">
                <h1 className="text-5xl font-serif font-bold text-[#1a5b57] mb-2 uppercase tracking-widest mt-12">SERTIFIKAT</h1>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-16 h-px bg-[#1a5b57]"></div>
                  <h2 className="text-lg font-bold text-[#1a5b57] uppercase tracking-wider">{event.Judul}</h2>
                  <div className="w-16 h-px bg-[#1a5b57]"></div>
                </div>
                
                {event.Tema && (
                  <div className="bg-[#1a5b57] text-white px-10 py-1.5 mb-6 shadow-md rounded-sm flex items-center gap-2">
                    <span className="text-green-300">🌿</span>
                    <h3 className="text-xl font-bold tracking-wider">{event.Tema}</h3>
                    <span className="text-green-300">🌿</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-2 mt-2">
                  <span className="text-[#1a5b57] font-bold text-lg">➔</span>
                  <p className="text-[#1a5b57] font-bold text-sm tracking-widest uppercase">Diberikan Kepada</p>
                  <span className="text-[#1a5b57] font-bold text-lg">⬅</span>
                </div>
                
                <div className="relative inline-block mb-2 mt-1">
                   <h2 className="text-3xl font-bold text-black font-serif px-12 pb-1 inline-block border-b-2 border-gray-300">{user.Nama}</h2>
                   <div className="absolute left-full top-1/2 -translate-y-1/2 ml-6 flex flex-col items-center bg-white p-1 rounded-sm shadow-sm">
                     <QRCodeCanvas value={validationUrl} size={64} level="M" fgColor="#000000" />
                     <p className="text-[7px] mt-1 text-black font-bold whitespace-nowrap">{certificate.CertNumber}</p>
                   </div>
                </div>
                
                <p className="text-xs text-center text-gray-800 max-w-lg mb-4 mt-2 leading-relaxed font-medium">
                  Berdasarkan hasil pemeriksaan Medical Check Up yang telah dilakukan<br/>
                  di Puskesmas Kalitengah, yang bersangkutan dinyatakan:
                </p>
                
                <div className="bg-[#1a5b57] text-white px-12 py-1.5 rounded-sm shadow-md flex items-center gap-3 mb-4">
                  <span className="text-green-300">🌿</span>
                  <h4 className="text-2xl font-bold uppercase tracking-wider">{healthStatus === 'Laik' ? 'SEHAT / LAIK SEHAT' : healthStatus}</h4>
                  <span className="text-green-300">🌿</span>
                </div>
                
                <p className="text-xs text-gray-800 font-bold mb-4">
                  Tanggal Pemeriksaan : <span className="border-b border-gray-400 pb-0.5 px-4">{formatDateIndonesian(event.TanggalPelaksanaan || event.TanggalMulai)}</span>
                </p>
                
                <div className="flex justify-between w-full px-16 mt-auto pb-6">
                  <div className="text-center w-56 flex flex-col items-center">
                    <p className="text-xs text-[#1a5b57] mb-12 font-bold">Dokter Pemeriksa</p>
                    {event.TTD1_Nama ? (
                      <div className="border-b border-gray-900 pb-0.5 mb-0.5 w-max px-4">
                        <p className="font-bold text-xs text-gray-900">{event.TTD1_Nama}</p>
                      </div>
                    ) : (
                      <div className="border-b border-gray-900 pb-0.5 mb-0.5 h-4 w-32"></div>
                    )}
                    {event.TTD1_NIP && <p className="text-[10px] text-gray-900 font-medium">{event.TTD1_NIP}</p>}
                  </div>

                  <div className="text-center w-64 flex flex-col items-center">
                    <p className="text-xs text-[#1a5b57] mb-12 font-bold">Mengetahui,<br/>Kepala Puskesmas Kalitengah</p>
                    {event.TTD2_Nama ? (
                      <div className="border-b border-gray-900 pb-0.5 mb-0.5 w-max px-4">
                        <p className="font-bold text-xs text-gray-900">{event.TTD2_Nama}</p>
                      </div>
                    ) : (
                      <div className="border-b border-gray-900 pb-0.5 mb-0.5 h-4 w-40"></div>
                    )}
                    {event.TTD2_NIP && <p className="text-[10px] text-gray-900 font-medium">{event.TTD2_NIP}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Certificate Page 2: Health Details */}
          {healthDetails && (
            <div ref={certPage2Ref} className="w-[800px] h-[565px] bg-white relative flex flex-col items-center justify-center p-12 text-center shrink-0 border-[10px] border-double border-blue-900" style={{
              backgroundImage: 'none',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}>
              <div className="absolute inset-0 bg-blue-50 opacity-50 z-0"></div>
              <div className="z-10 bg-white/90 p-8 w-[85%] h-full flex flex-col relative rounded-md shadow-sm border border-gray-100">
                <h2 className="text-2xl font-serif font-bold text-[#1a5b57] mb-6 uppercase tracking-widest text-center border-b border-gray-300 pb-4">
                  Hasil Pemeriksaan Kesehatan
                </h2>
                
                <div className="flex-1 space-y-6 text-left">
                  <div>
                    <h3 className="font-bold text-[#1a5b57] mb-3 bg-[#e8f1f0] px-4 py-2 rounded">Pemeriksaan Dasar</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-4">
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-600">Berat Badan (BB)</span>
                        <span className="font-semibold text-gray-800">{healthDetails.BB || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-600">Tinggi Badan (TB)</span>
                        <span className="font-semibold text-gray-800">{healthDetails.TB || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-600">Tekanan Darah</span>
                        <span className="font-semibold text-gray-800">{healthDetails.TekananDarah || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-600">Gula Darah Acak (GDA)</span>
                        <span className="font-semibold text-gray-800">{healthDetails.GDA || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 pb-1 col-span-2">
                        <span className="text-gray-600">Skrining TB</span>
                        <span className="font-semibold text-gray-800">{healthDetails.SkriningTB || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-[#1a5b57] mb-3 bg-[#e8f1f0] px-4 py-2 rounded">Pemeriksaan Penyakit Menular</h3>
                    <div className="px-4">
                      <div className="flex justify-between border-b border-gray-100 pb-1 max-w-sm">
                        <span className="text-gray-600">HBsAg</span>
                        <span className="font-semibold text-gray-800">{healthDetails.HBsAg || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto text-center text-sm text-gray-500 pt-4 border-t">
                  Dokumen ini merupakan lampiran resmi dari Sertifikat Utama.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
