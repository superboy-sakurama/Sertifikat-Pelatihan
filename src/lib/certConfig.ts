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
  tanggalTop: 565,
  ttdBottom: 56,
  bgFit: 'contain'
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
    tanggalAlign: isMCU ? 'right' : 'center'
  };

  if (!configStr) return baseConfig;

  if (typeof configStr === 'string' && configStr.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(configStr);
      return {
        ...baseConfig,
        ...parsed
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
