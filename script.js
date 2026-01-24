lucide.createIcons();

// --- STATE & CONFIG ---
const APP = {
    dbName: 'OneSecondADayDB',
    storeName: 'clips',
    version: 1,
    db: null,
    today: (() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    })(),
    mediaRecorder: null,
    recordedChunks: [],
    cameraStream: null,

    // New State for V2
    mode: 'self', // 'self' or 'scene'
    viewDate: new Date(), // Tracks month view
    targetDate: (() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    })(),
    sceneCamFacing: 'environment', // default rear for scene

    // Rendering loop
    animationId: null,

    // Flash State
    flashEnabled: false,
    hasTorch: false,
    trackRef: null,

    // Import Compiler State
    importState: {
        files: [], // Flat list of all imported files
        isProcessing: false
    },

    // Recording State (Audio Logic)
    recAudioCtx: null,

    // Music State
    musicConfig: {
        file: null,
        start: 0,
        end: null, // null means end of file
        duration: 0
    },

    // Trim State
    trimState: {
        isDragging: false,
        startX: 0,
        currentLeft: 0,
        containerWidth: 0,
        windowWidth: 0,
        videoDuration: 0,
        songDuration: 0,
        isPlaying: false,
        previewTimeout: null,
        progressFrameId: null // New: For progress animation
    },

    // User Data
    userName: localStorage.getItem('user_name') || null,

    // Assets
    logoImg: null
};

// --- ANIMATION OBSERVER ---
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Unobserve after revealing to ensure it only happens once per session
            scrollObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1, // Trigger when 10% of element is visible
    rootMargin: '20px' // Start slightly before it enters viewport
});

// Helper to attach observer to elements
function initScrollAnimations() {
    document.querySelectorAll('.reveal-item').forEach(el => {
        scrollObserver.observe(el);
    });
}

// --- ANIMATION STATE ---
let activeTriggerEl = null;

// --- NEW: TIMEOUT HELPER ---
const withTimeout = (promise, ms, errorMsg) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
]);

const DOM = {
    // Displays
    greetingLine1: document.getElementById('greetingLine1'),
    greetingLine2: document.getElementById('greetingLine2'),
    targetDateDisplay: document.getElementById('targetDateDisplay'),
    targetIndicator: document.getElementById('targetIndicator'),
    monthLabel: document.getElementById('monthLabel'),
    statusText: document.getElementById('statusText'),

    // Search
    dateSearchInput: document.getElementById('dateSearchInput'),
    btnSearch: document.getElementById('btnSearch'),
    searchContainer: document.getElementById('searchContainer'),
    searchError: document.getElementById('searchError'),

    // Camera
    cameraContainer: document.getElementById('cameraContainer'),
    cameraPreview: document.getElementById('cameraPreview'),
    playbackPreview: document.getElementById('playbackPreview'),
    processingCanvas: document.getElementById('processingCanvas'),

    // Mode Switcher
    modeSelf: document.getElementById('modeSelf'),
    modeScene: document.getElementById('modeScene'),
    modeBg: document.getElementById('modeBg'),

    // Overlays & Buttons
    startOverlay: document.getElementById('startOverlay'),
    doneOverlay: document.getElementById('doneOverlay'),
    btnInit: document.getElementById('btnInitCamera'),
    btnRecord: document.getElementById('btnRecord'),
    btnSwitchCam: document.getElementById('btnSwitchCam'),
    btnViewClip: document.getElementById('btnViewClip'),
    btnFlash: document.getElementById('btnFlash'),
    iconFlash: document.getElementById('iconFlash'),

    // Grid & Nav
    calendarGrid: document.getElementById('calendarGrid'),
    btnPrevMonth: document.getElementById('btnPrevMonth'),
    btnNextMonth: document.getElementById('btnNextMonth'),

    // Modals
    clipModal: document.getElementById('clipModal'),
    modalVideo: document.getElementById('modalVideo'),
    modalDateDisplay: document.getElementById('modalDateDisplay'),
    modalTimeDisplay: document.getElementById('modalTimeDisplay'),
    btnCloseClip: document.getElementById('btnCloseClip'),
    btnDeleteClip: document.getElementById('btnDeleteClip'),
    btnReplaceClip: document.getElementById('btnReplaceClip'),
    btnDownloadClip: document.getElementById('btnDownloadClip'),
    dlIconContainer: document.getElementById('dlIconContainer'),
    dlSpinner: document.getElementById('dlSpinner'),

    // Compile
    btnCompile: document.getElementById('btnCompile'),
    btnCompileYear: document.getElementById('btnCompileYear'), // New Ref
    compileModal: document.getElementById('compileModal'),
    compileProgress: document.getElementById('compileProgress'),
    compileLog: document.getElementById('compileLog'),
    compilePercent: document.getElementById('compilePercent'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelCompile: document.getElementById('btnCancelCompile'),
    compileCanvas: document.getElementById('compileCanvas'),
    compileBadge: document.getElementById('compileBadge'),
    compileBadgeText: document.getElementById('compileBadgeText'),
    monthMusicInput: document.getElementById('monthMusicInput'),
    monthMusicText: document.getElementById('monthMusicText'),
    lblMonthMusic: document.getElementById('lblMonthMusic'),
    monthMusicWrapper: document.getElementById('monthMusicWrapper'),
    monthMusicIcon: document.getElementById('monthMusicIcon'),
    btnRemoveMonthMusic: document.getElementById('btnRemoveMonthMusic'),
    btnTrimMusic: document.getElementById('btnTrimMusic'),
    musicDivider: document.getElementById('musicDivider'),

    // Trim Modal
    trimModal: document.getElementById('trimModal'),
    trimAudioPreview: document.getElementById('trimAudioPreview'),
    trimTrackContainer: document.getElementById('trimTrackContainer'),
    trimWindow: document.getElementById('trimWindow'),
    trimProgressBar: document.getElementById('trimProgressBar'), // New Ref
    trimStartDisplay: document.getElementById('trimStartDisplay'),
    trimEndDisplay: document.getElementById('trimEndDisplay'),
    trimTotalTime: document.getElementById('trimTotalTime'),
    trimClipCount: document.getElementById('trimClipCount'),

    btnPreviewTrimSegment: document.getElementById('btnPreviewTrimSegment'),
    iconPreviewTrim: document.getElementById('iconPreviewTrim'), // New Ref
    btnSaveTrim: document.getElementById('btnSaveTrim'),
    btnCancelTrim: document.getElementById('btnCancelTrim'),

    // Import Compiler
    btnImportCompile: document.getElementById('btnImportCompile'),
    importCompileModal: document.getElementById('importCompileModal'),
    importModalTitle: document.getElementById('importModalTitle'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    importContentArea: document.getElementById('importContentArea'),
    importListContainer: document.getElementById('importListContainer'),
    btnStartImportCompile: document.getElementById('btnStartImportCompile'),
    importProgressArea: document.getElementById('importProgressArea'),
    importPreviewCanvas: document.getElementById('importPreviewCanvas'),
    importProgressBar: document.getElementById('importProgressBar'),
    importStatusLog: document.getElementById('importStatusLog'),
    importPercentDisplay: document.getElementById('importPercentDisplay'),
    importDownloadLinks: document.getElementById('importDownloadLinks'),
    btnCloseImportModal: document.getElementById('btnCloseImportModal'),
    importMusicInput: document.getElementById('importMusicInput'),
    importMusicText: document.getElementById('importMusicText'),
    importMusicCheck: document.getElementById('importMusicCheck'),

    // Icons & Rings
    recordControls: document.getElementById('recordControls'),
    progressCircle: document.getElementById('progressCircle'),
    recIcon: document.getElementById('recIcon'),

    // Custom Video Controls
    videoLoader: document.getElementById('videoLoader'),
    centerPlayOverlay: document.getElementById('centerPlayOverlay'),
    customControls: document.getElementById('customControls'),
    btnTogglePlay: document.getElementById('btnTogglePlay'),
    iconSmallPlay: document.getElementById('iconSmallPlay'),
    videoTimeline: document.getElementById('videoTimeline'),
    videoProgress: document.getElementById('videoProgress'),
    videoBuffered: document.getElementById('videoBuffered'),
    videoThumb: document.getElementById('videoThumb'),
    videoThumb: document.getElementById('videoThumb'),
    videoContainer: document.querySelector('.group\\/video'),

    // Download Options
    downloadOptionsMenu: document.getElementById('downloadOptionsMenu'),
    btnDownloadOriginal: document.getElementById('btnDownloadOriginal'),
    btnDownloadWatermark: document.getElementById('btnDownloadWatermark')
};

// --- INIT ---
function getSafeUsername() {
    if (!APP.userName) return 'User';
    let name = APP.userName.replace(/\/BB$/, '');
    return name.replace(/[^a-zA-Z0-9-_]/g, '');
}

function formatDateDisplay(isoDateString) {
    if (!isoDateString) return '';

    if (isoDateString instanceof Date) {
        const y = isoDateString.getFullYear();
        const m = String(isoDateString.getMonth() + 1).padStart(2, '0');
        const d = String(isoDateString.getDate()).padStart(2, '0');
        return `${d}-${m}-${y}`;
    }

    if (typeof isoDateString !== 'string') return String(isoDateString);

    if (isoDateString.includes('-')) {
        const parts = isoDateString.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            return `${d}-${m}-${y}`;
        }
    }
    return String(isoDateString);
}

function formatTimeDisplay(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// --- GREETING LOGIC ---
function updateGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
    else if (hour >= 17) timeGreeting = "Good evening";

    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', dateOptions);

    const name = APP.userName;
    let nameGreeting = "Hi,";

    if (name === "Barnita/BB") {
        const adjectives = ["gorgeous", "majestic", "lovely", "radiant", "elegant", "stunning"];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const emoticons = ["O_O", "o_o", "0_0", "._.", "-_-", ">_<", "(°_°)", "(UwU)", "c:", ":>", ":D", "xD", "^^", ".-.", ">.<", "°_°", "<3", "♡", "♥", "ε>", "^_^", "^.^", "^o^", "^◡^", "^w^", "^u^", ">◡<", "•ᴗ•", "'◡'"];
        const randomEmo = emoticons[Math.floor(Math.random() * emoticons.length)];
        nameGreeting = `Hi, ${randomAdj} Barnita ${randomEmo}`;
    } else if (name === "Bibek/BB") {
        const emoticons = ["O_O", "o_o", "0_0", "._.", "-_-", ">_<", "X_X", "@_@", "(°_°)", "(⊙_⊙)", "(UwU)", "(OwO)", "c:", ":>", ":D", "xD", "^^", ".-.", ">.<", "°_°", "<3", "♡", "♥", "ε>", "^_^", "^.^", "^o^", "^◡^", "^w^", "^u^", ">◡<", "•ᴗ•", "'◡'"];
        const randomEmo = emoticons[Math.floor(Math.random() * emoticons.length)];
        nameGreeting = `Hi, Bibek ${randomEmo}`;
    } else {
        const cleanName = name ? name.replace(/\/BB$/, '') : '';
        nameGreeting = cleanName ? `Hi ${cleanName},` : "Hi,";
    }

    DOM.greetingLine1.textContent = nameGreeting;
    DOM.greetingLine2.innerHTML = `${timeGreeting} <span class="mx-2 text-slate-600 font-light text-lg align-middle">&bull;</span> ${dateStr}`;
}

// --- HAPTICS UTILITY ---
const HAPTIC = {
    tap: 35,
    action: 75,
    success: 100,
    warning: 200,
    destructive: [100, 50, 150]
};

function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

// --- DATABASE ---
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(APP.dbName, APP.version);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(APP.storeName)) {
                db.createObjectStore(APP.storeName, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { APP.db = e.target.result; resolve(APP.db); };
        request.onerror = (e) => reject(e);
    });
}

