/* ── State ──────────────────────────────────────────────────────────────────── */
const state = {
  file: null,
  printers: [],
  printing: false,
};

/* ── DOM refs ───────────────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const dropzone       = $('dropzone');
const fileInput      = $('fileInput');
const dzEmpty        = $('dzEmpty');
const dzFile         = $('dzFile');
const dzDragOverlay  = $('dzDragOverlay');
const fileName       = $('fileName');
const fileMeta       = $('fileMeta');
const fileIconWrap   = $('fileIconWrap');
const fileClear      = $('fileClear');
const printBtn       = $('printBtn');
const printBtnLabel  = printBtn.querySelector('.print-btn-label');
const printBtnIcon   = printBtn.querySelector('.print-btn-icon');
const printSpinner   = printBtn.querySelector('.print-spinner');
const progressWrap   = $('progressWrap');
const progressBar    = $('progressBar');
const printerSelect  = $('printerSelect');
const printerStatus  = $('printerStatus');
const copiesInput    = $('copiesInput');
const copiesMinus    = $('copiesMinus');
const copiesPlus     = $('copiesPlus');
const sidebar        = $('sidebar');
const sidebarOverlay = $('sidebarOverlay');
const menuToggle     = $('menuToggle');
const sidebarClose   = $('sidebarClose');
const toastContainer = $('toastContainer');

/* ── Init ───────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadPrinters();
  setupDropzone();
  setupToggleGroups();
  setupCopies();
  setupMobileMenu();
});

/* ── Printers ───────────────────────────────────────────────────────────────── */
async function loadPrinters() {
  try {
    const res = await fetch('/api/printers');
    const data = await res.json();
    state.printers = data.printers || [];

    printerSelect.innerHTML = '';

    if (state.printers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No printers found';
      printerSelect.appendChild(opt);
      printerStatus.innerHTML = '<span class="dot dot-error"></span>No printers detected on this Mac Mini';
      return;
    }

    state.printers.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name.replace(/_/g, ' ');
      if (p.name === data.default) opt.selected = true;
      printerSelect.appendChild(opt);
    });

    updatePrinterStatus();
    printerSelect.addEventListener('change', updatePrinterStatus);
  } catch (e) {
    printerSelect.innerHTML = '<option value="">Error loading printers</option>';
    printerStatus.innerHTML = '<span class="dot dot-error"></span>Could not reach server';
  }
}

function updatePrinterStatus() {
  const selected = state.printers.find((p) => p.name === printerSelect.value);
  if (!selected) { printerStatus.innerHTML = ''; return; }

  const statusMap = {
    idle:     { cls: 'dot-idle',    label: 'Ready' },
    printing: { cls: 'dot-busy',    label: 'Printing…' },
    stopped:  { cls: 'dot-error',   label: 'Stopped' },
    disabled: { cls: 'dot-error',   label: 'Disabled' },
  };
  const s = statusMap[selected.status] || { cls: 'dot-unknown', label: selected.status };
  printerStatus.innerHTML = `<span class="dot ${s.cls}"></span>${s.label}`;
}

/* ── Dropzone ───────────────────────────────────────────────────────────────── */
function setupDropzone() {
  // Click to open file picker (not when has-file)
  dropzone.addEventListener('click', (e) => {
    if (dropzone.classList.contains('has-file')) return;
    if (e.target.closest('.file-clear')) return;
    fileInput.click();
  });

  dropzone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !dropzone.classList.contains('has-file')) {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
    fileInput.value = '';
  });

  fileClear.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
  });

  // Drag & drop
  let dragCounter = 0;

  dropzone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; dropzone.classList.remove('drag-over'); }
  });
  dropzone.addEventListener('dragover', (e) => e.preventDefault());
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });

  // Global drag-over (so user can drop anywhere on the page)
  document.addEventListener('dragenter', (e) => {
    if (!dropzone.contains(e.target)) {
      dropzone.classList.add('drag-over');
      dragCounter++;
    }
  });
}

function setFile(file) {
  state.file = file;

  fileName.textContent = file.name;
  fileMeta.textContent = formatFileSize(file.size) + ' · ' + getFileTypeLabel(file);
  fileIconWrap.innerHTML = getFileIcon(file);

  dzEmpty.hidden = true;
  dzFile.hidden  = false;
  dropzone.classList.add('has-file');
  printBtn.disabled = false;
}

function clearFile() {
  state.file = null;
  dzEmpty.hidden = false;
  dzFile.hidden  = true;
  dropzone.classList.remove('has-file');
  printBtn.disabled = true;
}

/* ── File helpers ───────────────────────────────────────────────────────────── */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileTypeLabel(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const map = {
    pdf: 'PDF Document', jpg: 'JPEG Image', jpeg: 'JPEG Image',
    png: 'PNG Image', gif: 'GIF Image', bmp: 'Bitmap Image',
    tiff: 'TIFF Image', tif: 'TIFF Image', webp: 'WebP Image',
    txt: 'Text File', doc: 'Word Document', docx: 'Word Document',
    odt: 'OpenDocument Text', ppt: 'PowerPoint', pptx: 'PowerPoint',
    xls: 'Excel Spreadsheet', xlsx: 'Excel Spreadsheet',
  };
  return map[ext] || file.type || 'File';
}

