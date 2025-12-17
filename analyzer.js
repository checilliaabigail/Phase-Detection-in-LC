// analyzer.js - VERSI DIPERBAIKI
console.log('🎬 analyzer.js loading started');

// Cek apakah OpenCV sudah tersedia
function isOpenCVReady() {
    return typeof cv !== 'undefined' && cv.Mat;
}

class VideoAnalyzer {
    constructor() {
        console.log('🏗️ VideoAnalyzer constructor called');
        
        // Cek OpenCV
        if (!isOpenCVReady()) {
            console.warn('⚠️ OpenCV not ready when VideoAnalyzer created');
        } else {
            console.log('✅ OpenCV ready in constructor');
        }
        
        this.video = null;
        this.videoFile = null;
        this.results = [];
        this.charts = {};
        this.isAnalyzing = false;
        this.progressInterval = null;
        this.startTime = null;
        
        // PARAMETER THRESHOLD (SAMA DENGAN PYTHON)
        this.CONTOUR_THRESHOLD = 15;    // Jika < 15 kontur → ISOTROPIC
        this.VARIANCE_THRESHOLD = 96;   // Jika > 96 variance → ISOTROPIC
        
        // Elements cache
        this.elements = {};
        
        // Canvas untuk processing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        console.log('✅ VideoAnalyzer instance created');
    }

    init() {
        console.log('🔄 VideoAnalyzer.init() called');
        
        // Cek OpenCV lagi
        if (!isOpenCVReady()) {
            console.error('❌ OpenCV not available in init()');
            this.showError('OpenCV library is not loaded. Please wait or refresh.');
            return;
        }
        
        console.log('✅ OpenCV verified in init()');
        
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.updateSliderValues();
            console.log('✅ VideoAnalyzer.init() completed successfully');
        } catch (error) {
            console.error('❌ Error in VideoAnalyzer.init():', error);
            this.showError('Initialization failed: ' + error.message);
        }
    }
    
    cacheElements() {
        console.log('🔍 Caching DOM elements...');
        
        const elementIds = [
            'uploadArea', 'videoInput', 'fileInfo', 'removeFile',
            'analyzeBtn', 'resetBtn', 'fileName', 'fileSize',
            'contourThreshold', 'varianceThreshold', 'samplingRate',
            'contourValue', 'varianceValue', 'samplingValue',
            'progressSection', 'progressFill', 'progressPercent',
            'progressText', 'elapsedTime', 'framesProcessed',
            'currentPhase', 'resultsSection', 'cholestericPercent',
            'cholestericDuration', 'isotropicPercent', 'isotropicDuration',
            'transitionTime', 'downloadCSV', 'downloadPlot', 'downloadAll',
            'contourChart', 'varianceChart', 'phaseTimeline'
        ];
        
        this.elements = {};
        
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[id] = element;
            } else if (id !== 'contourChart' && id !== 'varianceChart') {
                console.warn(`⚠️ Element #${id} not found in DOM`);
            }
        });
        
        console.log(`✅ Cached ${Object.keys(this.elements).length} elements`);
    }
    
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        if (!this.elements.uploadArea || !this.elements.videoInput) {
            console.error('❌ Required elements not found for event listeners');
            return;
        }
        
        // File upload listeners
        this.elements.uploadArea.addEventListener('click', () => {
            this.elements.videoInput.click();
        });
        
        // Drag and drop
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.style.background = 'rgba(67, 97, 238, 0.15)';
        });
        
        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
        });
        
        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
            if (e.dataTransfer.files.length) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        
        // File input change
        this.elements.videoInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        
        // Remove file button
        if (this.elements.removeFile) {
            this.elements.removeFile.addEventListener('click', () => this.clearFile());
        }
        
        // Sliders
        const setupSlider = (sliderId, valueId, property) => {
            if (this.elements[sliderId] && this.elements[valueId]) {
                this.elements[sliderId].addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    this.elements[valueId].textContent = value;
                    this[property] = value;
                });
            }
        };
        
        setupSlider('contourThreshold', 'contourValue', 'CONTOUR_THRESHOLD');
        setupSlider('varianceThreshold', 'varianceValue', 'VARIANCE_THRESHOLD');
        setupSlider('samplingRate', 'samplingValue', 'samplingRate');
        
        // Buttons
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        }
        
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.resetAnalysis());
        }
        
        // Download buttons
        if (this.elements.downloadCSV) {
            this.elements.downloadCSV.addEventListener('click', () => this.downloadCSV());
        }
        
        if (this.elements.downloadPlot) {
            this.elements.downloadPlot.addEventListener('click', () => this.downloadPlot());
        }
        
        if (this.elements.downloadAll) {
            this.elements.downloadAll.addEventListener('click', () => this.downloadAll());
        }
        
        console.log('✅ Event listeners setup completed');
    }
    
    // ... (method-method lainnya tetap sama) ...
    
    showError(message) {
        console.error('❌ Error:', message);
        alert('Error: ' + message);
    }
}

// Export ke global scope
if (typeof window !== 'undefined') {
    window.VideoAnalyzer = VideoAnalyzer;
    console.log('✅ VideoAnalyzer class exported to window scope');
}

console.log('✅ analyzer.js loaded successfully');