function getKey(date, mode) {
    return `${mode}_${date}`;
}

async function saveClip(date, mode, blob) {
    const id = getKey(date, mode);
    return new Promise((resolve, reject) => {
        const tx = APP.db.transaction(APP.storeName, 'readwrite');
        const store = tx.objectStore(APP.storeName);
        store.put({ id: id, date: date, mode: mode, blob: blob, timestamp: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getClip(date, mode) {
    if (!APP.db) return null;
    const id = getKey(date, mode);
    return new Promise((resolve) => {
        const tx = APP.db.transaction(APP.storeName, 'readonly');
        const req = tx.objectStore(APP.storeName).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

async function deleteClip(date, mode) {
    const id = getKey(date, mode);
    return new Promise((resolve, reject) => {
        const tx = APP.db.transaction(APP.storeName, 'readwrite');
        const store = tx.objectStore(APP.storeName);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getAllClips(mode) {
    if (!APP.db) return [];
    return new Promise((resolve) => {
        const tx = APP.db.transaction(APP.storeName, 'readonly');
        const req = tx.objectStore(APP.storeName).getAll();
        req.onsuccess = () => {
            const all = req.result || [];
            resolve(all.filter(c => c.mode === mode));
        };
    });
}

// --- SEARCH LOGIC ---
DOM.btnSearch.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    handleSearch();
});
DOM.dateSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

DOM.dateSearchInput.addEventListener('input', () => {
    DOM.searchError.classList.add('opacity-0', 'pointer-events-none');
    DOM.searchError.classList.remove('translate-y-0');
    DOM.searchError.classList.add('translate-y-[-4px]');

    DOM.searchContainer.classList.remove('border-rose-500/50', 'ring-2', 'ring-rose-500/20');
    DOM.searchContainer.classList.add('border-slate-700/50');
});

function triggerSearchError(msg) {
    DOM.searchError.querySelector('span').textContent = msg;
    DOM.searchError.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-[-4px]');
    DOM.searchError.classList.add('translate-y-0');
    DOM.searchContainer.classList.remove('border-slate-700/50');
    DOM.searchContainer.classList.add('border-rose-500/50', 'ring-2', 'ring-rose-500/20');
    vibrate(HAPTIC.warning);
    DOM.searchContainer.classList.add('animate-shake');
    setTimeout(() => DOM.searchContainer.classList.remove('animate-shake'), 400);
}

async function handleSearch() {
    const input = DOM.dateSearchInput.value.trim();
    const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const dayRegex = /^Day-(\d+)$/i;

    let isoDate;
    let targetYear, targetMonth;

    if (dayRegex.test(input)) {
        const match = input.match(dayRegex);
        const dayNum = parseInt(match[1], 10);
        const currentYear = new Date().getFullYear();

        if (dayNum < 1 || dayNum > 366) {
            triggerSearchError("Invalid Day Number");
            return;
        }

        const calculatedDate = new Date(currentYear, 0, dayNum);
        if (calculatedDate.getFullYear() !== currentYear) {
            triggerSearchError(`Day-${dayNum} does not exist in ${currentYear}`);
            return;
        }

        const y = calculatedDate.getFullYear();
        const m = String(calculatedDate.getMonth() + 1).padStart(2, '0');
        const d = String(calculatedDate.getDate()).padStart(2, '0');
        isoDate = `${y}-${m}-${d}`;

        targetYear = y;
        targetMonth = calculatedDate.getMonth();

    } else if (dateRegex.test(input)) {
        const match = input.match(dateRegex);
        const [_, d, m, y] = match;
        isoDate = `${y}-${m}-${d}`;

        const testDate = new Date(isoDate);
        if (isNaN(testDate.getTime()) || testDate.getMonth() + 1 !== parseInt(m)) {
            triggerSearchError("Date does not exist");
            return;
        }

        targetYear = Number(y);
        targetMonth = Number(m) - 1;

    } else {
        triggerSearchError("Format: DD-MM-YYYY or Day-X");
        return;
    }

    const clip = await getClip(isoDate, APP.mode);
    if (clip && clip.blob && clip.blob.size > 0) {
        vibrate(HAPTIC.success);
        DOM.searchError.classList.add('opacity-0', 'pointer-events-none');
        DOM.searchContainer.classList.remove('border-rose-500/50', 'ring-2');
        DOM.searchContainer.classList.add('border-slate-700/50');
        APP.viewDate = new Date(targetYear, targetMonth, 1);
        updateMonthLabel();
        await renderCalendar();
        // Pass null trigger for search (fallback to fade)
        openClipModal(isoDate, null);
    } else {
        triggerSearchError("No recording found.");
    }
}

// --- VIEW & NAVIGATION LOGIC ---

function updateMonthLabel() {
    DOM.monthLabel.textContent = APP.viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

async function renderCalendar() {
    const clips = await getAllClips(APP.mode);
    const validClips = clips.filter(c => c.blob && c.blob.size > 0);
    const clipMap = new Map(validClips.map(c => [c.date, c]));

    DOM.calendarGrid.innerHTML = '';

    const year = APP.viewDate.getFullYear();
    const month = APP.viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // NEW: Toggle Year Compile Button
    // Show only if viewing December (Month 11)
    if (month === 11) {
        DOM.btnCompileYear.classList.remove('hidden');
    } else {
        DOM.btnCompileYear.classList.add('hidden');
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(year, month, d);
        const dayOfYear = getDayOfYear(dateObj);

        const el = document.createElement('div');
        // Added 'reveal-item' base class
        el.className = 'day-cell reveal-item';

        // Add staggered delay based on day index (modulo to keep loop clean)
        // This creates a wave effect as days load in
        const staggerIndex = (d % 10) * 30; // 30ms increment
        el.style.transitionDelay = `${staggerIndex}ms`;

        el.title = formatDateDisplay(dateStr);

        const clip = clipMap.get(dateStr);
        const isTarget = dateStr === APP.targetDate;

        el.innerHTML = `<span class="text-[10px] font-bold opacity-60">Day</span><span class="text-lg font-bold leading-none mt-0.5">${dayOfYear}</span>`;

        if (clip) {
            el.classList.add('filled');
            el.onclick = () => {
                vibrate(HAPTIC.tap);
                openClipModal(clip, el); // Pass element for animation
            };
        } else {
            el.onclick = () => {
                vibrate(HAPTIC.tap);
                setTargetDate(dateStr);
            };
        }

        if (isTarget) {
            el.classList.add('target-active');
        }

        DOM.calendarGrid.appendChild(el);

        // Register for animation immediately
        scrollObserver.observe(el);
    }
}

DOM.btnPrevMonth.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    APP.viewDate.setMonth(APP.viewDate.getMonth() - 1);
    updateMonthLabel();
    renderCalendar();
});

DOM.btnNextMonth.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    APP.viewDate.setMonth(APP.viewDate.getMonth() + 1);
    updateMonthLabel();
    renderCalendar();
});

// --- MODE SWITCHING ---

function setMode(mode) {
    APP.mode = mode;
    APP.targetDate = APP.today;
    updateTargetUI();

    if (mode === 'self') {
        DOM.modeSelf.classList.replace('text-slate-400', 'text-white');
        DOM.modeScene.classList.replace('text-white', 'text-slate-400');
        DOM.modeBg.style.transform = 'translateX(0)';
        DOM.btnSwitchCam.classList.add('hidden');
        DOM.cameraPreview.classList.add('mirrored');
    } else {
        DOM.modeScene.classList.replace('text-slate-400', 'text-white');
        DOM.modeSelf.classList.replace('text-white', 'text-slate-400');
        DOM.modeBg.style.transform = 'translateX(100%)';
        DOM.cameraPreview.classList.remove('mirrored');
        if (APP.cameraStream) DOM.btnSwitchCam.classList.remove('hidden');
    }

    renderCalendar();
    resetRecorderUI();
    if (APP.cameraStream) startCamera();
}

DOM.modeSelf.addEventListener('click', () => { vibrate(HAPTIC.tap); setMode('self'); });
DOM.modeScene.addEventListener('click', () => { vibrate(HAPTIC.tap); setMode('scene'); });

// --- REPLACE / TARGET LOGIC ---

function setTargetDate(date) {
    APP.targetDate = date;
    updateTargetUI();
    resetRecorderUI();
    renderCalendar();
}

function updateTargetUI() {
    DOM.targetDateDisplay.textContent = formatDateDisplay(APP.targetDate);
    if (APP.targetDate !== APP.today) {
        DOM.targetIndicator.classList.remove('hidden');
        DOM.statusText.textContent = `Ready for ${formatDateDisplay(APP.targetDate)}`;
        DOM.statusText.classList.remove('opacity-0');
    } else {
        DOM.targetIndicator.classList.add('hidden');
        DOM.statusText.textContent = "Ready";
        DOM.statusText.classList.remove('opacity-0');
    }
    checkTargetStatus();
}

async function checkTargetStatus() {
    const existing = await getClip(APP.targetDate, APP.mode);
    if (existing && existing.blob && existing.blob.size > 0) {
        showDoneState(existing.blob);
    } else {
        showReadyState();
    }
}

// --- ANIMATED MODAL LOGIC (iOS FLIP Style) ---

async function openClipModal(clipOrDate, triggerEl = null) {
    let clip;
    let date;

    if (typeof clipOrDate === 'string') {
        date = clipOrDate;
        clip = await getClip(date, APP.mode);
    } else {
        clip = clipOrDate;
        date = clip.date;
    }

    if (!clip || !clip.blob || clip.blob.size === 0) {
        triggerSearchError("Error: Valid recording not found");
        return;
    }

    activeTriggerEl = triggerEl;

    try {
        // Setup Video
        const file = new File([clip.blob], "preview.webm", { type: clip.blob.type });
        DOM.modalVideo.src = URL.createObjectURL(file);
        DOM.modalDateDisplay.textContent = formatDateDisplay(date);

        // Reset Custom Controls
        resetVideoControls();

        if (clip.timestamp) {
            DOM.modalTimeDisplay.textContent = formatTimeDisplay(clip.timestamp);
            DOM.modalTimeDisplay.classList.remove('hidden');
        } else {
            DOM.modalTimeDisplay.classList.add('hidden');
        }

        // Prepare for Animation
        DOM.clipModal.classList.remove('hidden', 'modal-hidden');
        DOM.clipModal.classList.add('flex');

        const modalContent = DOM.clipModal.firstElementChild;

        if (triggerEl) {
            // FLIP Animation Logic
            const triggerRect = triggerEl.getBoundingClientRect();
            const modalRect = modalContent.getBoundingClientRect();

            // Calculate scales
            const scaleX = triggerRect.width / modalRect.width;
            const scaleY = triggerRect.height / modalRect.height;

            const translateX = triggerRect.left - modalRect.left;
            const translateY = triggerRect.top - modalRect.top;

            // DYNAMIC BORDER RADIUS CALCULATION
            // We need to counteract the scale. If we want visual radius X at scale Y, 
            // the actual CSS radius needs to be X / Y.
            const computedStyle = window.getComputedStyle(triggerEl);
            const targetRadius = parseFloat(computedStyle.borderRadius);
            const compensatedRadius = targetRadius / scaleX; // Counter-scale the radius

            // Apply Initial State (Instant)
            modalContent.style.transition = 'none';
            modalContent.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

            // FIX: START FULLY OPAQUE to act as the expanded element
            modalContent.style.opacity = '1';
            modalContent.style.borderRadius = `${compensatedRadius}px`; // UPDATED: Dynamic calculation
            modalContent.style.padding = '0';

            // UPDATED: Disable transition on trigger momentarily to prevent fade out on open
            triggerEl.style.transition = 'none';
            triggerEl.classList.add('animating-source');
            // Force reflow
            triggerEl.offsetHeight;
            triggerEl.style.transition = '';

            // Force Reflow
            modalContent.offsetHeight;

            // Play Animation to Final State
            requestAnimationFrame(() => {
                modalContent.style.transition = '';
                modalContent.style.transform = 'translate(0, 0) scale(1, 1)';
                modalContent.style.opacity = '1';
                modalContent.style.borderRadius = '1.5rem'; // Standard modal radius (rounded-3xl approx)
                modalContent.style.padding = '0';
            });

        } else {
            // Fallback for non-grid opens (search, review after recording)
            modalContent.style.transition = 'none';
            modalContent.style.transform = 'scale(0.95)';
            modalContent.style.opacity = '0';
            modalContent.offsetHeight;

            requestAnimationFrame(() => {
                modalContent.style.transition = '';
                modalContent.style.transform = 'scale(1)';
                modalContent.style.opacity = '1';
            });
        }

        // --- Attach Action Handlers ---

        // --- DOWNLOAD HANDLER (UPDATED with Options) ---

        // Toggle Menu
        DOM.btnDownloadClip.onclick = (e) => {
            e.stopPropagation();
            vibrate(HAPTIC.tap);
            const menu = DOM.downloadOptionsMenu;

            if (menu.classList.contains('hidden')) {
                menu.classList.remove('hidden');
                // Small delay to allow display:block to apply before transition
                requestAnimationFrame(() => {
                    menu.classList.remove('opacity-0', 'scale-95');
                });
            } else {
                closeDownloadMenu();
            }
        };

        // Close Menu Helper
        function closeDownloadMenu() {
            const menu = DOM.downloadOptionsMenu;
            menu.classList.add('opacity-0', 'scale-95');
            setTimeout(() => {
                menu.classList.add('hidden');
            }, 200);
        }

        // Global Close on Click Outside
        // (We attach this once, but it's safe to re-attach or check target)
        window.addEventListener('click', (e) => {
            if (!DOM.downloadOptionsMenu.classList.contains('hidden')) {
                if (!e.target.closest('#downloadOptionsMenu') && !e.target.closest('#btnDownloadClip')) {
                    closeDownloadMenu();
                }
            }
        });

        // Option 1: Original (No Watermark)
        DOM.btnDownloadOriginal.onclick = () => {
            vibrate(HAPTIC.success);
            closeDownloadMenu();

            const safeMode = clip.mode || APP.mode;
            const safeName = getSafeUsername();
            // Append '_original' if desired, or keep standard name
            const fileName = `${safeName}_${safeMode}_${formatDateDisplay(date)}.webm`;
            downloadFile(clip.blob, fileName);
        };

        // Option 2: Watermarked (Existing Logic)
        DOM.btnDownloadWatermark.onclick = async () => {
            vibrate(HAPTIC.success);
            closeDownloadMenu();

            if (DOM.btnDownloadClip.disabled) return;

            DOM.btnDownloadClip.disabled = true;
            DOM.dlIconContainer.classList.add('hidden');
            DOM.dlSpinner.classList.remove('hidden');

            try {
                const watermarkedBlob = await processWatermarkedDownload(clip.blob, clip.date, APP.mode);
                const safeMode = clip.mode || APP.mode;
                const safeName = getSafeUsername();
                const fileName = `${safeName}_${safeMode}_${formatDateDisplay(date)}.webm`;
                downloadFile(watermarkedBlob, fileName);
            } catch (err) {
                console.error("Watermark download failed", err);
                alert("Failed to process download. Please try again.");
            } finally {
                DOM.btnDownloadClip.disabled = false;
                DOM.dlIconContainer.classList.remove('hidden');
                DOM.dlSpinner.classList.add('hidden');
            }
        };

    } catch (e) {
        console.error("Error displaying video", e);
        DOM.statusText.textContent = "Error: Video unavailable";
        return;
    }

    DOM.btnDeleteClip.onclick = async () => {
        if (DOM.btnDeleteClip.dataset.state === 'confirm') {
            vibrate(HAPTIC.destructive);
            await deleteClip(date, APP.mode);

            // Simple close for delete, no morph back needed as item is gone
            DOM.clipModal.classList.add('hidden', 'modal-hidden');
            DOM.clipModal.classList.remove('flex');
            if (activeTriggerEl) activeTriggerEl.classList.remove('animating-source');

            await renderCalendar();
            setTargetDate(APP.today);
            resetDeleteBtn();
        } else {
            vibrate(HAPTIC.warning);
            DOM.btnDeleteClip.dataset.state = 'confirm';
            DOM.btnDeleteClip.innerHTML = '<div class="w-4 h-4 flex items-center justify-center"><span class="text-red-400 font-extrabold text-sm">?</span></div>';
            setTimeout(() => {
                if (DOM.btnDeleteClip.dataset.state === 'confirm') resetDeleteBtn();
            }, 3000);
        }
    };

    DOM.btnReplaceClip.onclick = async () => {
        vibrate(HAPTIC.tap);

        // 1. Just animate out (Don't delete yet)
        closeModal();
        if (activeTriggerEl) activeTriggerEl.classList.remove('animating-source');

        // 2. Prepare Camera for THIS day
        setTimeout(async () => {
            // CRITICAL: Force target date to match the day we are replacing
            APP.targetDate = date;

            await renderCalendar();

            // Update UI 
            DOM.targetDateDisplay.textContent = formatDateDisplay(APP.targetDate);
            DOM.targetIndicator.classList.remove('hidden');
            DOM.statusText.textContent = `Ready for ${formatDateDisplay(APP.targetDate)}`;

            // Ensure camera is ready
            showReadyState();

            resetReplaceBtn();
        }, 400);
    };
}

function resetDeleteBtn() {
    DOM.btnDeleteClip.dataset.state = '';
    DOM.btnDeleteClip.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4 group-hover:scale-110 transition-transform"></i>';
    lucide.createIcons();
}

function resetReplaceBtn() {
    DOM.btnReplaceClip.dataset.state = '';
    DOM.btnReplaceClip.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i>';
    lucide.createIcons();
}

// UPDATED: Closing Sequence with Cross-fade Logic
function closeModal() {
    vibrate(HAPTIC.tap);
    DOM.modalVideo.pause();

    if (activeTriggerEl) {
        const modalContent = DOM.clipModal.firstElementChild;
        const modalRect = modalContent.getBoundingClientRect();
        const triggerRect = activeTriggerEl.getBoundingClientRect();

        const scaleX = triggerRect.width / modalRect.width;
        const scaleY = triggerRect.height / modalRect.height;
        const translateX = triggerRect.left - modalRect.left;
        const translateY = triggerRect.top - modalRect.top;

        // DYNAMIC BORDER RADIUS CALCULATION
        const computedStyle = window.getComputedStyle(activeTriggerEl);
        const targetRadius = parseFloat(computedStyle.borderRadius);
        const compensatedRadius = targetRadius / scaleX;

        // PHASE 1: Morph Only (Keep Opacity 1)
        // Explicitly set transition for transform/radius only - override default CSS
        modalContent.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
        modalContent.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
        modalContent.style.borderRadius = `${compensatedRadius}px`; // UPDATED: Dynamic calculation
        modalContent.style.padding = '0';
        modalContent.style.opacity = '1';

        // COUNTER-SCALE FOR VIDEO (Object-Fit: Cover Behavior)
        // Calculate the uniform scale we want (fitting the tightest dimension)
        const targetScale = Math.max(scaleX, scaleY);
        // Calculate how much we need to scale the child properties to achieve that target
        // effectiveScale = parentScale * childScale
        // childScale = targetScale / parentScale
        const childScaleX = targetScale / scaleX;
        const childScaleY = targetScale / scaleY;

        // Apply to video wrapper to maintain content aspect ratio
        DOM.videoContainer.style.transformOrigin = 'top left';
        DOM.videoContainer.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
        DOM.videoContainer.style.transform = `scale(${childScaleX}, ${childScaleY})`;
        modalContent.style.opacity = '1';

        // Fade out the black backdrop immediately though
        DOM.clipModal.classList.add('modal-hidden');

        // PHASE 2: Cross-fade (Triggered after morph completes)
        setTimeout(() => {
            // 1. Reveal Badge (Fade In)
            // Ensure the badge has a smooth opacity transition (added in CSS)
            activeTriggerEl.classList.remove('animating-source');

            // 2. Hide Modal (Fade Out)
            modalContent.style.transition = 'opacity 0.2s ease';
            modalContent.style.opacity = '0';

            // PHASE 3: Cleanup (After Fade)
            setTimeout(() => {
                // Check if cancelled by quick reopen
                if (!DOM.clipModal.classList.contains('modal-hidden')) return;

                DOM.clipModal.classList.remove('flex');
                DOM.clipModal.classList.add('hidden');

                // Reset styles
                modalContent.style.transform = '';
                modalContent.style.opacity = '';
                modalContent.style.borderRadius = '';
                modalContent.style.transition = '';
                modalContent.style.transition = '';
                modalContent.style.padding = '';

                // Reset Video Wrapper
                DOM.videoContainer.style.transform = '';
                DOM.videoContainer.style.transition = '';
                DOM.videoContainer.style.transformOrigin = '';

                activeTriggerEl = null;
                resetDeleteBtn();
                resetReplaceBtn();
            }, 200); // Wait for opacity fade out

        }, 500); // Wait for morph transform

    } else {
        // Fallback for non-grid closes
        DOM.clipModal.classList.add('modal-hidden');
        setTimeout(() => {
            DOM.clipModal.classList.add('hidden');
            DOM.clipModal.classList.remove('flex');
            resetDeleteBtn();
            resetReplaceBtn();
        }, 400);
    }
}

DOM.btnCloseClip.addEventListener('click', closeModal);

// --- CAMERA & FLASH LOGIC ---

DOM.btnInit.addEventListener('click', () => {
    vibrate(HAPTIC.action);
    startCamera();
});

DOM.btnSwitchCam.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    APP.sceneCamFacing = APP.sceneCamFacing === 'environment' ? 'user' : 'environment';
    startCamera();
});

DOM.btnFlash.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    toggleFlashState();
});

function toggleFlashState() {
    APP.flashEnabled = !APP.flashEnabled;
    updateFlashUI();
}

function updateFlashUI() {
    if (APP.flashEnabled) {
        DOM.btnFlash.classList.replace('text-slate-300', 'text-yellow-400');
        DOM.iconFlash.setAttribute('data-lucide', 'zap');
    } else {
        DOM.btnFlash.classList.replace('text-yellow-400', 'text-slate-300');
        DOM.iconFlash.setAttribute('data-lucide', 'zap-off');
    }
    lucide.createIcons();
}

async function applyTorch(state) {
    if (APP.hasTorch && APP.trackRef) {
        try {
            await APP.trackRef.applyConstraints({ advanced: [{ torch: state }] });
        } catch (e) {
            console.warn("Torch failed", e);
        }
    }
}

async function startCamera() {
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        DOM.statusText.textContent = "Error: HTTPS Required";
        return;
    }

    if (APP.cameraStream) {
        APP.cameraStream.getTracks().forEach(t => t.stop());
        if (APP.animationId) cancelAnimationFrame(APP.animationId);
    }

    DOM.statusText.textContent = "Starting camera...";
    let constraints = {
        audio: true,
        video: {
            facingMode: APP.mode === 'self' ? 'user' : { ideal: APP.sceneCamFacing }
        }
    };

    try {
        APP.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        DOM.cameraPreview.srcObject = APP.cameraStream;
        await DOM.cameraPreview.play();
        DOM.cameraPreview.classList.remove('hidden');
        DOM.playbackPreview.classList.add('hidden');
        DOM.startOverlay.classList.add('opacity-0', 'pointer-events-none');
        DOM.recordControls.classList.remove('hidden');
        DOM.statusText.textContent = `Ready (${APP.mode})`;
        DOM.statusText.classList.remove('opacity-0');

        if (APP.mode === 'self') {
            DOM.cameraPreview.classList.add('mirrored');
        } else {
            DOM.cameraPreview.classList.remove('mirrored');
        }

        DOM.btnFlash.classList.remove('hidden');
        if (APP.mode === 'scene') DOM.btnSwitchCam.classList.remove('hidden');

        const track = APP.cameraStream.getVideoTracks()[0];
        APP.trackRef = track;
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        APP.hasTorch = !!capabilities.torch;

        updateCanvasLoop();

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            DOM.statusText.textContent = "Error: " + err.name;
        }
    }
}