function getFileIcon(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'pdf') return `
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#fee2e2"/>
      <rect x="6" y="30" width="40" height="20" rx="3" fill="#ef4444"/>
      <text x="26" y="45" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="11" fill="white">PDF</text>
      <line x1="12" y1="18" x2="40" y2="18" stroke="#fca5a5" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="24" x2="33" y2="24" stroke="#fca5a5" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

  if (['jpg','jpeg','png','gif','bmp','tiff','tif','webp'].includes(ext)) return `
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#dbeafe"/>
      <rect x="8" y="12" width="36" height="28" rx="3" fill="#93c5fd"/>
      <circle cx="18" cy="24" r="5" fill="#bfdbfe"/>
      <path d="M8 32 L20 22 L30 30 L37 24 L44 30 L44 40 L8 40Z" fill="#60a5fa"/>
      <rect x="6" y="42" width="40" height="10" rx="2" fill="#3b82f6"/>
      <text x="26" y="51" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="9" fill="white">${ext.toUpperCase()}</text>
    </svg>`;

  if (['doc','docx','odt'].includes(ext)) return `
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#dbeafe"/>
      <rect x="6" y="32" width="40" height="20" rx="3" fill="#2563eb"/>
      <text x="26" y="47" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="10" fill="white">WORD</text>
      <line x1="12" y1="16" x2="40" y2="16" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="22" x2="40" y2="22" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="28" x2="26" y2="28" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

  if (['xls','xlsx'].includes(ext)) return `
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#dcfce7"/>
      <rect x="6" y="32" width="40" height="20" rx="3" fill="#16a34a"/>
      <text x="26" y="47" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="10" fill="white">EXCEL</text>
      <line x1="12" y1="16" x2="40" y2="16" stroke="#86efac" stroke-width="2" stroke-linecap="round"/>
      <line x1="26" y1="10" x2="26" y2="30" stroke="#86efac" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

  if (['ppt','pptx'].includes(ext)) return `
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#ffedd5"/>
      <rect x="6" y="32" width="40" height="20" rx="3" fill="#ea580c"/>
      <text x="26" y="47" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="9" fill="white">PPT</text>
      <rect x="10" y="10" width="32" height="20" rx="2" fill="#fed7aa"/>
    </svg>`;

  if (ext === 'txt') return `
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#f1f5f9"/>
      <line x1="12" y1="18" x2="40" y2="18" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="25" x2="40" y2="25" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="32" x2="40" y2="32" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      <line x1="12" y1="39" x2="30" y2="39" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
    </svg>`;

  // Generic
  return `
    <svg viewBox="0 0 52 60" fill="none">
      <rect width="52" height="60" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1.5"/>
      <line x1="14" y1="22" x2="38" y2="22" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
      <line x1="14" y1="30" x2="38" y2="30" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
      <line x1="14" y1="38" x2="28" y2="38" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
}

/* ── Toggle Groups ──────────────────────────────────────────────────────────── */
function setupToggleGroups() {
  document.querySelectorAll('.toggle-btn[data-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const value = btn.dataset.value;

      // Deactivate siblings
      document.querySelectorAll(`.toggle-btn[data-group="${group}"]`).forEach((b) => {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      // Update hidden input
      const hidden = document.getElementById(group);
      if (hidden) hidden.value = value;
    });
  });
}

/* ── Copies ─────────────────────────────────────────────────────────────────── */
function setupCopies() {
  copiesMinus.addEventListener('click', () => {
    const v = parseInt(copiesInput.value, 10) || 1;
    if (v > 1) copiesInput.value = v - 1;
  });
  copiesPlus.addEventListener('click', () => {
    const v = parseInt(copiesInput.value, 10) || 1;
    if (v < 99) copiesInput.value = v + 1;
  });
  copiesInput.addEventListener('blur', () => {
    let v = parseInt(copiesInput.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 99) v = 99;
    copiesInput.value = v;
  });
}

/* ── Mobile Menu ────────────────────────────────────────────────────────────── */
function setupMobileMenu() {
  menuToggle.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}

/* ── Print ──────────────────────────────────────────────────────────────────── */
printBtn.addEventListener('click', async () => {
  if (!state.file || state.printing) return;

  // Close mobile sidebar if open
  closeSidebar();

  state.printing = true;
  setPrintingUI(true);

  const fd = new FormData();
  fd.append('file', state.file, state.file.name);
  fd.append('printer',     printerSelect.value);
  fd.append('copies',      copiesInput.value);
  fd.append('colorMode',   $('colorMode').value);
  fd.append('paperSize',   $('paperSize').value);
  fd.append('orientation', $('orientation').value);
  fd.append('duplex',      $('duplex').value);
  fd.append('pageRange',   $('pageRange').value);
  fd.append('quality',     $('quality').value);

  try {
    const result = await uploadWithProgress('/api/print', fd, (pct) => {
      progressBar.style.width = pct + '%';
    });

    clearFile();
    showToast('success', 'Sent to printer!', result.message || 'Your document is printing.');
  } catch (err) {
    showToast('error', 'Print failed', err.message || 'Something went wrong. Please try again.');
  } finally {
    state.printing = false;
    setPrintingUI(false);
    progressBar.style.width = '0%';
    progressWrap.hidden = true;
  }
});

function setPrintingUI(active) {
  printBtn.disabled = active;
  printBtnLabel.textContent = active ? 'Printing…' : 'Print';
  printBtnIcon.hidden  = active;
  printSpinner.hidden  = !active;
  progressWrap.hidden  = !active;
  if (active) progressBar.style.width = '0%';
}

function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      let body;
      try { body = JSON.parse(xhr.responseText); } catch { body = {}; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error || `HTTP ${xhr.status}`));
    });

    xhr.addEventListener('error', () => reject(new Error('Network error — check your connection.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

    xhr.send(formData);
  });
}

/* ── Toasts ─────────────────────────────────────────────────────────────────── */
function showToast(type, title, message, duration = 5000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-dot"></span>
    <div class="toast-body">
      <p class="toast-title">${escapeHtml(title)}</p>
      ${message ? `<p class="toast-msg">${escapeHtml(message)}</p>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  toastContainer.appendChild(toast);

  const dismiss = () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  if (duration > 0) setTimeout(dismiss, duration);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
