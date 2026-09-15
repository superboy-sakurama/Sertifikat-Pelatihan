import fs from 'fs';
let code = fs.readFileSync('src/pages/user/EventDetail.tsx', 'utf8');

const oldCode = `  const handleDownloadCertificate = async () => {
    if (!certRef.current) return;
    setActionLoading(true);
    
    try {
      // Preload the template image explicitly to ensure it is fully fetched before canvas rendering
      if (backgroundImageUrl) {
        const proxiedUrl = backgroundImageUrl.startsWith('http') ? \`/api/proxy-image?url=\${encodeURIComponent(backgroundImageUrl)}\` : backgroundImageUrl;
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = resolve;
          img.onerror = resolve; // Continue even if it fails, fallback
          img.src = proxiedUrl;
        });
      }

      // Allow browser a moment to ensure images (like QR code and template) are fully rendered in the hidden div
      await new Promise(resolve => setTimeout(resolve, 500));`;

const newCode = `  const handleDownloadCertificate = async () => {
    if (!certRef.current) return;
    setActionLoading(true);
    
    try {
      // Preload the template image explicitly to ensure it is fully fetched before canvas rendering
      if (backgroundImageUrl) {
        const proxiedUrl = backgroundImageUrl.startsWith('http') ? \`/api/proxy-image?url=\${encodeURIComponent(backgroundImageUrl)}\` : backgroundImageUrl;
        try {
          const response = await fetch(proxiedUrl);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          setBase64Template(base64);
        } catch (e) {
          console.error("Failed to load background image:", e);
        }
      }

      // Allow browser a moment to ensure images (like QR code and template) are fully rendered in the hidden div
      await new Promise(resolve => setTimeout(resolve, 500));`;

code = code.replace(oldCode, newCode);

// Add cleanup at the end of the function
const finallyCode = `    } finally {
      setActionLoading(false);
    }
  };`;

const newFinallyCode = `    } finally {
      setActionLoading(false);
      setBase64Template(null);
    }
  };`;

code = code.replace(finallyCode, newFinallyCode);

fs.writeFileSync('src/pages/user/EventDetail.tsx', code);
