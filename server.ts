import express, { Request, Response } from 'express';
import multer from 'multer';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, suffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

app.use(express.json());

// Serve static files from Vite build in production
const clientBuildPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientBuildPath));

// ── Printers ────────────────────────────────────────────────────────────────

app.get('/api/printers', (req: Request, res: Response) => {
  exec('lpstat -p 2>/dev/null', (err, stdout) => {
    const printers = parsePrinters(stdout || '');

    exec('lpstat -d 2>/dev/null', (err2, stdout2) => {
      let defaultPrinter = null;
      if (stdout2) {
        const m = stdout2.match(/system default destination:\s*(\S+)/);
        if (m) defaultPrinter = m[1];
      }
      res.json({ printers, default: defaultPrinter });
    });
  });
});

function parsePrinters(output: string) {
  const printers = [];
  for (const line of output.split('\n')) {
    const m = line.match(/^printer\s+(\S+)\s+is\s+(\w+)/i);
    if (m) {
      printers.push({
        name: m[1],
        status: m[2].toLowerCase(),
        enabled: !line.toLowerCase().includes('disabled'),
      });
    }
  }
  return printers;
}

// ── Print ────────────────────────────────────────────────────────────────────

app.post('/api/print', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided.' });
  }

  const {
    printer = '',
    copies = '1',
    colorMode = 'color',
    paperSize = 'letter',
    orientation = 'portrait',
    duplex = 'none',
    pageRange = '',
    quality = '4',
  } = req.body;

  let filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  let convertedPath: string | null = null;

  const officeExts = ['.doc', '.docx', '.odt', '.ppt', '.pptx', '.xls', '.xlsx'];

  try {
    if (officeExts.includes(ext)) {
      const loPath = getLibreOfficePath();
      if (!loPath) {
        cleanup(filePath);
        return res.status(400).json({
          error:
            'Office documents require LibreOffice. Install it from libreoffice.org, or convert the file to PDF first.',
        });
      }
      try {
        convertedPath = await convertToPDF(loPath, filePath);
        filePath = convertedPath;
      } catch (convErr: any) {
        cleanup(req.file.path);
        return res.status(500).json({ error: 'Conversion failed: ' + convErr.message });
      }
    }

    // Build args for `lp`
    const args: string[] = [];

    if (printer) {
      args.push('-d', printer);
    }

    const numCopies = Math.max(1, Math.min(99, parseInt(copies, 10) || 1));
    args.push('-n', String(numCopies));

    args.push('-o', colorMode === 'bw' ? 'print-color-mode=monochrome' : 'print-color-mode=color');

    if (paperSize) args.push('-o', `media=${paperSize}`);

    if (orientation === 'landscape') args.push('-o', 'landscape');

    const sidesMap: Record<string, string> = { long: 'two-sided-long-edge', short: 'two-sided-short-edge', none: 'one-sided' };
    args.push('-o', `sides=${sidesMap[duplex] || 'one-sided'}`);

    const sanitizedRange = (pageRange || '').replace(/[^0-9,\-]/g, '').trim();
    if (sanitizedRange) args.push('-o', `page-ranges=${sanitizedRange}`);

    const q = [3, 4, 5].includes(parseInt(quality, 10)) ? quality : '4';
    args.push('-o', `print-quality=${q}`);

    args.push(filePath);

    const result = await spawnPrint(args);

    cleanup(req.file.path);
    if (convertedPath) cleanup(convertedPath);

    res.json({ success: true, message: result || 'Print job submitted.' });
  } catch (err: any) {
    cleanup(req.file.path);
    if (convertedPath) cleanup(convertedPath);
    res.status(500).json({ error: err.message });
  }
});

function spawnPrint(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('lp', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error((stderr || `lp exited with code ${code}`).trim()));
      else resolve(stdout.trim());
    });
  });
}

// ── Print queue ──────────────────────────────────────────────────────────────

app.get('/api/jobs', (req: Request, res: Response) => {
  exec('lpq -a 2>/dev/null', (err, stdout) => {
    const raw = (stdout || '').trim();
    if (!raw || raw.toLowerCase().includes('no entries')) {
      return res.json({ jobs: [] });
    }
    const lines = raw.split('\n').slice(1); // skip header
    const jobs = lines
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/\s+/);
        return { owner: parts[1] || '', job: parts[2] || '', file: parts[3] || '', size: parts[4] || '' };
      });
    res.json({ jobs });
  });
});

// ── LibreOffice helpers ──────────────────────────────────────────────────────

function getLibreOfficePath(): string | null {
  const candidates = [
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    '/usr/local/bin/soffice',
    '/opt/homebrew/bin/soffice',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const r = require('child_process').execSync('which soffice 2>/dev/null').toString().trim();
    if (r) return r;
  } catch (_) {}
  return null;
}

function convertToPDF(loPath: string, inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outDir = path.dirname(inputPath);
    const proc = spawn(loPath, ['--headless', '--convert-to', 'pdf', '--outdir', outDir, inputPath]);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || 'LibreOffice conversion failed'));
      const pdfPath = inputPath.replace(/\.[^.]+$/, '.pdf');
      if (fs.existsSync(pdfPath)) resolve(pdfPath);
      else reject(new Error('Converted PDF not found'));
    });
  });
}

function cleanup(filePath: string) {
  try { fs.unlinkSync(filePath); } catch (_) {}
}

// Fallback to serve index.html for React Router / SPA
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'your-mac-mini-ip';
}

app.listen(Number(PORT), '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n  Printr is running!');
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${ip}:${PORT}\n`);
  console.log('  Share the Network URL with devices on the same Wi-Fi.\n');
});