import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSheetData, appendSheetData } from '../../lib/api';
import { CheckCircle, Circle, Download, Loader2, Eye, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { parseCertConfig } from '../../lib/certConfig';

export default function EventDetail() {
  const { eventId } = useParams();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [base64Template, setBase64Template] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPageTab, setPreviewPageTab] = useState<'page1' | 'page2'>('page1');
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
        try {
          const response = await fetch(proxiedUrl);
          if (!response.ok) throw new Error('Gagal mengambil template sertifikat dari proxy');
          
          if (proxiedUrl.includes('/api/proxy-image')) {
            const data = await response.json();
            if (data.base64) {
              setBase64Template(data.base64);
            } else {
              throw new Error(data.error || 'Base64 tidak ditemukan');
            }
          } else {
            // Fallback if not using proxy (e.g. local image)
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            setBase64Template(base64);
          }
        } catch (e: any) {
          console.error("Failed to load background image:", e);
          alert("Peringatan: Gagal memuat background template sertifikat. (" + e.message + ")");
        }
      }

      // Allow browser a moment to ensure images (like QR code and template) are fully rendered in the hidden div
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas1 = await html2canvas(certRef.current, { 
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: 1123,
        height: 794,
        windowWidth: 1200,
        windowHeight: 900,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
      });
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.98);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      // 297mm x 210mm is exact standard A4 landscape
      pdf.addImage(imgData1, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

      if (certPage2Ref.current) {
        const canvas2 = await html2canvas(certPage2Ref.current, { 
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          width: 1123,
          height: 794,
          windowWidth: 1200,
          windowHeight: 900,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.98);
        pdf.addPage('a4', 'l');
        pdf.addImage(imgData2, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      }

      pdf.save(`Sertifikat_${(event.Judul || 'Kegiatan').replace(/[^a-zA-Z0-9]/g, '_')}_${(user.Nama || 'Peserta').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Gagal generate PDF");
    } finally {
      setActionLoading(false);
      setBase64Template(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} /></div>;
  if (!event || !reg) return <div className="text-center p-12">Data tidak ditemukan.</div>;

  const certConfig = parseCertConfig(event?.TTD_LayoutConfig, event?.Judul);
  const hasAttended = !!attendance;
  const hasPreTest = testData?.PreTestScore !== undefined && testData?.PreTestScore !== '';
  const hasPostTest = testData?.PostTestScore !== undefined && testData?.PostTestScore !== '';
  const isPostTestPass = testData?.IsCompleted === 'TRUE';

  // Back page / Assessment Criteria evaluation
  const hasPage2 = certConfig.showHalaman2 || !!healthDetails;

  const assessmentCriteriaList: { no: number; nama: string; hasil: string }[] = (() => {
    if (certConfig.kriteriaPenilaian && certConfig.kriteriaPenilaian.length > 0) {
      return certConfig.kriteriaPenilaian.map((item, idx) => {
        let dynamicResult = item.hasil;
        if (healthDetails) {
          const lower = (item.nama || '').toLowerCase();
          if (lower.includes('tekanan darah') && healthDetails.TekananDarah) {
            dynamicResult = `${healthDetails.TekananDarah} ${item.hasil ? `(${item.hasil})` : ''}`.trim();
          } else if (lower.includes('gula darah') && healthDetails.GDA) {
            dynamicResult = `${healthDetails.GDA} mg/dL`;
          } else if (lower.includes('tb') && healthDetails.SkriningTB) {
            dynamicResult = healthDetails.SkriningTB;
          } else if (lower.includes('hbsag') && healthDetails.HBsAg) {
            dynamicResult = healthDetails.HBsAg;
          } else if (lower.includes('berat') && healthDetails.BB) {
            dynamicResult = `${healthDetails.BB} kg`;
          } else if (lower.includes('tinggi') && healthDetails.TB) {
            dynamicResult = `${healthDetails.TB} cm`;
          }
        }
        return {
          no: idx + 1,
          nama: item.nama || `Kriteria ${idx + 1}`,
          hasil: dynamicResult || 'Sesuai Standar'
        };
      });
    }

    if (healthDetails) {
      return [
        { no: 1, nama: 'Berat Badan (BB)', hasil: healthDetails.BB ? `${healthDetails.BB} kg` : '-' },
        { no: 2, nama: 'Tinggi Badan (TB)', hasil: healthDetails.TB ? `${healthDetails.TB} cm` : '-' },
        { no: 3, nama: 'Tekanan Darah', hasil: healthDetails.TekananDarah || '-' },
        { no: 4, nama: 'Gula Darah Acak (GDA)', hasil: healthDetails.GDA ? `${healthDetails.GDA} mg/dL` : '-' },
        { no: 5, nama: 'Skrining TB Paru', hasil: healthDetails.SkriningTB || '-' },
        { no: 6, nama: 'Pemeriksaan HBsAg', hasil: healthDetails.HBsAg || '-' },
        { no: 7, nama: 'Status Penilaian Kesehatan', hasil: healthDetails.Status || 'Laik' }
      ];
    }

    return [
      { no: 1, nama: 'Tingkat Kehadiran & Partisipasi', hasil: 'Hadir 100%' },
      { no: 2, nama: 'Evaluasi Pemahaman Materi (Post-Test)', hasil: testData?.PostTestScore ? `${testData.PostTestScore} / 100 (Lulus)` : 'Lulus' },
      { no: 3, nama: 'Hasil Penilaian Akhir', hasil: 'Kompeten / Selesai' }
    ];
  })();

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
          <button type="button" onClick={() => setActiveQuiz('none')} className="px-4 py-2 text-gray-600 text-xl">Batal</button>
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
        <div className={`p-5 border rounded-xl transition flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${!isPostTestPass ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white border-blue-200 shadow-sm'}`}>
          <div className="flex items-center gap-4">
            {isPostTestPass ? <CheckCircle className="text-blue-600 shrink-0" /> : <Circle className="text-gray-300 shrink-0" />}
            <div>
              <h3 className="font-bold text-gray-900">4. Unduh Sertifikat (Format A4)</h3>
              <p className="text-sm text-gray-500">Sertifikat Anda telah siap dalam format A4 standar resmi.</p>
            </div>
          </div>
          {isPostTestPass && (
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setShowPreviewModal(true)} 
                className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-200 transition text-sm"
              >
                <Eye size={18} /> Pratinjau
              </button>
              <button 
                onClick={handleDownloadCertificate} 
                disabled={actionLoading} 
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition shadow-sm text-sm"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                {actionLoading ? 'Memproses PDF A4...' : 'Unduh Sertifikat A4'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Pratinjau Sertifikat (Format A4 Landscape)</h3>
                <p className="text-xs text-gray-500">Sertifikat akan diunduh dalam dimensi presisi standar A4 (297 × 210 mm) tanpa terpotong.</p>
              </div>
              <div className="flex items-center gap-3">
                {hasPage2 && (
                  <div className="flex bg-gray-200 p-0.5 rounded-lg text-xs font-semibold">
                    <button 
                      type="button"
                      onClick={() => setPreviewPageTab('page1')}
                      className={`px-3 py-1.5 rounded-md transition ${previewPageTab === 'page1' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Halaman 1 (Depan)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPreviewPageTab('page2')}
                      className={`px-3 py-1.5 rounded-md transition ${previewPageTab === 'page2' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Halaman 2 (Kriteria Penilaian)
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-200 transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-100 flex flex-col items-center">
              {previewPageTab === 'page1' ? (
                /* Scaled Preview Frame maintaining 1123:794 (A4) aspect ratio - PAGE 1 */
                <div className="w-full max-w-3xl bg-white shadow-lg rounded-sm overflow-hidden border border-gray-300 relative aspect-[1123/794]">
                  {backgroundImageUrl ? (
                    <img 
                      src={backgroundImageUrl} 
                      alt="Certificate Template" 
                      className={`absolute inset-0 w-full h-full ${
                        certConfig.bgFit === 'contain' ? 'object-contain' : 
                        certConfig.bgFit === 'cover' ? 'object-cover' : 'object-fill'
                      }`}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-blue-50/50"></div>
                  )}

                  {/* Overlaid preview elements proportional */}
                  <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                    {certConfig.showJudul && event.Judul && (
                      <div 
                        className={`absolute w-full px-8 ${
                          certConfig.judulAlign === 'left' ? 'text-left pl-12' : 
                          certConfig.judulAlign === 'right' ? 'text-right pr-12' : 'text-center'
                        }`}
                        style={{ top: `${(certConfig.judulTop / 794) * 100}%` }}
                      >
                        <h2 className="text-xs sm:text-sm md:text-base font-serif font-bold text-gray-900 uppercase">
                          {event.Judul}
                        </h2>
                      </div>
                    )}

                    {certConfig.showTema && event.Tema && (
                      <div 
                        className={`absolute w-full px-8 ${
                          certConfig.temaAlign === 'left' ? 'text-left pl-12' : 
                          certConfig.temaAlign === 'right' ? 'text-right pr-12' : 'text-center'
                        }`}
                        style={{ top: `${(certConfig.temaTop / 794) * 100}%` }}
                      >
                        <p className="text-[10px] sm:text-xs text-gray-800 italic">
                          "{event.Tema}"
                        </p>
                      </div>
                    )}

                    <div 
                      className="absolute w-full text-center"
                      style={{ top: `${(365 / 794) * 100}%` }}
                    >
                      <h1 
                        className="text-lg sm:text-2xl md:text-3xl font-bold text-black"
                        style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive' }}
                      >
                        {user.Nama}
                      </h1>
                    </div>

                    <div 
                      className="absolute right-8 flex flex-col items-center bg-white p-1 rounded shadow-sm border"
                      style={{ top: `${(425 / 794) * 100}%` }}
                    >
                      <QRCodeCanvas value={validationUrl} size={36} level="M" fgColor="#000000" />
                      <span className="text-[6px] font-bold text-black">{certificate?.CertNumber || 'CERT-PREVIEW'}</span>
                    </div>

                    {certConfig.showTanggal && (
                      <div 
                        className={`absolute w-full px-8 ${
                          certConfig.tanggalAlign === 'left' ? 'text-left pl-12' : 
                          certConfig.tanggalAlign === 'right' ? 'text-right pr-12' : 'text-center'
                        }`}
                        style={{ top: `${(certConfig.tanggalTop / 794) * 100}%` }}
                      >
                        <span className="text-[9px] sm:text-[11px] font-semibold text-gray-900">
                          {formatDateIndonesian(event.TanggalPelaksanaan || event.TanggalMulai)}
                        </span>
                      </div>
                    )}

                    {certConfig.showTTD && (
                      <div 
                        className={`absolute w-full px-12 flex ${
                          certConfig.layout === 'Tengah' ? 'justify-center' :
                          certConfig.layout === 'Kanan' ? 'justify-end' :
                          certConfig.layout === 'Kiri' ? 'justify-start' :
                          'justify-between'
                        }`}
                        style={{ bottom: `${(certConfig.ttdBottom / 794) * 100}%` }}
                      >
                        {(certConfig.layout === 'Kiri' || certConfig.layout === 'Kiri-Kanan') && (
                          <div className="text-center text-[8px] sm:text-[10px]">
                            <p className="font-bold text-gray-900 border-b border-black pb-0.5">{event.TTD1_Nama || 'Penandatangan 1'}</p>
                            {event.TTD1_NIP && <p className="text-gray-700">{event.TTD1_NIP}</p>}
                          </div>
                        )}

                        {certConfig.layout === 'Tengah' && (
                          <div className="text-center text-[8px] sm:text-[10px]">
                            <p className="font-bold text-gray-900 border-b border-black pb-0.5">{event.TTD1_Nama || event.TTD2_Nama || 'Penandatangan'}</p>
                            {(event.TTD1_NIP || event.TTD2_NIP) && <p className="text-gray-700">{event.TTD1_NIP || event.TTD2_NIP}</p>}
                          </div>
                        )}

                        {(certConfig.layout === 'Kanan' || certConfig.layout === 'Kiri-Kanan') && (
                          <div className="text-center text-[8px] sm:text-[10px]">
                            <p className="font-bold text-gray-900 border-b border-black pb-0.5">{event.TTD2_Nama || 'Penandatangan 2'}</p>
                            {event.TTD2_NIP && <p className="text-gray-700">{event.TTD2_NIP}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Scaled Preview Frame maintaining 1123:794 (A4) aspect ratio - PAGE 2 */
                <div className="w-full max-w-3xl bg-white shadow-lg rounded-sm overflow-hidden border-4 border-double border-blue-900 relative aspect-[1123/794] flex flex-col items-center justify-center p-3 sm:p-5 text-center">
                  <div className="w-full h-full flex flex-col items-center justify-between bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-xs">
                    <div className="w-full text-center">
                      <h3 className="text-xs sm:text-sm font-serif font-bold text-blue-950 uppercase tracking-wide border-b border-blue-900 pb-1">
                        {certConfig.judulHalaman2 || 'HASIL PEMERIKSAAN KESEHATAN / KRITERIA PENILAIAN'}
                      </h3>
                      <p className="text-[8px] sm:text-[9px] text-gray-500 mt-0.5">
                        Lampiran Resmi Kegiatan: <strong>{event.Judul}</strong>
                      </p>
                    </div>

                    <div className="w-full bg-blue-50/80 border border-blue-100 rounded py-1 px-3 flex justify-between items-center text-[8px] sm:text-[9px]">
                      <div><span className="text-gray-500">Nama:</span> <strong className="text-blue-950">{user.Nama}</strong></div>
                      <div><span className="text-gray-500">No. Sertifikat:</span> <strong className="text-gray-800">{certificate?.CertNumber || `CERT-${reg?.RegID || 'PREVIEW'}`}</strong></div>
                      <div><span className="text-gray-500">Tanggal:</span> <strong className="text-gray-800">{formatDateIndonesian(event.TanggalPelaksanaan || event.TanggalMulai)}</strong></div>
                    </div>

                    <div className="w-full border border-gray-200 rounded overflow-hidden my-auto max-h-[52%] overflow-y-auto">
                      <table className="w-full text-left text-[8px] sm:text-[9px]">
                        <thead className="bg-blue-900 text-white font-semibold sticky top-0">
                          <tr>
                            <th className="py-1 px-2 text-center w-8">NO</th>
                            <th className="py-1 px-3">KRITERIA PENILAIAN / PARAMETER</th>
                            <th className="py-1 px-3 text-center w-36">HASIL / KETERANGAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {assessmentCriteriaList.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-1 px-2 text-center text-gray-500 font-bold">{item.no}</td>
                              <td className="py-1 px-3 font-medium text-gray-800">{item.nama}</td>
                              <td className="py-1 px-3 text-center font-semibold text-emerald-700">
                                <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[8px]">
                                  {item.hasil}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="w-full border-t pt-1 flex justify-between items-end text-[7px] sm:text-[8px] text-gray-500">
                      <span>Dokumen Elektronik Resmi • Lampiran Sah</span>
                      {certConfig.showTTD && (
                        <div className="text-right">
                          <p className="font-bold text-gray-800">{event.TTD1_Nama || event.TTD2_Nama || 'Pemeriksa'}</p>
                          <p>{event.TTD1_NIP || event.TTD2_NIP || ''}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end items-center gap-3">
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium text-sm transition"
              >
                Tutup
              </button>
              <button 
                onClick={() => {
                  setShowPreviewModal(false);
                  handleDownloadCertificate();
                }}
                disabled={actionLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <Download size={16} /> Unduh Sekarang (A4{hasPage2 ? ' • 2 Halaman' : ''})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Certificate Template for High-Res PDF Generation (Exact A4 Landscape 1123 x 794 px) */}
      {isPostTestPass && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -100 }} aria-hidden="true">
          <div 
            ref={certRef} 
            style={{ width: '1123px', height: '794px' }} 
            className={`bg-white relative flex flex-col items-center shrink-0 overflow-hidden ${!backgroundImageUrl ? 'border-[10px] border-double border-blue-900 justify-center' : ''}`}
          >
            {/* Background Template Image */}
            {backgroundImageUrl && (
              <img 
                src={base64Template || (backgroundImageUrl.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(backgroundImageUrl)}` : backgroundImageUrl)} 
                crossOrigin="anonymous" 
                alt="Template" 
                className={`absolute inset-0 w-full h-full z-0 ${
                  certConfig.bgFit === 'contain' ? 'object-contain' : 
                  certConfig.bgFit === 'cover' ? 'object-cover' : 'object-fill'
                }`} 
              />
            )}

            {/* Fallback styling if no template image */}
            {!backgroundImageUrl && (
              <div className="absolute inset-0 bg-blue-50 opacity-50 z-0"></div>
            )}
            
            {backgroundImageUrl ? (
              <div className="absolute inset-0 z-10">
                {/* Judul Kegiatan */}
                {certConfig.showJudul && event.Judul && (
                  <div 
                    className={`absolute w-[880px] z-10 ${
                      certConfig.judulAlign === 'left' ? 'left-[120px] text-left' : 
                      certConfig.judulAlign === 'right' ? 'right-[120px] text-right' : 
                      'left-1/2 -translate-x-1/2 text-center'
                    }`}
                    style={{ top: `${certConfig.judulTop || 210}px` }}
                  >
                    <h1 className="text-[26px] font-serif font-bold text-gray-900 tracking-wide uppercase leading-tight drop-shadow-sm">
                      {event.Judul}
                    </h1>
                  </div>
                )}

                {/* Tema Kegiatan */}
                {certConfig.showTema && event.Tema && (
                  <div 
                    className={`absolute w-[880px] z-10 ${
                      certConfig.temaAlign === 'left' ? 'left-[120px] text-left' : 
                      certConfig.temaAlign === 'right' ? 'right-[120px] text-right' : 
                      'left-1/2 -translate-x-1/2 text-center'
                    }`}
                    style={{ top: `${certConfig.temaTop || 265}px` }}
                  >
                    <h3 className="text-[17px] font-sans font-medium text-gray-800 italic leading-snug">
                      "{event.Tema}"
                    </h3>
                  </div>
                )}

                {/* Nama Peserta */}
                <div className="absolute top-[365px] left-1/2 -translate-x-1/2 w-[850px] flex justify-center items-center z-10">
                  <h2 className={`${user.Nama?.length > 35 ? 'text-[38px]' : user.Nama?.length > 25 ? 'text-[46px]' : 'text-[54px]'} font-bold text-black leading-none text-center`} style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive' }}>
                    {user.Nama}
                  </h2>
                </div>
                
                {/* QR Code & Cert Number */}
                <div className="absolute top-[425px] right-[115px] flex flex-col items-center bg-white p-1 rounded-sm shadow-sm border border-gray-100 z-10">
                  <QRCodeCanvas value={validationUrl} size={65} level="M" fgColor="#000000" />
                  <p className="text-[8px] mt-0.5 text-black font-bold whitespace-nowrap">{certificate?.CertNumber || ''}</p>
                </div>

                {/* Health Status (If MCU / Health Assessment done) */}
                {healthDetails && healthStatus !== 'Belum Dinilai' && (
                  <div className="absolute top-[505px] left-1/2 -translate-x-1/2 w-[560px] text-center flex justify-center z-10">
                    <h4 className="text-[28px] font-bold text-white uppercase tracking-widest bg-emerald-800/85 px-6 py-0.5 rounded shadow-sm">
                      {healthStatus === 'Laik' ? 'SEHAT / LAIK SEHAT' : healthStatus}
                    </h4>
                  </div>
                )}

                {/* Tanggal Pelaksanaan */}
                {certConfig.showTanggal && (
                  <div 
                    className={`absolute z-10 ${
                      certConfig.tanggalAlign === 'left' ? 'left-[120px] text-left' :
                      certConfig.tanggalAlign === 'right' ? 'right-[120px] text-right' :
                      'left-1/2 -translate-x-1/2 text-center w-full'
                    }`}
                    style={{ top: `${certConfig.tanggalTop || 565}px` }}
                  >
                    <p className="text-[18px] text-black font-semibold">
                      {formatDateIndonesian(event.TanggalPelaksanaan || event.TanggalMulai)}
                    </p>
                  </div>
                )}

                {/* Penandatangan (TTD) */}
                {certConfig.showTTD && (
                  <div 
                    className={`absolute w-full px-[115px] z-10 ${
                      certConfig.layout === 'Tengah' ? 'flex justify-center' :
                      certConfig.layout === 'Kanan' ? 'flex justify-end' :
                      certConfig.layout === 'Kiri' ? 'flex justify-start' :
                      'flex justify-between'
                    }`}
                    style={{ bottom: `${certConfig.ttdBottom || 56}px` }}
                  >
                    {(certConfig.layout === 'Kiri' || certConfig.layout === 'Kiri-Kanan') && (
                      <div className="text-center w-[310px] flex flex-col items-center">
                        {event.TTD1_Nama && (
                          <div className="w-max px-2 border-b border-black pb-0.5">
                            <p className="font-bold text-[16px] text-black">{event.TTD1_Nama}</p>
                          </div>
                        )}
                        {event.TTD1_NIP && <p className="text-[13px] text-black font-medium mt-0.5">{event.TTD1_NIP}</p>}
                      </div>
                    )}

                    {certConfig.layout === 'Tengah' && (
                      <div className="text-center w-[350px] flex flex-col items-center">
                        {(event.TTD1_Nama || event.TTD2_Nama) && (
                          <div className="w-max px-2 border-b border-black pb-0.5">
                            <p className="font-bold text-[16px] text-black">{event.TTD1_Nama || event.TTD2_Nama}</p>
                          </div>
                        )}
                        {(event.TTD1_NIP || event.TTD2_NIP) && (
                          <p className="text-[13px] text-black font-medium mt-0.5">{event.TTD1_NIP || event.TTD2_NIP}</p>
                        )}
                      </div>
                    )}

                    {(certConfig.layout === 'Kanan' || certConfig.layout === 'Kiri-Kanan') && (
                      <div className="text-center w-[320px] flex flex-col items-center">
                        {event.TTD2_Nama && (
                          <div className="w-max px-2 border-b border-black pb-0.5">
                            <p className="font-bold text-[15px] text-black">{event.TTD2_Nama}</p>
                          </div>
                        )}
                        {event.TTD2_NIP && <p className="text-[12px] text-black font-medium mt-0.5">{event.TTD2_NIP}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="z-10 w-full h-full flex flex-col items-center relative p-8">
                <h1 className="text-5xl font-serif font-bold text-[#1a5b57] mb-2 uppercase tracking-widest mt-10">SERTIFIKAT</h1>
                
                {certConfig.showJudul && event.Judul && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-16 h-px bg-[#1a5b57]"></div>
                    <h2 className="text-lg font-bold text-[#1a5b57] uppercase tracking-wider">{event.Judul}</h2>
                    <div className="w-16 h-px bg-[#1a5b57]"></div>
                  </div>
                )}
                
                {certConfig.showTema && event.Tema && (
                  <div className="bg-[#1a5b57] text-white px-10 py-1.5 mb-5 shadow-md rounded-sm flex items-center gap-2">
                    <span className="text-green-300">🌿</span>
                    <h3 className="text-xl font-bold tracking-wider">{event.Tema}</h3>
                    <span className="text-green-300">🌿</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-2 mt-1">
                  <span className="text-[#1a5b57] font-bold text-lg">➔</span>
                  <p className="text-[#1a5b57] font-bold text-sm tracking-widest uppercase">Diberikan Kepada</p>
                  <span className="text-[#1a5b57] font-bold text-lg">⬅</span>
                </div>
                
                <div className="relative inline-block mb-3 mt-1">
                   <h2 className="text-3xl font-bold text-black font-serif px-12 pb-1 inline-block border-b-2 border-gray-300">{user.Nama}</h2>
                   <div className="absolute left-full top-1/2 -translate-y-1/2 ml-6 flex flex-col items-center bg-white p-1 rounded-sm shadow-sm border border-gray-200">
                     <QRCodeCanvas value={validationUrl} size={64} level="M" fgColor="#000000" />
                     <p className="text-[7px] mt-1 text-black font-bold whitespace-nowrap">{certificate?.CertNumber || ''}</p>
                   </div>
                </div>
                
                {healthDetails && healthStatus !== 'Belum Dinilai' && (
                  <>
                    <p className="text-xs text-center text-gray-800 max-w-lg mb-3 mt-1 leading-relaxed font-medium">
                      Berdasarkan hasil pemeriksaan Medical Check Up yang telah dilakukan<br/>
                      di Puskesmas Kalitengah, yang bersangkutan dinyatakan:
                    </p>
                    
                    <div className="bg-[#1a5b57] text-white px-12 py-1.5 rounded-sm shadow-md flex items-center gap-3 mb-3">
                      <span className="text-green-300">🌿</span>
                      <h4 className="text-2xl font-bold uppercase tracking-wider">{healthStatus === 'Laik' ? 'SEHAT / LAIK SEHAT' : healthStatus}</h4>
                      <span className="text-green-300">🌿</span>
                    </div>
                  </>
                )}
                
                {certConfig.showTanggal && (
                  <p className="text-xs text-gray-800 font-bold mb-4">
                    Tanggal Pelaksanaan : <span className="border-b border-gray-400 pb-0.5 px-4">{formatDateIndonesian(event.TanggalPelaksanaan || event.TanggalMulai)}</span>
                  </p>
                )}
                
                {certConfig.showTTD && (
                  <div className={`flex w-full px-16 mt-auto pb-6 ${
                    certConfig.layout === 'Tengah' ? 'justify-center' :
                    certConfig.layout === 'Kanan' ? 'justify-end' :
                    certConfig.layout === 'Kiri' ? 'justify-start' :
                    'justify-between'
                  }`}>
                    {(certConfig.layout === 'Kiri' || certConfig.layout === 'Kiri-Kanan') && (
                      <div className="text-center w-56 flex flex-col items-center">
                        <p className="text-xs text-[#1a5b57] mb-12 font-bold">Dokter Pemeriksa / Penandatangan</p>
                        {event.TTD1_Nama ? (
                          <div className="border-b border-gray-900 pb-0.5 mb-0.5 w-max px-4">
                            <p className="font-bold text-xs text-gray-900">{event.TTD1_Nama}</p>
                          </div>
                        ) : (
                          <div className="border-b border-gray-900 pb-0.5 mb-0.5 h-4 w-32"></div>
                        )}
                        {event.TTD1_NIP && <p className="text-[10px] text-gray-900 font-medium">{event.TTD1_NIP}</p>}
                      </div>
                    )}

                    {certConfig.layout === 'Tengah' && (
                      <div className="text-center w-60 flex flex-col items-center">
                        <p className="text-xs text-[#1a5b57] mb-12 font-bold">Penandatangan</p>
                        {(event.TTD1_Nama || event.TTD2_Nama) ? (
                          <div className="border-b border-gray-900 pb-0.5 mb-0.5 w-max px-4">
                            <p className="font-bold text-xs text-gray-900">{event.TTD1_Nama || event.TTD2_Nama}</p>
                          </div>
                        ) : (
                          <div className="border-b border-gray-900 pb-0.5 mb-0.5 h-4 w-32"></div>
                        )}
                        {(event.TTD1_NIP || event.TTD2_NIP) && <p className="text-[10px] text-gray-900 font-medium">{event.TTD1_NIP || event.TTD2_NIP}</p>}
                      </div>
                    )}

                    {(certConfig.layout === 'Kanan' || certConfig.layout === 'Kiri-Kanan') && (
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
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Certificate Page 2: Assessment Criteria / Hasil Penilaian */}
          {hasPage2 && (
            <div 
              ref={certPage2Ref} 
              style={{ width: '1123px', height: '794px' }} 
              className="bg-white relative flex flex-col items-center justify-center p-10 text-center shrink-0 border-[10px] border-double border-blue-900 overflow-hidden"
            >
              {/* Subtle background tint */}
              <div className="absolute inset-0 bg-slate-50/50 pointer-events-none"></div>

              {/* Centered Certificate Body */}
              <div className="z-10 bg-white p-8 w-[92%] max-h-[92%] flex flex-col items-center justify-center relative rounded-xl shadow-sm border border-gray-300">
                <h2 className="text-3xl font-serif font-bold text-blue-950 uppercase tracking-widest text-center border-b-2 border-blue-900 pb-2.5 w-full">
                  {certConfig.judulHalaman2 || 'HASIL PEMERIKSAAN KESEHATAN / KRITERIA PENILAIAN'}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1 mb-4">
                  Lampiran Resmi Sertifikat Kegiatan: <strong className="text-gray-800">{event.Judul}</strong>
                </p>

                {/* Participant Information Bar - Centered */}
                <div className="w-full bg-blue-50/80 border border-blue-200 rounded-lg py-2.5 px-6 mb-4 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-500">Nama Peserta:</span>{' '}
                    <strong className="text-blue-950 font-bold text-sm">{user.Nama}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">No. Sertifikat:</span>{' '}
                    <strong className="text-gray-800 font-mono font-bold">{certificate?.CertNumber || `CERT-${reg?.RegID || 'PREVIEW'}`}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Tanggal:</span>{' '}
                    <strong className="text-gray-800 font-semibold">{formatDateIndonesian(event.TanggalPelaksanaan || event.TanggalMulai)}</strong>
                  </div>
                </div>

                {/* Centered Criteria Table */}
                <div className="w-full border border-gray-300 rounded-lg overflow-hidden shadow-xs mb-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-900 text-white font-semibold">
                        <th className="py-2.5 px-4 text-center w-14 border-r border-blue-800">NO</th>
                        <th className="py-2.5 px-6 border-r border-blue-800">KRITERIA PENILAIAN / PARAMETER PEMERIKSAAN</th>
                        <th className="py-2.5 px-6 text-center w-72">HASIL / KETERANGAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {assessmentCriteriaList.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                          <td className="py-2.5 px-4 text-center font-bold text-gray-600 border-r border-gray-200">{item.no}</td>
                          <td className="py-2.5 px-6 font-medium text-gray-900 border-r border-gray-200">{item.nama}</td>
                          <td className="py-2.5 px-6 text-center font-bold text-emerald-800">
                            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                              {item.hasil}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Signatures if showTTD */}
                {certConfig.showTTD && (
                  <div className={`w-full px-8 pt-2 flex text-xs text-gray-800 ${
                    certConfig.layout === 'Tengah' ? 'justify-center' :
                    certConfig.layout === 'Kanan' ? 'justify-end' :
                    certConfig.layout === 'Kiri' ? 'justify-start' :
                    'justify-between'
                  }`}>
                    {(certConfig.layout === 'Kiri' || certConfig.layout === 'Kiri-Kanan') && (
                      <div className="text-center w-52">
                        <p className="text-[11px] text-gray-500 mb-8">Pemeriksa / Penanggung Jawab,</p>
                        <p className="font-bold border-b border-gray-900 pb-0.5">{event.TTD1_Nama || 'Penanggung Jawab 1'}</p>
                        {event.TTD1_NIP && <p className="text-[10px] text-gray-600">{event.TTD1_NIP}</p>}
                      </div>
                    )}

                    {certConfig.layout === 'Tengah' && (
                      <div className="text-center w-56">
                        <p className="text-[11px] text-gray-500 mb-8">Pemeriksa / Penanggung Jawab,</p>
                        <p className="font-bold border-b border-gray-900 pb-0.5">{event.TTD1_Nama || event.TTD2_Nama || 'Penanggung Jawab'}</p>
                        {(event.TTD1_NIP || event.TTD2_NIP) && <p className="text-[10px] text-gray-600">{event.TTD1_NIP || event.TTD2_NIP}</p>}
                      </div>
                    )}

                    {(certConfig.layout === 'Kanan' || certConfig.layout === 'Kiri-Kanan') && (
                      <div className="text-center w-52">
                        <p className="text-[11px] text-gray-500 mb-8">Mengetahui / Mengesahkan,</p>
                        <p className="font-bold border-b border-gray-900 pb-0.5">{event.TTD2_Nama || 'Penanggung Jawab 2'}</p>
                        {event.TTD2_NIP && <p className="text-[10px] text-gray-600">{event.TTD2_NIP}</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Note */}
                <div className="mt-3 text-center text-[10px] text-gray-400 border-t border-gray-200 pt-2 w-full">
                  Dokumen ini diterbitkan secara elektronik dan merupakan lampiran resmi yang sah dari Sertifikat Kegiatan.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