// --- NEW: CLEAN RECORDING LOOP ---
function updateCanvasLoop() {
    const ctx = DOM.processingCanvas.getContext('2d');
    const video = DOM.cameraPreview;
    const canvas = DOM.processingCanvas;

    function draw() {
        if (video.readyState >= 2) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            if (canvas.width !== vw || canvas.height !== vh) {
                canvas.width = vw;
                canvas.height = vh;
            }

            const cw = canvas.width;
            const ch = canvas.height;

            ctx.save();
            if (APP.mode === 'self') {
                ctx.translate(cw, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(video, 0, 0, cw, ch);
            ctx.restore();
        }
        APP.animationId = requestAnimationFrame(draw);
    }
    draw();
}

// --- NEW: WATERMARK LOGIC ISOLATED & FIXES ---

// Helper: Pure path definition (no beginPath inside)
function drawRoundedRectPath(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); // Top-right
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); // Bottom-right
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); // Bottom-left (FIXED)
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); // Top-left
}

// UPDATED: Now accepts sourceElement (the video) to enable blur effect
function drawWatermark(ctx, cw, ch, dateString, sourceElement) {
    ctx.save(); // Protect context

    const margin = cw * 0.04;
    const boxHeight = cw * 0.065;
    const boxRadius = boxHeight / 2;
    const fontSize = boxHeight * 0.45;
    const paddingX = boxHeight * 0.5;

    // Robust Date Parsing
    let y, m, d;
    if (dateString && dateString.includes('-')) {
        [y, m, d] = dateString.split('-');
    } else {
        const now = new Date();
        y = now.getFullYear(); m = now.getMonth() + 1; d = now.getDate();
    }

    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const dateText = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    const dayNum = getDayOfYear(dateObj);
    const dayText = `DAY ${dayNum}`;

    ctx.font = `700 ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const logoSize = boxHeight * 0.6;
    const gap = boxHeight * 0.4;

    const leftTextWidth = ctx.measureText(dateText).width;
    const leftBoxWidth = paddingX + logoSize + gap + leftTextWidth + paddingX;
    const leftBoxX = margin;
    const leftBoxY = ch - margin - boxHeight;

    const rightTextWidth = ctx.measureText(dayText).width;
    const rightBoxWidth = paddingX + rightTextWidth + paddingX;
    const rightBoxX = cw - margin - rightBoxWidth;
    const rightBoxY = ch - margin - boxHeight;

    // Updated overlay opacity for subtle look (0.3)
    const overlayColor = 'rgba(15, 23, 42, 0.3)';
    const textColor = '#cbcbcb';

    // --- LEFT BOX (With Blur) ---
    ctx.save();
    ctx.beginPath();
    drawRoundedRectPath(ctx, leftBoxX, leftBoxY, leftBoxWidth, boxHeight, boxRadius);
    ctx.clip(); // Clip to box shape

    if (sourceElement) {
        ctx.filter = 'blur(8px)'; // The blurred background effect
        // Draw video again, clipped to this box. 
        // Since canvas matches video size, 0,0 is correct.
        ctx.drawImage(sourceElement, 0, 0, cw, ch);
    }
    ctx.filter = 'none'; // Reset filter
    ctx.fillStyle = overlayColor;
    ctx.fill(); // Fill subtle overlay
    ctx.restore();

    // --- RIGHT BOX (With Blur) ---
    ctx.save();
    ctx.beginPath();
    drawRoundedRectPath(ctx, rightBoxX, rightBoxY, rightBoxWidth, boxHeight, boxRadius);
    ctx.clip();

    if (sourceElement) {
        ctx.filter = 'blur(8px)';
        ctx.drawImage(sourceElement, 0, 0, cw, ch);
    }
    ctx.filter = 'none';
    ctx.fillStyle = overlayColor;
    ctx.fill();
    ctx.restore();

    // --- CONTENT (Text/Icon) ---
    const iconY = leftBoxY + (boxHeight - logoSize) / 2;
    const iconX = leftBoxX + paddingX;

    if (APP.logoImg && APP.logoImg.complete && APP.logoImg.naturalHeight !== 0) {
        ctx.drawImage(APP.logoImg, iconX, iconY, logoSize, logoSize);
    }

    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(dateText, iconX + logoSize + gap, leftBoxY + (boxHeight / 2) + (fontSize * 0.05));
    ctx.fillText(dayText, rightBoxX + paddingX, rightBoxY + (boxHeight / 2) + (fontSize * 0.05));

    ctx.restore();
}

// --- FIXED: POST-PROCESS WATERMARK DOWNLOADER (NO FREEZE) ---
async function processWatermarkedDownload(cleanBlob, dateString, mode) {
    try {
        // Create video element
        const video = document.createElement('video');
        video.src = URL.createObjectURL(cleanBlob);
        video.muted = false; // Must be false to capture audio via createMediaElementSource
        video.playsInline = true;
        video.crossOrigin = "anonymous";

        // CRITICAL FIX: Append to DOM (hidden) so rAF works reliably
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-100';
        document.body.appendChild(video);

        // Step 1: Wait for video metadata to load
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
            setTimeout(() => reject(new Error('Video metadata load timeout')), 10000);
        });

        // Step 2: Seek to first valid frame (0.033s ≈ 1 frame at 30fps)
        video.currentTime = 0.033;

        // Wait for seek to complete
        await new Promise((resolve, reject) => {
            video.onseeked = resolve;
            video.onerror = reject;
            setTimeout(() => reject(new Error('Video seek timeout')), 5000);
        });

        // Step 3: Wait for frame data to be fully decoded
        await new Promise((resolve) => {
            const checkReady = () => {
                if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
                    resolve();
                } else {
                    setTimeout(checkReady, 50);
                }
            };
            checkReady();
        });

        // Step 4: Additional buffer to ensure frame is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step 5: Validate video dimensions
        const w = video.videoWidth;
        const h = video.videoHeight;

        if (w === 0 || h === 0) {
            throw new Error('Invalid video dimensions');
        }

        // Setup canvas
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // Step 6: Draw and validate first frame
        ctx.drawImage(video, 0, 0, w, h);
        drawWatermark(ctx, w, h, dateString, video);

        // Verify canvas isn't blank by sampling center pixel
        const imageData = ctx.getImageData(w / 2, h / 2, 1, 1);
        const isBlank = imageData.data[0] === 0 && imageData.data[1] === 0 && imageData.data[2] === 0;

        if (isBlank) {
            // Retry drawing after one more frame delay
            await new Promise(resolve => setTimeout(resolve, 100));
            ctx.drawImage(video, 0, 0, w, h);
            drawWatermark(ctx, w, h, dateString, video);
        }

        // Step 7: Setup canvas stream (BEFORE starting recorder)
        const stream = canvas.captureStream(30);

        // Step 8: Setup audio pass-through
        let audioContext, sourceNode, audioDest;
        if (cleanBlob.type.includes('webm') || cleanBlob.type.includes('mp4')) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();

                // Resume if suspended (critical for mobile)
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }

                sourceNode = audioContext.createMediaElementSource(video);
                audioDest = audioContext.createMediaStreamDestination();
                sourceNode.connect(audioDest);
                const audioTrack = audioDest.stream.getAudioTracks()[0];
                if (audioTrack) stream.addTrack(audioTrack);
            } catch (e) {
                console.warn("Audio context failed", e);
            }
        }

        // Step 9: Setup MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
            ? 'video/webm; codecs=vp9'
            : 'video/webm';

        const recorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 5000000
        });

        const chunks = [];
        recorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        // Step 10: Define render loop with freeze prevention
        let renderLoopActive = false;
        let renderFrameId = null;
        const videoDuration = video.duration;
        // FIX: Removed the threshold that caused early freeze
        // const stopThreshold = videoDuration - 0.05; 

        const requestFrame = (cb) => {
            if (video.requestVideoFrameCallback) {
                renderFrameId = video.requestVideoFrameCallback(cb);
            } else {
                renderFrameId = requestAnimationFrame(cb);
            }
        };

        const cancelFrame = () => {
            if (renderFrameId !== null) {
                if (video.cancelVideoFrameCallback) {
                    video.cancelVideoFrameCallback(renderFrameId);
                } else {
                    cancelAnimationFrame(renderFrameId);
                }
                renderFrameId = null;
            }
        };

        function renderLoop() {
            // FIX: Stop ONLY when explicitly ended or paused, no artificial threshold
            if (!renderLoopActive || video.paused || video.ended) {
                renderLoopActive = false;
                cancelFrame();
                return;
            }

            ctx.drawImage(video, 0, 0, w, h);
            drawWatermark(ctx, w, h, dateString, video);

            requestFrame(renderLoop);
        }

        // Step 11: Reset video to start for final playback
        video.currentTime = 0;
        await new Promise(resolve => {
            video.onseeked = resolve;
            setTimeout(resolve, 100); // Fallback
        });

        // FIX: Start Recorder FIRST to capture the very first frame (Step 6 result)
        // This prevents cutting the first 150ms of the video
        recorder.start();

        // Step 12: Start playback
        // Use a try-catch for play() as it can be flaky if not user-initiated
        try {
            await video.play();
        } catch (e) {
            if (e.name !== 'AbortError') console.error("Play error", e);
        }

        renderLoopActive = true;
        renderLoop();

        // Step 16: Wait for video to complete with proper cleanup
        await new Promise((resolve, reject) => {
            video.onended = () => {
                renderLoopActive = false;
                cancelFrame(); // Cancel any pending frames

                // Small delay to ensure last valid frame is captured
                setTimeout(() => {
                    recorder.stop();
                    resolve();
                }, 50);
            };
            video.onerror = (e) => {
                console.error("Video playback error", e);
                renderLoopActive = false;
                cancelFrame();
                reject(e);
            };
        });

        // Step 17: Wait for recorder to finish
        await new Promise(resolve => {
            recorder.onstop = resolve;
            setTimeout(resolve, 1000); // Fallback timeout
        });

        // Step 18: Cleanup
        if (audioContext) {
            try { await audioContext.close(); } catch (e) { }
        }
        document.body.removeChild(video);
        URL.revokeObjectURL(video.src);

        // Step 19: Create and return final blob
        if (chunks.length === 0) {
            throw new Error('No video data recorded');
        }

        return new Blob(chunks, { type: 'video/webm' });

    } catch (error) {
        console.error('processWatermarkedDownload error:', error);

        // Cleanup on error
        const videos = document.querySelectorAll('video[style*="z-index: -100"]');
        videos.forEach(v => {
            try {
                if (v.parentNode) document.body.removeChild(v);
                if (v.src) URL.revokeObjectURL(v.src);
            } catch (e) { }
        });

        throw error;
    }
}


// --- RECORDING LIFECYCLE ---

DOM.btnRecord.addEventListener('click', () => {
    vibrate(HAPTIC.success);
    startRecording();
});

async function startRecording() {
    if (!APP.cameraStream) return;

    DOM.btnRecord.disabled = true;
    DOM.recIcon.classList.replace('rounded-sm', 'rounded-full');
    DOM.recIcon.classList.add('animate-pulse');
    DOM.statusText.textContent = "Recording...";
    APP.recordedChunks = [];

    if (APP.flashEnabled) {
        if (APP.hasTorch) {
            applyTorch(true);
        } else {
            DOM.cameraContainer.classList.add('flash-active');
        }
    }

    const mimeOptions = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
    const selectedMime = mimeOptions.find(type => MediaRecorder.isTypeSupported(type));

    try {
        // FIX: Record directly from Camera Stream (Raw & Clean)
        // This bypasses the canvas, ensuring no watermark, logo, or mirroring is baked in.
        // It also simplifies audio handling as the stream already has tracks.

        APP.mediaRecorder = new MediaRecorder(APP.cameraStream, {
            mimeType: selectedMime,
            videoBitsPerSecond: 2500000
        });
    } catch (e) {
        DOM.statusText.textContent = "Rec Error: " + e.message;
        return;
    }

    APP.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) APP.recordedChunks.push(e.data);
    };

    APP.mediaRecorder.onstop = async () => {
        // FIX: Do NOT stop tracks here as we are using the live camera stream.
        // We want the camera to keep running for the next preview/recording.
        // Also removed APP.recAudioCtx cleanup as it's no longer used.

        if (APP.flashEnabled) {
            if (APP.hasTorch) {
                applyTorch(false);
            } else {
                DOM.cameraContainer.classList.remove('flash-active');
            }
        }

        const blob = new Blob(APP.recordedChunks, { type: selectedMime.split(';')[0] });

        if (blob.size < 5000) {
            DOM.statusText.textContent = "Error: File too small. Try again.";
            vibrate(HAPTIC.warning);
            setTimeout(() => resetRecorderUI(), 2000);
            return;
        }

        await handleRecordingComplete(blob);
    };

    const recordDuration = APP.mode === 'scene' ? 3000 : 1000;

    // FIX: Add delay for Flash Stabilization
    // If flash is enabled, wait 400ms for camera AE/AWB to settle before recording
    const startDelay = APP.flashEnabled ? 400 : 0;

    setTimeout(() => {
        APP.mediaRecorder.start();

        const circumference = 45 * 2 * Math.PI;
        DOM.progressCircle.style.strokeDashoffset = circumference;

        // Reset transition to ensure smooth start after delay
        DOM.progressCircle.style.transition = 'none';
        DOM.progressCircle.style.strokeDashoffset = circumference;

        // Start animation in next frame
        requestAnimationFrame(() => {
            DOM.progressCircle.style.transition = `stroke-dashoffset ${recordDuration / 1000}s linear`;
            DOM.progressCircle.style.strokeDashoffset = '0';
        });

        setTimeout(() => {
            if (APP.mediaRecorder.state === 'recording') APP.mediaRecorder.stop();
        }, recordDuration);

    }, startDelay);
}

async function handleRecordingComplete(cleanBlob) {
    // 1. Save CLEAN version to DB
    await saveClip(APP.targetDate, APP.mode, cleanBlob);

    // 2. Prepare Watermarked Download (Robust Fallback System)
    DOM.statusText.textContent = "Processing Download...";

    try {
        // Wrap total operation in a master timeout (30 seconds max)
        const watermarkedBlob = await withTimeout(
            processWatermarkedDownload(cleanBlob, APP.targetDate, APP.mode),
            30000,
            "Total processing time exceeded"
        );

        const safeName = getSafeUsername();
        downloadFile(watermarkedBlob, `${safeName}_${APP.mode}_${formatDateDisplay(APP.targetDate)}.webm`);
        DOM.statusText.textContent = "Saved.";

    } catch (e) {
        console.error("Watermark processing failed:", e);

        // FALLBACK: Download the original clean video
        // This prevents data loss when processing hangs/fails
        DOM.statusText.textContent = "Processing Failed. Saved Original.";
        vibrate(HAPTIC.warning);

        const safeName = getSafeUsername();
        // Append '_raw' to distinguish
        downloadFile(cleanBlob, `${safeName}_${APP.mode}_${formatDateDisplay(APP.targetDate)}_raw.webm`);

        // Show a non-blocking toast/alert (simulated via existing UI or alert)
        setTimeout(() => {
            alert(`Processing failed (${e.message}). Downloading original video instead.`);
        }, 500);
    }

    await renderCalendar();
    showDoneState(cleanBlob); // Show CLEAN video in preview
    vibrate(HAPTIC.success);
}

function showDoneState(blob) {
    if (APP.cameraStream) {
        APP.cameraStream.getTracks().forEach(t => t.stop());
        APP.cameraStream = null;
        if (APP.animationId) cancelAnimationFrame(APP.animationId);
    }

    DOM.playbackPreview.src = URL.createObjectURL(blob);
    DOM.playbackPreview.classList.remove('hidden');
    DOM.cameraPreview.classList.add('hidden');
    DOM.doneOverlay.classList.remove('hidden');
    DOM.recordControls.classList.add('hidden');
    DOM.btnFlash.classList.add('hidden');
    DOM.btnSwitchCam.classList.add('hidden');
    DOM.statusText.textContent = "Saved.";

    DOM.btnViewClip.onclick = () => {
        vibrate(HAPTIC.tap);
        // openClipModal handles logic for "Review"
        // We pass the blob directly to avoid DB fetch lag
        const tempClip = { date: APP.targetDate, mode: APP.mode, blob: blob };
        openClipModal(tempClip);
    };
}

function resetRecorderUI() {
    DOM.doneOverlay.classList.add('hidden');
    DOM.playbackPreview.classList.add('hidden');
    DOM.cameraPreview.classList.remove('hidden');

    if (!APP.cameraStream) {
        DOM.recordControls.classList.add('hidden');
        DOM.startOverlay.classList.remove('opacity-0', 'pointer-events-none');
        DOM.btnFlash.classList.add('hidden');
        DOM.btnSwitchCam.classList.add('hidden');
        DOM.statusText.textContent = "Ready";
    } else {
        DOM.recordControls.classList.remove('hidden');
        DOM.btnFlash.classList.remove('hidden');
        if (APP.mode === 'scene') DOM.btnSwitchCam.classList.remove('hidden');
    }

    showReadyState();
}

function showReadyState() {
    DOM.doneOverlay.classList.add('hidden');
    DOM.playbackPreview.classList.add('hidden');
    DOM.cameraPreview.classList.remove('hidden');

    DOM.progressCircle.style.transition = 'none';
    DOM.progressCircle.style.strokeDashoffset = 45 * 2 * Math.PI;
    DOM.btnRecord.disabled = false;
    DOM.recIcon.classList.replace('rounded-full', 'rounded-sm');
    DOM.recIcon.classList.remove('animate-pulse');
}

// --- COMPILATION CORE (CONTEXT AWARE) ---

// Month View Music Input Handler
DOM.monthMusicInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Update State
        APP.musicConfig.file = file;
        APP.musicConfig.start = 0;
        APP.musicConfig.end = null;

        // Get Duration for later
        const tempAudio = new Audio(URL.createObjectURL(file));
        tempAudio.onloadedmetadata = () => {
            APP.musicConfig.duration = tempAudio.duration;
            APP.musicConfig.end = tempAudio.duration;
        };

        // Update UI
        DOM.monthMusicText.textContent = file.name;

        // Active Styling
        DOM.monthMusicWrapper.classList.add('border-rose-500/50', 'bg-slate-700/30');
        DOM.monthMusicWrapper.classList.remove('border-slate-700', 'bg-slate-800');

        DOM.monthMusicIcon.classList.add('text-rose-400');
        DOM.monthMusicText.classList.add('text-white');
        DOM.monthMusicText.classList.remove('text-slate-400');

        // Show Controls
        DOM.btnRemoveMonthMusic.classList.remove('hidden');
        DOM.btnTrimMusic.classList.remove('hidden');
        DOM.musicDivider.classList.remove('hidden');

        vibrate(HAPTIC.success);
    }
});

// --- NEW: INSTAGRAM-STYLE TRIM LOGIC ---

async function calculateMonthDuration() {
    const clips = await getAllClips(APP.mode);
    const year = APP.viewDate.getFullYear();
    const month = String(APP.viewDate.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`;
    const monthClips = clips.filter(c => c.date.startsWith(monthPrefix));

    // Self mode = ~1s, Scene mode = ~3s
    const clipDuration = APP.mode === 'scene' ? 3 : 1;
    return {
        duration: monthClips.length * clipDuration,
        count: monthClips.length
    };
}

