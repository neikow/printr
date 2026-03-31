import React, { useState, useEffect, useRef, useCallback } from 'react';

// Helpers
function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileTypeLabel(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: 'PDF Document', jpg: 'JPEG Image', jpeg: 'JPEG Image',
    png: 'PNG Image', gif: 'GIF Image', bmp: 'Bitmap Image',
    tiff: 'TIFF Image', tif: 'TIFF Image', webp: 'WebP Image',
    txt: 'Text File', doc: 'Word Document', docx: 'Word Document',
    odt: 'OpenDocument Text', ppt: 'PowerPoint', pptx: 'PowerPoint',
    xls: 'Excel Spreadsheet', xlsx: 'Excel Spreadsheet',
  };
  return map[ext] || file.type || 'File';
}

function getFileIcon(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf') return (
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#fee2e2"/>
      <rect x="6" y="30" width="40" height="20" rx="3" fill="#ef4444"/>
      <text x="26" y="45" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="11" fill="white">PDF</text>
      <line x1="12" y1="18" x2="40" y2="18" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="24" x2="33" y2="24" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  if (['jpg','jpeg','png','gif','bmp','tiff','tif','webp'].includes(ext)) return (
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#dbeafe"/>
      <rect x="8" y="12" width="36" height="28" rx="3" fill="#93c5fd"/>
      <circle cx="18" cy="24" r="5" fill="#bfdbfe"/>
      <path d="M8 32 L20 22 L30 30 L37 24 L44 30 L44 40 L8 40Z" fill="#60a5fa"/>
      <rect x="6" y="42" width="40" height="10" rx="2" fill="#3b82f6"/>
      <text x="26" y="51" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="9" fill="white">{ext.toUpperCase()}</text>
    </svg>
  );

  if (['doc','docx','odt'].includes(ext)) return (
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#dbeafe"/>
      <rect x="6" y="32" width="40" height="20" rx="3" fill="#2563eb"/>
      <text x="26" y="47" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="10" fill="white">WORD</text>
      <line x1="12" y1="16" x2="40" y2="16" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="22" x2="40" y2="22" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="28" x2="26" y2="28" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  if (['xls','xlsx'].includes(ext)) return (
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#dcfce7"/>
      <rect x="6" y="32" width="40" height="20" rx="3" fill="#16a34a"/>
      <text x="26" y="47" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="10" fill="white">EXCEL</text>
      <line x1="12" y1="16" x2="40" y2="16" stroke="#86efac" strokeWidth="2" strokeLinecap="round"/>
      <line x1="26" y1="10" x2="26" y2="30" stroke="#86efac" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  if (['ppt','pptx'].includes(ext)) return (
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#ffedd5"/>
      <rect x="6" y="32" width="40" height="20" rx="3" fill="#ea580c"/>
      <text x="26" y="47" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="9" fill="white">PPT</text>
      <rect x="10" y="10" width="32" height="20" rx="2" fill="#fed7aa"/>
    </svg>
  );

  if (ext === 'txt') return (
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#f1f5f9"/>
      <line x1="12" y1="18" x2="40" y2="18" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="25" x2="40" y2="25" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="32" x2="40" y2="32" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="39" x2="30" y2="39" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  // Generic
  return (
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5"/>
      <line x1="14" y1="22" x2="38" y2="22" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="30" x2="38" y2="30" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="38" x2="28" y2="38" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Toast Component
type ToastProps = {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  onRemove: (id: number) => void;
};
function Toast({ id, type, title, message, onRemove }: ToastProps) {
  const [removing, setRemoving] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setRemoving(true);
    }, 4800); // start removing animation just before 5s
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => setRemoving(true);
  const handleAnimationEnd = () => {
    if (removing) onRemove(id);
  };

  return (
    <div className={`toast toast-${type} ${removing ? 'removing' : ''}`} onAnimationEnd={handleAnimationEnd}>
      <span className="toast-dot"></span>
      <div className="toast-body">
        <p className="toast-title">{title}</p>
        {message && <p className="toast-msg">{message}</p>}
      </div>
      <button className="toast-close" aria-label="Dismiss" onClick={handleClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

interface PrintFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'printing' | 'done' | 'error';
  progress: number;
  message?: string;
}

function App() {
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [, setDefaultPrinter] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Print settings
  const [printer, setPrinter] = useState('');
  const [copies, setCopies] = useState<string | number>(1);
  const [colorMode, setColorMode] = useState('color');
  const [paperSize, setPaperSize] = useState('letter');
  const [orientation, setOrientation] = useState('portrait');
  const [duplex, setDuplex] = useState('none');
  const [pageRange, setPageRange] = useState('');
  const [quality, setQuality] = useState('4');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientId = useRef(Math.random().toString(36).substring(2, 9));

  const [toasts, setToasts] = useState<any[]>([]);
  let toastIdCounter = useRef(0);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = ++toastIdCounter.current;
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    fetch('/api/printers')
      .then(res => res.json())
      .then(data => {
        setPrinters(data.printers || []);
        setDefaultPrinter(data.default);
        if (data.default) setPrinter(data.default);
        else if (data.printers?.length) setPrinter(data.printers[0].name);
      })
      .catch(() => showToast('error', 'Could not reach server'));
  }, [showToast]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?clientId=${clientId.current}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.fileId && data.status) {
          setFiles(prev => prev.map(f => {
            if (f.id === data.fileId) {
              return { ...f, status: data.status, message: data.message || f.message };
            }
            return f;
          }));
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      const newFiles = Array.from(e.dataTransfer.files).map(f => ({
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        status: 'pending' as const,
        progress: 0
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const newFiles = Array.from(e.target.files).map(f => ({
        id: Math.random().toString(36).substring(2, 9),
        file: f,
        status: 'pending' as const,
        progress: 0
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handlePrint = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (!pendingFiles.length || printing) return;
    
    setSidebarOpen(false);
    setPrinting(true);

    const promises = pendingFiles.map(async (f) => {
      setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: 'uploading', progress: 0 } : p));
      
      const fd = new FormData();
      fd.append('file', f.file, f.file.name);
      fd.append('printer', printer);
      fd.append('copies', copies.toString());
      fd.append('colorMode', colorMode);
      fd.append('paperSize', paperSize);
      fd.append('orientation', orientation);
      fd.append('duplex', duplex);
      fd.append('pageRange', pageRange);
      fd.append('quality', quality);
      fd.append('clientId', clientId.current);
      fd.append('fileId', f.id);

      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/print');

        const promise = new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setFiles(prev => prev.map(p => p.id === f.id ? { ...p, progress } : p));
            }
          });
          xhr.addEventListener('load', () => {
            let body: any = {};
            try { body = JSON.parse(xhr.responseText); } catch {}
            if (xhr.status >= 200 && xhr.status < 300) resolve(body);
            else reject(new Error(body.error || `HTTP ${xhr.status}`));
          });
          xhr.addEventListener('error', () => reject(new Error('Network error — check your connection.')));
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));
          xhr.send(fd);
        });

        const result: any = await promise;
        // WS events (processing, printing, done) will handle further status updates
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: 'done', message: result.message || 'Job submitted successfully.' } : p));
      } catch (err: any) {
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: 'error', message: err.message || 'Something went wrong.' } : p));
      }
    });

    await Promise.allSettled(promises);
    setPrinting(false);
    
    const errors = files.filter(f => f.status === 'error');
    if (errors.length) {
      showToast('error', 'Print issues', 'Some files failed to print.');
    } else {
      showToast('success', 'Sent to printer!', 'All documents have been submitted.');
    }
  };

  const selectedPrinterObj = printers.find(p => p.name === printer);
  const pendingOrErrorCount = files.filter(f => f.status === 'pending' || f.status === 'error').length;

  return (
    <>
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open print options">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="logo">
          <svg viewBox="0 0 32 32" className="logo-icon"><rect x="10" y="2" width="12" height="9" rx="1.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2"/><rect x="3" y="8" width="26" height="16" rx="3.5" fill="#2563eb"/><rect x="3" y="20" width="26" height="4" fill="#1d4ed8"/><line x1="6" y1="13.5" x2="19" y2="13.5" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/><line x1="6" y1="17.5" x2="19" y2="17.5" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/><circle cx="24.5" cy="13.5" r="2.5" fill="#34d399"/><rect x="8" y="20" width="16" height="10" rx="1.5" fill="white" stroke="#e2e8f0" strokeWidth="1"/><line x1="11" y1="23.5" x2="21" y2="23.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="26.5" x2="18" y2="26.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span>Printr</span>
        </div>
      </header>

      <div className="app-layout">
        <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)}></div>

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo">
              <svg viewBox="0 0 32 32" className="logo-icon"><rect x="10" y="2" width="12" height="9" rx="1.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2"/><rect x="3" y="8" width="26" height="16" rx="3.5" fill="#2563eb"/><rect x="3" y="20" width="26" height="4" fill="#1d4ed8"/><line x1="6" y1="13.5" x2="19" y2="13.5" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/><line x1="6" y1="17.5" x2="19" y2="17.5" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round"/><circle cx="24.5" cy="13.5" r="2.5" fill="#34d399"/><rect x="8" y="20" width="16" height="10" rx="1.5" fill="white" stroke="#e2e8f0" strokeWidth="1"/><line x1="11" y1="23.5" x2="21" y2="23.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/><line x1="11" y1="26.5" x2="18" y2="26.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span>Printr</span>
            </div>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="sidebar-body">
            <h2 className="section-title">Print Options</h2>

            <div className="field">
              <label htmlFor="printerSelect">Printer</label>
              <div className="select-wrap">
                <select id="printerSelect" value={printer} onChange={e => setPrinter(e.target.value)}>
                  {printers.length === 0 ? (
                    <option value="">Detecting printers…</option>
                  ) : (
                    printers.map(p => (
                      <option key={p.name} value={p.name}>{p.name.replace(/_/g, ' ')}</option>
                    ))
                  )}
                </select>
                <svg className="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div className="printer-status">
                {selectedPrinterObj ? (
                  <>
                    <span className={`dot ${selectedPrinterObj.status === 'idle' ? 'dot-idle' : selectedPrinterObj.status === 'printing' ? 'dot-busy' : 'dot-error'}`}></span>
                    {selectedPrinterObj.status === 'idle' ? 'Ready' : selectedPrinterObj.status === 'printing' ? 'Printing...' : 'Stopped/Disabled'}
                  </>
                ) : (printers.length === 0 ? <><span className="dot dot-error"></span>No printers detected</> : null)}
              </div>
            </div>

            <div className="field">
              <label>Copies</label>
              <div className="copies-row">
                <button className="copies-btn" onClick={() => setCopies(c => Math.max(1, Number(c) - 1))} aria-label="Fewer copies">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <input type="number" value={copies} onChange={e => setCopies(e.target.value)} onBlur={() => setCopies(c => Math.min(99, Math.max(1, Number(c) || 1)))} aria-label="Number of copies" />
                <button className="copies-btn" onClick={() => setCopies(c => Math.min(99, Number(c) + 1))} aria-label="More copies">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>

            <div className="field">
              <label>Color Mode</label>
              <div className="toggle-group" role="group" aria-label="Color mode">
                <button className={`toggle-btn ${colorMode === 'color' ? 'active' : ''}`} onClick={() => setColorMode('color')}>
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <circle cx="12" cy="7" r="5" fill="#f87171"/>
                    <circle cx="7" cy="15" r="5" fill="#60a5fa" opacity="0.8"/>
                    <circle cx="17" cy="15" r="5" fill="#4ade80" opacity="0.8"/>
                  </svg>
                  Color
                </button>
                <button className={`toggle-btn ${colorMode === 'bw' ? 'active' : ''}`} onClick={() => setColorMode('bw')}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><path d="M12 4v16" strokeWidth="1.5"/></svg>
                  B&amp;W
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="paperSize">Paper Size</label>
              <div className="select-wrap">
                <select id="paperSize" value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                  <option value="letter">Letter  (8.5″ × 11″)</option>
                  <option value="legal">Legal  (8.5″ × 14″)</option>
                  <option value="A4">A4  (210 × 297 mm)</option>
                  <option value="A3">A3  (297 × 420 mm)</option>
                  <option value="A5">A5  (148 × 210 mm)</option>
                </select>
                <svg className="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            <div className="field">
              <label>Orientation</label>
              <div className="toggle-group" role="group" aria-label="Orientation">
                <button className={`toggle-btn ${orientation === 'portrait' ? 'active' : ''}`} onClick={() => setOrientation('portrait')}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
                  Portrait
                </button>
                <button className={`toggle-btn ${orientation === 'landscape' ? 'active' : ''}`} onClick={() => setOrientation('landscape')}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/></svg>
                  Landscape
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="duplex">Double-Sided</label>
              <div className="select-wrap">
                <select id="duplex" value={duplex} onChange={e => setDuplex(e.target.value)}>
                  <option value="none">Single-sided</option>
                  <option value="long">Long Edge (Book)</option>
                  <option value="short">Short Edge (Flip)</option>
                </select>
                <svg className="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            <div className="field">
              <label htmlFor="pageRange">Page Range</label>
              <input type="text" id="pageRange" placeholder="e.g. 1-3, 5, 8-10" autoComplete="off" value={pageRange} onChange={e => setPageRange(e.target.value)} />
            </div>

            <div className="field">
              <label>Quality</label>
              <div className="toggle-group" role="group" aria-label="Print quality">
                <button className={`toggle-btn ${quality === '3' ? 'active' : ''}`} onClick={() => setQuality('3')}>Draft</button>
                <button className={`toggle-btn ${quality === '4' ? 'active' : ''}`} onClick={() => setQuality('4')}>Normal</button>
                <button className={`toggle-btn ${quality === '5' ? 'active' : ''}`} onClick={() => setQuality('5')}>Best</button>
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="dropzone-wrapper">
            <div 
              className={`dropzone ${dragOver ? 'drag-over' : ''} ${files.length ? 'has-file' : ''}`}
              tabIndex={0} 
              role="button" 
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest('.file-clear')) {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {files.length === 0 ? (
                <div className="dz-empty">
                  <div className="dz-icon">
                    <svg viewBox="0 0 64 64" fill="none">
                      <rect x="12" y="8" width="40" height="48" rx="5" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2"/>
                      <line x1="22" y1="24" x2="42" y2="24" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="22" y1="32" x2="42" y2="32" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="22" y1="40" x2="34" y2="40" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round"/>
                      <circle cx="46" cy="46" r="12" fill="#2563eb"/>
                      <line x1="46" y1="41" x2="46" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="41" y1="46" x2="51" y2="46" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2>Drop files here</h2>
                  <p>or <span className="browse-link">click to browse</span></p>
                  <div className="formats">
                    <span>PDF</span><span>JPG</span><span>PNG</span><span>TXT</span><span>DOCX</span>
                  </div>
                </div>
              ) : (
                <div className="file-list">
                  {files.map(f => (
                    <div key={f.id} className="dz-file">
                      <div className="file-icon-wrap">{getFileIcon(f.file)}</div>
                      <div className="file-info">
                        <p className="file-name">{f.file.name}</p>
                        <p className="file-meta">
                          {formatFileSize(f.file.size)} &middot; {getFileTypeLabel(f.file)} 
                          <span className={`file-status-text status-${f.status}`}>{f.status}</span>
                        </p>
                        {f.status === 'uploading' && (
                          <div className="mini-progress-bar-wrap">
                            <div className="mini-progress-bar" style={{ width: `${f.progress}%` }}></div>
                          </div>
                        )}
                        {f.message && <p className="file-msg">{f.message}</p>}
                      </div>
                      <button className="file-clear" aria-label="Remove file" onClick={(e) => removeFile(f.id, e)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                  
                  <div className="dz-add-more">
                    <span>Drop more files or </span><span className="browse-link">click to browse</span>
                  </div>
                </div>
              )}

              <div className="dz-drag-overlay">
                <svg viewBox="0 0 64 64" fill="none"><path d="M32 12 L32 44 M18 30 L32 44 L46 30" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><rect x="12" y="48" width="40" height="6" rx="3" fill="white" opacity="0.6"/></svg>
                <p>Release to add files</p>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              hidden 
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.tiff,.tif,.bmp,.webp,.txt,.doc,.docx,.odt,.ppt,.pptx,.xls,.xlsx" 
              onChange={handleFileChange}
            />

            <button className="print-btn" disabled={pendingOrErrorCount === 0 || printing} onClick={handlePrint}>
              {!printing && (
                <span className="print-btn-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </span>
              )}
              <span className="print-btn-label">
                {printing ? 'Processing…' : `Print ${pendingOrErrorCount} File${pendingOrErrorCount !== 1 ? 's' : ''}`}
              </span>
              {printing && (
                <span className="print-spinner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9" strokeOpacity="0.25"/><path d="M12 3 A9 9 0 0 1 21 12" strokeLinecap="round"/></svg>
                </span>
              )}
            </button>
          </div>
        </main>
      </div>

      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <Toast key={t.id} id={t.id} type={t.type} title={t.title} message={t.message} onRemove={removeToast} />
        ))}
      </div>
    </>
  );
}

export default App;