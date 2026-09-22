export interface AssessmentCriterion {
  id: string;
  nama: string;
  hasil: string;
}

export interface CertificateConfig {
  layout: 'Kiri' | 'Tengah' | 'Kanan' | 'Kiri-Kanan';
  showJudul: boolean;
  showTema: boolean;
  showTanggal: boolean;
  showTTD: boolean;
  judulAlign: 'center' | 'left' | 'right';
  judulTop: number; // in px on 1123x794 A4 canvas
  temaAlign: 'center' | 'left' | 'right';
  temaTop: number;
  tanggalAlign: 'center' | 'left' | 'right';
  tanggalTop: number;
  ttdBottom: number;
  bgFit: 'contain' | 'cover' | 'fill';
  // Halaman 2 (Belakang)
  showHalaman2: boolean;
  judulHalaman2: string;
  kriteriaPenilaian: AssessmentCriterion[];
}

export const DEFAULT_CERT_CONFIG: CertificateConfig = {
  layout: 'Kiri-Kanan',
  showJudul: true,
  showTema: true,
  showTanggal: true,
  showTTD: true,
  judulAlign: 'center',
  judulTop: 220,
  temaAlign: 'center',
  temaTop: 275,
  tanggalAlign: 'center',
  tanggalTop: 562,
  ttdBottom: 56,
  bgFit: 'contain',
  showHalaman2: false,
  judulHalaman2: 'Hasil Pemeriksaan Kesehatan / Penilaian',
  kriteriaPenilaian: []
};

export function parseCertConfig(configStr?: string, eventTitle?: string): CertificateConfig {
  const isMCU = eventTitle && (
    eventTitle.toLowerCase().includes('medical check') || 
    eventTitle.toLowerCase().includes('mcu')
  );
  
  const baseConfig: CertificateConfig = {
    ...DEFAULT_CERT_CONFIG,
    // If it's a legacy Medical Check Up template, its graphic already had the title/theme pre-printed
    showJudul: !isMCU,
    showTema: !isMCU,
    tanggalAlign: isMCU ? 'left' : 'center',
    tanggalTop: isMCU ? 548 : 568,
    showHalaman2: !!isMCU,
    kriteriaPenilaian: isMCU ? [
      { id: '1', nama: 'Tekanan Darah', hasil: 'Normal / Sesuai Standar' },
      { id: '2', nama: 'Gula Darah Acak (GDA)', hasil: 'Normal (< 200 mg/dL)' },
      { id: '3', nama: 'Skrining TB', hasil: 'Negatif / Tidak Ditemukan Gejala' },
      { id: '4', nama: 'Pemeriksaan HBsAg', hasil: 'Non-Reaktif' },
    ] : []
  };

  if (!configStr) return baseConfig;

  if (typeof configStr === 'string' && configStr.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(configStr);
      return {
        ...baseConfig,
        ...parsed,
        kriteriaPenilaian: Array.isArray(parsed.kriteriaPenilaian) ? parsed.kriteriaPenilaian : baseConfig.kriteriaPenilaian
      };
    } catch (e) {
      // ignore
    }
  }

  // Legacy string: "Kiri", "Tengah", "Kanan", "Kiri-Kanan"
  if (['Kiri', 'Tengah', 'Kanan', 'Kiri-Kanan'].includes(configStr)) {
    return {
      ...baseConfig,
      layout: configStr as any
    };
  }

  return baseConfig;
}

export function serializeCertConfig(config: CertificateConfig): string {
  return JSON.stringify(config);
}