// --- CUSTOM VIDEO CONTROLS ---

let controlsTimeout;
let isScrubbing = false;

function setupCustomControls() {
    const video = DOM.modalVideo;
    const timeline = DOM.videoTimeline;

    // Play/Pause Toggle
    function togglePlay() {
        if (video.paused) {
            video.play().catch(e => console.log("Play error", e));
        } else {
            video.pause();
        }
        vibrate(HAPTIC.tap);
    }

    // Update UI State
    function updatePlayState() {
        // Fix: Re-inject HTML to ensure Lucide renders correctly every time
        const iconName = video.paused ? 'play' : 'pause';
        DOM.btnTogglePlay.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5 fill-current"></i>`;

        if (video.paused) {
            DOM.centerPlayOverlay.style.opacity = '1';
        } else {
            DOM.centerPlayOverlay.style.opacity = '0';
            // Trigger auto-hide if playing
            showControls();
        }
        lucide.createIcons();
    }

    // Timeline Update
    function updateProgress() {
        if (!isScrubbing) {
            const percent = (video.currentTime / video.duration) * 100 || 0;
            DOM.videoProgress.style.width = `${percent}%`;
            DOM.videoThumb.style.left = `${percent}%`;
        }

        // Update Buffer
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const duration = video.duration;
            if (duration > 0) {
                DOM.videoBuffered.style.width = `${(bufferedEnd / duration) * 100}%`;
            }
        }
    }

    // Seek / Scrub Logic
    function handleSeek(e) {
        const rect = timeline.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));

        if (isScrubbing) {
            DOM.videoProgress.style.width = `${clampedPos * 100}%`;
            DOM.videoThumb.style.left = `${clampedPos * 100}%`;
            video.currentTime = clampedPos * video.duration;
        } else {
            // Click to jump
            video.currentTime = clampedPos * video.duration;
        }
    }

    // Pointer Events for Dragging
    timeline.addEventListener('pointerdown', (e) => {
        isScrubbing = true;
        timeline.setPointerCapture(e.pointerId);
        handleSeek(e); // Jump immediately on click/down
        video.pause(); // Pause while scrubbing
    });

    timeline.addEventListener('pointermove', (e) => {
        if (isScrubbing) handleSeek(e);
    });

    timeline.addEventListener('pointerup', (e) => {
        if (isScrubbing) {
            isScrubbing = false;
            timeline.releasePointerCapture(e.pointerId);
            video.play(); // Resume after scrub
        }
    });

    // Loading State
    video.addEventListener('waiting', () => {
        DOM.videoLoader.style.opacity = '1';
    });
    video.addEventListener('playing', () => {
        DOM.videoLoader.style.opacity = '0';
    });
    video.addEventListener('canplay', () => {
        DOM.videoLoader.style.opacity = '0';
    });

    // Auto-Hide Controls
    function showControls() {
        DOM.customControls.style.opacity = '1';
        DOM.videoContainer.style.cursor = 'default';

        if (controlsTimeout) clearTimeout(controlsTimeout);

        if (!video.paused && !isScrubbing) {
            controlsTimeout = setTimeout(() => {
                DOM.customControls.style.opacity = '0';
                DOM.videoContainer.style.cursor = 'none';
            }, 2500);
        }
    }

    // Event Listeners
    DOM.btnTogglePlay.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlay();
    });

    // Toggle on video click (if not controls)
    DOM.videoContainer.addEventListener('click', (e) => {
        if (e.target.closest('#customControls')) return;
        togglePlay();
    });

    // Mouse movement shows controls
    DOM.videoContainer.addEventListener('mousemove', showControls);
    DOM.videoContainer.addEventListener('click', showControls);

    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);
    video.addEventListener('ended', updatePlayState);
    video.addEventListener('timeupdate', updateProgress);

    // Initial call
    lucide.createIcons();
}

