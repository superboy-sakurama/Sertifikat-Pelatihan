export default async function handler(req: any, res: any) {
  try {
    let imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).json({ error: 'URL is required' });
    
    // Deteksi Google Drive URL
    const gdriveMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || imageUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1] && imageUrl.includes('drive.google.com')) {
      imageUrl = `https://drive.google.com/uc?export=download&id=${gdriveMatch[1]}`;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image from external source');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
    res.status(200).json({ base64 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
