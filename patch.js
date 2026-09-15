const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');
code = code.replace("res.json({ url: fileUrl });", "res.json({ url: '/api/uploads/' + req.file.filename });\n  });\n\n  app.get('/api/uploads/:filename', (req, res) => {\n    res.sendFile(path.join('/tmp', req.params.filename));");
fs.writeFileSync('api/index.ts', code);