function resetVideoControls() {
    DOM.videoProgress.style.width = '0%';
    DOM.videoThumb.style.left = '0%';
    DOM.videoBuffered.style.width = '0%';
    DOM.centerPlayOverlay.style.opacity = '1';

    // Reset Button HTML
    DOM.btnTogglePlay.innerHTML = `<i data-lucide="play" class="w-5 h-5 fill-current"></i>`;

    DOM.customControls.style.opacity = '1';
    DOM.videoLoader.style.opacity = '0';

    // Safety Reset for Animation Transforms
    DOM.videoContainer.style.transform = '';
    DOM.videoContainer.style.transition = '';

    lucide.createIcons();
}

// Initialize Controls
setupCustomControls();

function updateTrimUI(startTime) {
    // Clamp start time
    const maxStart = Math.max(0, APP.trimState.songDuration - APP.trimState.videoDuration);
    if (startTime < 0) startTime = 0;
    if (startTime > maxStart) startTime = maxStart;

    // Calculate visual position percentage
    const pct = (startTime / APP.trimState.songDuration) * 100;
    DOM.trimWindow.style.left = `${pct}%`;

    // Update displays
    DOM.trimStartDisplay.textContent = `${startTime.toFixed(1)}s`;
    const end = Math.min(startTime + APP.trimState.videoDuration, APP.trimState.songDuration);
    DOM.trimEndDisplay.textContent = `${end.toFixed(1)}s`;

    // Update Config temporarily (so preview works)
    APP.musicConfig.start = startTime;
    APP.musicConfig.end = end;
}

