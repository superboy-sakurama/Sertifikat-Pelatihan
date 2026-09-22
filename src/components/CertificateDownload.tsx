import React, { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QRCodeCanvas } from "qrcode.react";

export interface CertificateData {
  namaPeserta: string;
  nomorSertifikat: string;
  judulKegiatan: string;
  tanggalPelaksanaan: string;
  googleDriveImageUrl: string;
  verifikasiUrl: string;
}

interface CertificateDownloadProps {
  data: CertificateData;
  className?: string;
}

export default function CertificateDownload({ data, className = "" }: CertificateDownloadProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  /**
   * Helper: Mengambil template dari API Proxy internal dan mengonversi menjadi Base64
   */
  const fetchImageAsBase64 = async (imageUrl: string): Promise<string> => {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Gagal memuat gambar template: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.base64) {
      return json.base64;
    }

    throw new Error(json.error || "Gagal mengonversi gambar ke Base64");
  };

  /**
   * Fungsi Unduh Sertifikat Presisi A4 Landscape
   */
  const handleDownload = async () => {
    try {
      setLoading(true);

      // 1. Fetch dan siapkan Base64 template jika belum ada
      let currentBase64 = base64Image;
      if (!currentBase64 && data.googleDriveImageUrl) {
        currentBase64 = await fetchImageAsBase64(data.googleDriveImageUrl);
        setBase64Image(currentBase64);
      }

      // Beri sedikit jeda agar DOM ter-render sempurna
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (document.fonts) {
        await document.fonts.ready;
      }

      const element = document.getElementById("certificate-container") || certificateRef.current;
      if (!element) {
        throw new Error("Elemen certificate-container tidak ditemukan.");
      }

      // 2. Render elemen HTML ke Kanvas dengan opsi wajib
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      // 3. Konfigurasi jsPDF untuk kertas A4 Landscape (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: "l",
        unit: "mm",
        format: "a4",
      });

      // Injeksikan hasil kanvas tepat pada koordinat (0, 0) dengan dimensi 297 x 210 mm
      pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);

      // 4. Unduh file PDF
      const sanitizedFileName = `Sertifikat_${data.namaPeserta.replace(/\s+/g, "_")}.pdf`;
      pdf.save(sanitizedFileName);
    } catch (error) {
      console.error("Gagal mengunduh sertifikat:", error);
      alert("Terjadi kesalahan saat menyiapkan dokumen sertifikat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Tombol Unduh dengan Indikator Loading */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={`px-6 py-3 rounded-lg font-semibold text-white transition-all shadow-md flex items-center gap-2 ${
          loading
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 active:scale-95"
        }`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <span>Menyiapkan Dokumen...</span>
          </>
        ) : (
          <span>Unduh Sertifikat (PDF)</span>
        )}
      </button>

      {/* 
        ========================================================================
        STANDARISASI KONTAINER SERTIFIKAT (A4 Landscape: 1123px x 794px)
        Ditempatkan di luar viewport layar (fixed -left-[9999px]) agar tidak 
        mengganggu UI pengguna namun tetap dirender sempurna oleh html2canvas.
        ========================================================================
      */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          id="certificate-container"
          ref={certificateRef}
          className="relative w-[1123px] h-[794px] bg-white overflow-hidden text-gray-900"
          style={{ width: "1123px", height: "794px" }}
        >
          {/* Layer 0: Background Template Image (Base64) */}
          {(base64Image || data.googleDriveImageUrl) && (
            <img
              src={base64Image || (data.googleDriveImageUrl.startsWith("http") ? `/api/proxy-image?url=${encodeURIComponent(data.googleDriveImageUrl)}` : data.googleDriveImageUrl)}
              alt="Template Sertifikat"
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
          )}

          {/* Layer 10: Konten Dinamis di atas Template Background */}

          {/* 1. Judul / Tema Kegiatan */}
          {data.judulKegiatan && (
            <div className="absolute top-[215px] left-0 w-full text-center z-10 px-12">
              <h2 className="text-xl font-bold uppercase tracking-wider text-gray-800">
                {data.judulKegiatan}
              </h2>
            </div>
          )}

          {/* 2. Nama Peserta (Tepat di bawah DIBERIKAN KEPADA) */}
          <div className="absolute top-[396px] left-0 w-full flex justify-center items-center z-10 px-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-950 font-serif tracking-wide text-center">
              {data.namaPeserta}
            </h1>
          </div>

          {/* 3. QR Code & Nomor Sertifikat (Di sebelah kiri cluster ikon hexagon) */}
          <div className="absolute top-[418px] left-[892px] w-[86px] z-10 flex flex-col items-center bg-white p-1 rounded border border-gray-200 shadow-sm">
            <QRCodeCanvas
              value={data.verifikasiUrl}
              size={70}
              level="M"
              fgColor="#000000"
            />
            <span className="text-[8.5px] font-mono font-bold text-black mt-1 text-center leading-none">
              {data.nomorSertifikat}
            </span>
          </div>

          {/* 4. Tanggal Pelaksanaan (Di sebelah kanan Tanggal Pemeriksaan :) */}
          <div className="absolute top-[562px] left-[518px] w-[300px] text-left z-10">
            <p className="text-[15px] font-semibold text-gray-900 font-sans">
              {data.tanggalPelaksanaan}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
