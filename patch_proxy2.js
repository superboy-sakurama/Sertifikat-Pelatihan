const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldProxy = `  app.get('/api/proxy-image', async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) return res.status(400).send('URL is required');
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });`;

const newProxy = `  app.get('/api/proxy-image', async (req, res) => {
    try {
      let imageUrl = req.query.url as string;
      if (!imageUrl) return res.status(400).json({ error: 'URL is required' });
      
      // Handle Google Drive URLs
      const gdriveMatch = imageUrl.match(/\\/file\\/d\\/([a-zA-Z0-9_-]+)/) || imageUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (gdriveMatch && gdriveMatch[1] && imageUrl.includes('drive.google.com')) {
        imageUrl = \`https://drive.google.com/uc?export=download&id=\${gdriveMatch[1]}\`;
      }

      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image from external source');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      const base64 = \`data:\${contentType};base64,\${buffer.toString('base64')}\`;
      res.json({ base64 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });`;

code = code.replace(oldProxy, newProxy);
fs.writeFileSync('server.ts', code);