// Trim Button Handler (Entry Point)
DOM.btnTrimMusic.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!APP.musicConfig.file) return;

    // 1. Get Video Stats
    const stats = await calculateMonthDuration();
    APP.trimState.videoDuration = stats.duration || 1; // Prevent 0 division
    DOM.trimTotalTime.textContent = `Video Length: ${stats.duration}s`;
    DOM.trimClipCount.textContent = stats.count;

    if (stats.count === 0) {
        alert("No clips recorded for this month yet!");
        return;
    }

    // 2. Setup Audio
    const fileURL = URL.createObjectURL(APP.musicConfig.file);
    DOM.trimAudioPreview.src = fileURL;

    // 3. Initialize UI once metadata loads
    DOM.trimAudioPreview.onloadedmetadata = () => {
        APP.trimState.songDuration = DOM.trimAudioPreview.duration;

        // Logic: How wide should the window be?
        // window width % = (videoDuration / songDuration) * 100
        let windowPct = (APP.trimState.videoDuration / APP.trimState.songDuration) * 100;

        // Cap at 100% if video is longer than song (will loop)
        if (windowPct > 100) windowPct = 100;

        DOM.trimWindow.style.width = `${windowPct}%`;

        // Restore previous start position or default to 0
        updateTrimUI(APP.musicConfig.start || 0);

        DOM.trimModal.classList.remove('hidden');
        DOM.trimModal.classList.add('flex');
    };

    DOM.trimAudioPreview.load();
    vibrate(HAPTIC.tap);
});

// --- DRAG HANDLERS ---

const handleDragStart = (clientX) => {
    APP.trimState.isDragging = true;
    APP.trimState.startX = clientX;
    // Get current left % from style, convert to pixels
    const rect = DOM.trimTrackContainer.getBoundingClientRect();
    APP.trimState.containerWidth = rect.width;

    // Calculate current visual left in pixels
    const currentLeftPct = parseFloat(DOM.trimWindow.style.left || 0);
    APP.trimState.currentLeft = (currentLeftPct / 100) * rect.width;

    DOM.trimWindow.classList.add('cursor-grabbing');
    DOM.trimWindow.classList.remove('cursor-grab');

    // Pause if dragging
    if (APP.trimState.isPlaying) pausePreview();
};

const handleDragMove = (clientX) => {
    if (!APP.trimState.isDragging) return;

    const deltaX = clientX - APP.trimState.startX;
    let newLeftPx = APP.trimState.currentLeft + deltaX;

    // Convert pixel to time
    // Time = (LeftPx / ContainerWidth) * SongDuration
    let newStartTime = (newLeftPx / APP.trimState.containerWidth) * APP.trimState.songDuration;

    updateTrimUI(newStartTime);
};

const handleDragEnd = () => {
    if (!APP.trimState.isDragging) return;
    APP.trimState.isDragging = false;
    DOM.trimWindow.classList.remove('cursor-grabbing');
    DOM.trimWindow.classList.add('cursor-grab');
};

// Mouse Events
DOM.trimTrackContainer.addEventListener('mousedown', (e) => handleDragStart(e.clientX));
window.addEventListener('mousemove', (e) => handleDragMove(e.clientX));
window.addEventListener('mouseup', handleDragEnd);

// Touch Events
DOM.trimTrackContainer.addEventListener('touchstart', (e) => {
    // e.preventDefault(); // allow scroll if needed, but here we want drag
    handleDragStart(e.touches[0].clientX);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    // e.preventDefault(); 
    handleDragMove(e.touches[0].clientX);
}, { passive: false });

window.addEventListener('touchend', handleDragEnd);


// --- PREVIEW LOGIC (FIXED) ---

function togglePreview() {
    if (APP.trimState.isPlaying) {
        pausePreview();
    } else {
        playPreview();
    }
}

function playPreview() {
    // Set Start Time
    DOM.trimAudioPreview.currentTime = APP.musicConfig.start;

    // Play
    DOM.trimAudioPreview.play().then(() => {
        APP.trimState.isPlaying = true;
        updatePreviewIcon();
        startProgressLoop(); // Start visual progress

        // Duration Logic: Play FULL selected segment (video duration)
        const duration = APP.trimState.videoDuration * 1000;

        if (APP.trimState.previewTimeout) clearTimeout(APP.trimState.previewTimeout);

        APP.trimState.previewTimeout = setTimeout(() => {
            pausePreview();
        }, duration);

    }).catch(e => {
        if (e.name !== 'AbortError') console.error("Preview play failed", e);
    });
}

function pausePreview() {
    DOM.trimAudioPreview.pause();
    APP.trimState.isPlaying = false;
    updatePreviewIcon();
    stopProgressLoop(); // Stop visual progress
    if (APP.trimState.previewTimeout) clearTimeout(APP.trimState.previewTimeout);
}

// Fixed: Re-inject HTML to ensure Lucide renders correctly every time
function updatePreviewIcon() {
    const iconName = APP.trimState.isPlaying ? 'pause' : 'play';
    DOM.btnPreviewTrimSegment.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4"></i>`;
    lucide.createIcons();
}

// New: Progress Bar Animation Loop
function startProgressLoop() {
    const draw = () => {
        if (!APP.trimState.isPlaying) return;

        const current = DOM.trimAudioPreview.currentTime;
        const start = APP.musicConfig.start;
        const duration = APP.trimState.videoDuration;

        // Calculate progress relative to the selected segment
        let pct = ((current - start) / duration) * 100;

        // Clamp
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;

        DOM.trimProgressBar.style.width = `${pct}%`;

        APP.trimState.progressFrameId = requestAnimationFrame(draw);
    };

    if (APP.trimState.progressFrameId) cancelAnimationFrame(APP.trimState.progressFrameId);
    APP.trimState.progressFrameId = requestAnimationFrame(draw);
}

function stopProgressLoop() {
    if (APP.trimState.progressFrameId) cancelAnimationFrame(APP.trimState.progressFrameId);
    DOM.trimProgressBar.style.width = '0%';
}

// Preview Button
DOM.btnPreviewTrimSegment.addEventListener('click', () => {
    togglePreview();
});

