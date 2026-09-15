const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');
const proxyCode = `
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const imageUrl = req.query.url;
      if (!imageUrl) return res.status(400).send('URL is required');
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
`;
code = code.replace("export default app;", proxyCode + "\nexport default app;");
fs.writeFileSync('api/index.ts', code);
