const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importMulter = "import multer from 'multer';\nimport fsSync from 'fs';\n";
code = importMulter + code;

const uploadLogic = `
  // Setup Multer for file uploads
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
  }
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
  const upload = multer({ storage: storage });

  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // file is saved to public/uploads/
    // It will be accessible at /uploads/filename
    const fileUrl = '/uploads/' + req.file.filename;
    res.json({ url: fileUrl });
  });
`;

code = code.replace('// ======== VITE MIDDLEWARE / SPA FALLBACK ========', uploadLogic + '\n  // ======== VITE MIDDLEWARE / SPA FALLBACK ========');

fs.writeFileSync('server.ts', code);