// Save Trim
DOM.btnSaveTrim.addEventListener('click', () => {
    DOM.trimModal.classList.add('hidden');
    DOM.trimModal.classList.remove('flex');
    pausePreview(); // Stop audio

    // Visual feedback on main UI
    DOM.btnTrimMusic.classList.add('text-blue-400', 'bg-slate-700/50');
    DOM.btnTrimMusic.classList.remove('text-slate-500');

    vibrate(HAPTIC.success);
});

DOM.btnCancelTrim.addEventListener('click', () => {
    DOM.trimModal.classList.add('hidden');
    DOM.trimModal.classList.remove('flex');
    pausePreview();
});

// Remove Music Handler
DOM.btnRemoveMonthMusic.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear Input & State
    DOM.monthMusicInput.value = '';
    APP.musicConfig.file = null;
    APP.musicConfig.start = 0;
    APP.musicConfig.end = null;

    // Reset UI Text
    DOM.monthMusicText.textContent = "Add Music";

    // Reset Styling
    DOM.monthMusicWrapper.classList.remove('border-rose-500/50', 'bg-slate-700/30');
    DOM.monthMusicWrapper.classList.add('border-slate-700', 'bg-slate-800');

    DOM.monthMusicIcon.classList.remove('text-rose-400');
    DOM.monthMusicText.classList.remove('text-white');
    DOM.monthMusicText.classList.add('text-slate-400');

    // Reset Trim Button Style
    DOM.btnTrimMusic.classList.remove('text-blue-400', 'bg-slate-700/50');
    DOM.btnTrimMusic.classList.add('text-slate-500');

    // Hide Controls
    DOM.btnRemoveMonthMusic.classList.add('hidden');
    DOM.btnTrimMusic.classList.add('hidden');
    DOM.musicDivider.classList.add('hidden');

    vibrate(HAPTIC.tap);
});

DOM.btnCompile.addEventListener('click', async () => {
    vibrate(HAPTIC.tap);
    const clips = await getAllClips(APP.mode);
    const year = APP.viewDate.getFullYear();
    const month = String(APP.viewDate.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`;
    const monthClips = clips.filter(c => c.date.startsWith(monthPrefix));

    monthClips.sort((a, b) => a.date.localeCompare(b.date));

    if (monthClips.length < 2) {
        DOM.statusText.textContent = "Needs 2+ clips to compile";
        vibrate(HAPTIC.warning);
        return;
    }

    // Get Music Configuration
    const musicConfig = APP.musicConfig.file ? { ...APP.musicConfig } : null;

    // Reset UI
    DOM.compileModal.classList.remove('hidden');
    DOM.compileModal.classList.add('flex');
    DOM.btnCloseModal.classList.add('hidden');
    DOM.compileBadge.classList.remove('hidden');
    DOM.compileBadgeText.textContent = "Processing";

    // Apply Calm Start Styles
    DOM.compileBadge.classList.remove('text-emerald-500', 'border-emerald-500/30');
    DOM.compileBadge.classList.add('text-slate-400', 'border-slate-700/50');

    try {
        // Compile internal clips using internal modal UI context
        await compileClips(monthClips, getSafeUsername(), {
            canvas: DOM.compileCanvas,
            progress: DOM.compileProgress,
            log: DOM.compileLog,
            percentEl: DOM.compilePercent
        }, true, musicConfig); // Pass music config

        // Success State
        DOM.btnCloseModal.classList.remove('hidden');
        DOM.compileLog.textContent = "Compilation Complete!";
        DOM.compileBadgeText.textContent = "Finished";

        // Apply Calm Finished Styles
        DOM.compileBadge.classList.remove('text-slate-400', 'border-slate-700/50');
        DOM.compileBadge.classList.add('text-emerald-500', 'border-emerald-500/30');

        vibrate(HAPTIC.success);
    }
    catch (err) {
        DOM.compileLog.innerHTML = `<span class="text-red-400">Error: ${err.message}</span>`;
        DOM.btnCloseModal.classList.remove('hidden');
        DOM.btnCloseModal.textContent = "Close";
    }
});

// NEW: Year Compilation Handler
DOM.btnCompileYear.addEventListener('click', async () => {
    vibrate(HAPTIC.tap);
    const clips = await getAllClips(APP.mode);
    const year = APP.viewDate.getFullYear();

    // Filter for the entire year
    const yearClips = clips.filter(c => c.date.startsWith(`${year}-`));
    yearClips.sort((a, b) => a.date.localeCompare(b.date));

    if (yearClips.length < 2) {
        DOM.statusText.textContent = "Needs 2+ clips to compile year";
        vibrate(HAPTIC.warning);
        return;
    }

    // Get Music Configuration (reuses the Month view input)
    const musicConfig = APP.musicConfig.file ? { ...APP.musicConfig } : null;

    // Reset UI
    DOM.compileModal.classList.remove('hidden');
    DOM.compileModal.classList.add('flex');
    DOM.btnCloseModal.classList.add('hidden');
    DOM.compileBadge.classList.remove('hidden');
    DOM.compileBadgeText.textContent = "Compiling Year"; // Custom Text

    // Apply Calm Start Styles
    DOM.compileBadge.classList.remove('text-emerald-500', 'border-emerald-500/30');
    DOM.compileBadge.classList.add('text-slate-400', 'border-slate-700/50');

    try {
        // Compile using same pipeline
        await compileClips(yearClips, getSafeUsername(), {
            canvas: DOM.compileCanvas,
            progress: DOM.compileProgress,
            log: DOM.compileLog,
            percentEl: DOM.compilePercent
        }, true, musicConfig);

        // Success State
        DOM.btnCloseModal.classList.remove('hidden');
        DOM.compileLog.textContent = "Year Compilation Complete!";
        DOM.compileBadgeText.textContent = "Year Ready";

        // Apply Calm Finished Styles
        DOM.compileBadge.classList.remove('text-slate-400', 'border-slate-700/50');
        DOM.compileBadge.classList.add('text-emerald-500', 'border-emerald-500/30');

        vibrate(HAPTIC.success);
    }
    catch (err) {
        DOM.compileLog.innerHTML = `<span class="text-red-400">Error: ${err.message}</span>`;
        DOM.btnCloseModal.classList.remove('hidden');
        DOM.btnCloseModal.textContent = "Close";
    }
});

DOM.btnCloseModal.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    DOM.compileModal.classList.add('hidden');
    DOM.compileModal.classList.remove('flex');
});

DOM.btnCancelCompile.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    DOM.compileModal.classList.add('hidden');
    DOM.compileModal.classList.remove('flex');
});

// REFACTORED: accepts UI context to fix hidden canvas bug
// Updated music handling to support AudioBuffer for trimming
async function compileClips(items, username, uiContext, addWatermark = false, musicConfig = null) {
    const { canvas, progress, log, percentEl } = uiContext;

    const startDate = formatDateDisplay(items[0].date);
    const endDate = formatDateDisplay(items[items.length - 1].date);
    const mode = items[0].type || APP.mode;

    const outputName = `${username}_${mode}_${startDate}_to_${endDate}_movie`;

    log.textContent = `Processing ${username}: Initializing...`;
    progress.style.width = '0%';
    if (percentEl) percentEl.textContent = '0%';
    if (DOM.importPercentDisplay && !percentEl) DOM.importPercentDisplay.textContent = '0%';

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioDest = audioCtx.createMediaStreamDestination();

    // --- MUSIC HANDLING (Advanced Buffer Source) ---
    let musicSource = null;
    let musicBuffer = null;

    if (musicConfig && musicConfig.file) {
        log.textContent = "Decoding background music...";
        try {
            const arrayBuffer = await musicConfig.file.arrayBuffer();
            musicBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            if (musicBuffer) {
                musicSource = audioCtx.createBufferSource();
                musicSource.buffer = musicBuffer;

                // FIX: Calculate total compiled video duration approx
                // Self = 1s, Scene = 3s
                const clipDur = APP.mode === 'scene' ? 3 : 1;
                const totalVideoDur = items.length * clipDur;

                // FIX: Only Loop if video is strictly longer than song
                if (totalVideoDur > musicBuffer.duration) {
                    musicSource.loop = true;
                    // Play from start of song (or selected start?)
                    // If looping entire song:
                    musicSource.loopStart = 0;
                    musicSource.loopEnd = musicBuffer.duration;
                    musicSource.start(0, 0);
                } else {
                    // Perfect Fit / No Loop needed
                    musicSource.loop = false;
                    // Play specifically the segment selected
                    musicSource.start(0, musicConfig.start || 0);
                }

                musicSource.connect(audioDest);
            }
        } catch (e) {
            console.warn("Music processing failed", e);
            log.textContent = "Music failed, skipping...";
        }
    } else if (musicConfig instanceof File) {
        // Fallback for Import Modal
        try {
            const arrayBuffer = await musicConfig.arrayBuffer();
            musicBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            musicSource = audioCtx.createBufferSource();
            musicSource.buffer = musicBuffer;
            musicSource.loop = true; // Default loop for import mode
            musicSource.connect(audioDest);
            musicSource.start(0);
        } catch (e) { console.warn("Simple music load failed", e); }
    }

    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.muted = false; // We control routing manually
    video.playsInline = true;

    // --- VIDEO AUDIO HANDLING ---
    if (!musicSource) {
        const sourceNode = audioCtx.createMediaElementSource(video);
        sourceNode.connect(audioDest);
    } else {
        video.muted = true; // Mute video if music exists
    }

    const firstFileUrl = URL.createObjectURL(items[0].blob || items[0].file);
    video.src = firstFileUrl;
    await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
    });

    // Use passed canvas
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const canvasStream = canvas.captureStream(30);
    const audioTrack = audioDest.stream.getAudioTracks()[0];
    if (audioTrack) {
        canvasStream.addTrack(audioTrack);
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

    const recorder = new MediaRecorder(canvasStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    // Start Recording
    recorder.start();

    // Resume Audio Context if needed
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dateVal = item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date;
        const progressPct = Math.round(((i + 1) / items.length) * 100);

        log.textContent = `Processing ${username}: Clip ${i + 1}/${items.length}`;

        if (percentEl) percentEl.textContent = `${progressPct}%`;
        if (DOM.importPercentDisplay && !percentEl) DOM.importPercentDisplay.textContent = `${progressPct}%`;

        // Clean up previous source
        if (i > 0) {
            video.pause();
            video.removeAttribute('src'); // Detach
            video.load(); // Reset

            // FIX: Small buffer delay to allow browser to clear memory/state
            await new Promise(r => setTimeout(r, 50));

            video.src = URL.createObjectURL(item.blob || item.file);
            await new Promise(r => video.onloadedmetadata = r);
        }

        await playAndRecord(video, ctx, w, h, dateVal, addWatermark);

        progress.style.width = `${progressPct}%`;
    }

    // Stop Music
    if (musicSource) {
        musicSource.stop();
    }

    recorder.stop();
    log.textContent = `Processing ${username}: Finalizing...`;

    await new Promise(resolve => recorder.onstop = resolve);

    const blob = new Blob(chunks, { type: 'video/webm' });
    downloadFile(blob, `${outputName}.webm`);

    audioCtx.close();

    // Cleanup Video
    video.removeAttribute('src');
    video.load();

    return { blob, name: `${outputName}.webm` };
}

function playAndRecord(video, ctx, targetW, targetH, dateString, addWatermark) {
    return new Promise((resolve, reject) => {
        // FIX: Add safety timeout to prevent infinite freeze
        const safetyTimeout = setTimeout(() => {
            console.warn("Video play timeout forced resolve");
            resolve();
        }, (video.duration * 1000) + 2000); // Duration + 2s buffer

        video.currentTime = 0;

        const draw = () => {
            if (video.paused || video.ended) return;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, targetW, targetH);

            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const scale = Math.min(targetW / vw, targetH / vh);
            const dw = vw * scale;
            const dh = vh * scale;
            const dx = (targetW - dw) / 2;
            const dy = (targetH - dh) / 2;

            ctx.drawImage(video, dx, dy, dw, dh);

            if (addWatermark && dateString) {
                drawWatermark(ctx, targetW, targetH, dateString, video);
            }

            requestAnimationFrame(draw);
        };

        video.onended = () => {
            clearTimeout(safetyTimeout);
            resolve();
        };

        video.onerror = (e) => {
            console.error("Video Error", e);
            clearTimeout(safetyTimeout);
            resolve();
        };

        video.play().then(() => {
            draw();
        }).catch(e => {
            if (e.name !== 'AbortError') console.error("Play error", e);
            clearTimeout(safetyTimeout);
            resolve();
        });
    });
}

// --- UTILS ---
function downloadFile(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// --- IMPORT COMPILER LOGIC (FIXED) ---
DOM.btnImportCompile.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    DOM.importCompileModal.classList.remove('hidden');
    DOM.importCompileModal.classList.add('flex');
});

// Import Music Input Handler
DOM.importMusicInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        DOM.importMusicText.textContent = file.name;
        DOM.importMusicText.classList.add('text-rose-400');
        DOM.importMusicCheck.setAttribute('data-lucide', 'check');
        DOM.importMusicCheck.classList.add('text-emerald-500');
        vibrate(HAPTIC.success);
        lucide.createIcons();
    }
});

DOM.btnCloseImportModal.addEventListener('click', () => {
    vibrate(HAPTIC.tap);
    DOM.importCompileModal.classList.add('hidden');
    DOM.importCompileModal.classList.remove('flex');

    APP.importState.files = [];
    DOM.importListContainer.innerHTML = '<p class="text-center text-slate-500 text-xs italic py-4">No files added yet.</p>';
    DOM.btnStartImportCompile.disabled = true;
    DOM.importProgressArea.classList.add('hidden');
    DOM.importContentArea.classList.remove('hidden'); // Show dropzone again
    DOM.importDownloadLinks.classList.add('hidden');
    DOM.importDownloadLinks.innerHTML = '';
    DOM.importModalTitle.textContent = "Import Memories";

    // Reset Music Input
    DOM.importMusicInput.value = '';
    DOM.importMusicText.textContent = "Tap to select audio file";
    DOM.importMusicText.classList.remove('text-rose-400');
    DOM.importMusicCheck.setAttribute('data-lucide', 'plus');
    DOM.importMusicCheck.classList.remove('text-emerald-500');
    lucide.createIcons();
});

// Drag & Drop
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    DOM.dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault(); e.stopPropagation();
}

DOM.dropZone.addEventListener('dragenter', () => DOM.dropZone.classList.add('border-rose-600', 'bg-rose-600/10'));
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('border-rose-600', 'bg-rose-600/10'));
DOM.dropZone.addEventListener('drop', handleDrop);

// Click to Upload
DOM.dropZone.addEventListener('click', () => DOM.fileInput.click());
DOM.fileInput.addEventListener('change', (e) => processImportFiles(e.target.files));

function handleDrop(e) {
    DOM.dropZone.classList.remove('border-rose-600', 'bg-rose-600/10');
    processImportFiles(e.dataTransfer.files);
}

function processImportFiles(fileList) {
    const files = Array.from(fileList);
    vibrate(HAPTIC.tap);

    const existingNames = new Set(APP.importState.files.map(f => f.file.name));

    let addedCount = 0;
    files.forEach(file => {
        if (!existingNames.has(file.name)) {
            const parsed = parseFilename(file.name);
            if (parsed) {
                APP.importState.files.push({ file, ...parsed });
                addedCount++;
            }
        }
    });

    APP.importState.files.sort((a, b) => a.date - b.date);

    renderImportLists();

    const hasFiles = APP.importState.files.length > 0;
    DOM.btnStartImportCompile.disabled = !hasFiles;

    DOM.fileInput.value = '';
}

function parseFilename(filename) {
    const regexNew = /^(.*)_(self|scene)_(\d{2})-(\d{2})-(\d{4}).*$/;
    const matchNew = filename.match(regexNew);
    if (matchNew) {
        const [_, username, type, day, month, year] = matchNew;
        const date = new Date(year, month - 1, day);
        return { type, date, username, formattedDate: `${day}/${month}/${year}` };
    }

    const regexOld = /^(self|scene)_(\d{2})-(\d{2})-(\d{4}).*$/;
    const matchOld = filename.match(regexOld);
    if (matchOld) {
        const [_, type, day, month, year] = matchOld;
        const date = new Date(year, month - 1, day);
        return { type, date, username: 'Unknown', formattedDate: `${day}/${month}/${year}` };
    }

    return null;
}

function renderImportLists() {
    const container = DOM.importListContainer;
    container.innerHTML = '';

    if (APP.importState.files.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-500 text-xs italic py-4">No files added yet.</p>';
        return;
    }

    // Group by User
    const filesByUser = {};
    APP.importState.files.forEach(item => {
        const user = item.username;
        if (!filesByUser[user]) filesByUser[user] = { self: [], scene: [] };
        if (item.type === 'self') filesByUser[user].self.push(item);
        if (item.type === 'scene') filesByUser[user].scene.push(item);
    });

    // Iterate Users
    for (const [username, groups] of Object.entries(filesByUser)) {
        // User Wrapper
        const userSection = document.createElement('div');
        userSection.className = 'w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-4';

        // User Header
        const header = document.createElement('h3');
        header.className = 'text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2';
        header.innerHTML = `<i data-lucide="user" class="w-4 h-4 text-rose-500"></i> ${username}`;
        userSection.appendChild(header);

        // Grid for Self/Scene (New Preview Flow)
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

        // Helper to render sub-lists
        const renderSubList = (title, items) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col gap-2';
            wrapper.innerHTML = `<h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">${title} <span class="bg-slate-800 text-slate-300 px-2 rounded-md text-[10px] border border-slate-700">${items.length}</span></h4>`;
            const listDiv = document.createElement('div');
            listDiv.className = 'text-xs text-slate-500 space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin';

            if (items.length === 0) {
                listDiv.innerHTML = '<span class="italic opacity-50 pl-1">No clips</span>';
            } else {
                items.sort((a, b) => a.date - b.date).forEach(item => {
                    listDiv.innerHTML += `
                                <div class="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                                    <span class="truncate text-xs text-white font-medium w-2/3">${item.file.name}</span>
                                    <span class="text-[10px] bg-rose-900/30 text-rose-400 px-1.5 py-0.5 rounded flex-shrink-0 font-mono">${item.formattedDate}</span>
                                </div>`;
                });
            }
            wrapper.appendChild(listDiv);
            return wrapper;
        };

        grid.appendChild(renderSubList('Self Clips', groups.self));
        grid.appendChild(renderSubList('Scene Clips', groups.scene));

        userSection.appendChild(grid);
        container.appendChild(userSection);
    }
    lucide.createIcons();
}

DOM.btnStartImportCompile.addEventListener('click', async () => {
    if (APP.importState.isProcessing) return;
    APP.importState.isProcessing = true;
    DOM.btnStartImportCompile.disabled = true;
    vibrate(HAPTIC.action);

    // Get Music File
    const musicFile = DOM.importMusicInput.files[0] || null;
    // NOTE: Import modal currently doesn't support trimming UI, so pass raw file

    // TRANSITION TO PROCESSING VIEW
    DOM.importContentArea.classList.add('hidden'); // Hide list
    DOM.importProgressArea.classList.remove('hidden'); // Show progress
    DOM.importModalTitle.textContent = "Compiling Memories...";
    DOM.importDownloadLinks.classList.add('hidden');

    try {
        // Grouping Logic: User -> Mode -> Date
        const filesByUser = {};
        APP.importState.files.forEach(item => {
            const user = item.username;
            if (!filesByUser[user]) filesByUser[user] = { self: [], scene: [] };
            if (item.type === 'self') filesByUser[user].self.push(item);
            if (item.type === 'scene') filesByUser[user].scene.push(item);
        });

        const importUIContext = {
            canvas: DOM.importPreviewCanvas,
            progress: DOM.importProgressBar,
            log: DOM.importStatusLog
        };

        for (const [username, groups] of Object.entries(filesByUser)) {
            groups.self.sort((a, b) => a.date - b.date);
            groups.scene.sort((a, b) => a.date - b.date);

            if (groups.self.length > 0) {
                const res = await compileClips(groups.self, username, importUIContext, false, musicFile);
                addDownloadLink(res.blob, res.name);
            }
            if (groups.scene.length > 0) {
                const res = await compileClips(groups.scene, username, importUIContext, false, musicFile);
                addDownloadLink(res.blob, res.name);
            }
        }

        DOM.importStatusLog.textContent = "All compilations finished!";
        DOM.importPercentDisplay.textContent = "100%";
        DOM.importProgressBar.style.width = "100%";
        vibrate(HAPTIC.success);
    } catch (err) {
        console.error(err);
        DOM.importStatusLog.textContent = "Error: " + err.message;
        vibrate(HAPTIC.warning);
    } finally {
        APP.importState.isProcessing = false;
        DOM.importDownloadLinks.classList.remove('hidden');
        DOM.btnStartImportCompile.textContent = "Compile Again";
        DOM.btnStartImportCompile.disabled = false;
    }
});

function addDownloadLink(blob, filename) {
    const url = URL.createObjectURL(blob);
    const btn = document.createElement('a');
    btn.href = url;
    btn.download = filename;
    btn.className = 'flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group';
    btn.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="bg-rose-600/20 text-rose-500 p-2 rounded-lg">
                        <i data-lucide="video" class="w-5 h-5"></i>
                    </div>
                    <span class="text-sm font-semibold truncate max-w-[200px]">${filename}</span>
                </div>
                <i data-lucide="download" class="w-4 h-4 text-slate-400 group-hover:text-white"></i>
            `;
    DOM.importDownloadLinks.appendChild(btn);
    DOM.importDownloadLinks.classList.remove('hidden');
    lucide.createIcons();
}

// Boot
initApp();
async function initApp() {
    try {
        // Initialize Logo
        APP.logoImg = new Image();
        APP.logoImg.src = 'assets/LogoIcon-Grey.svg';

        // Name Check
        if (!APP.userName) {
            const name = prompt("Enter your name:");
            if (name && name.trim().length > 0) {
                APP.userName = name.trim();
                localStorage.setItem('user_name', APP.userName);
            }
        }

        await initDB();

        updateGreeting();
        updateMonthLabel();
        updateTargetUI();
        await renderCalendar(); // Wait for calendar to render
        initScrollAnimations(); // Initialize observers on static elements
    } catch (e) { console.error(e); }
}
