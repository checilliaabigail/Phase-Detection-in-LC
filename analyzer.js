// analyzer.js - VERSI TANPA OPENCV SAMA SEKALI
console.log('🎬 analyzer.js loading...');

class VideoAnalyzer {
    constructor() {
        console.log('✅ VideoAnalyzer instantiated');
        
        // State
        this.video = null;
        this.videoFile = null;
        this.results = [];
        this.charts = {};
        this.isAnalyzing = false;
        this.progressInterval = null;
        this.startTime = null;
        
        // Parameters (sama dengan Python)
        this.CONTOUR_THRESHOLD = 15;    // < 15 = ISOTROPIC
        this.VARIANCE_THRESHOLD = 96;   // ≥ 96 = ISOTROPIC
        this.samplingRate = 30;
        
        // Elements cache
        this.elements = {};
        
        // Canvas for processing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        console.log('⚙️ Pure JavaScript Version - No OpenCV Required');
    }

    init() {
        console.log('🔄 Initializing VideoAnalyzer...');
        
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.updateSliderValues();
            console.log('✅ VideoAnalyzer initialized successfully');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Failed to initialize: ' + error.message);
        }
    }

    cacheElements() {
        console.log('🔍 Caching elements...');
        
        // Cache semua elemen yang diperlukan
        const elementsToCache = {
            // Upload elements
            uploadArea: 'uploadArea',
            videoInput: 'videoInput',
            fileInfo: 'fileInfo',
            removeFile: 'removeFile',
            fileName: 'fileName',
            fileSize: 'fileSize',
            
            // Button elements
            analyzeBtn: 'analyzeBtn',
            resetBtn: 'resetBtn',
            
            // Slider elements
            contourThreshold: 'contourThreshold',
            varianceThreshold: 'varianceThreshold',
            samplingRate: 'samplingRate',
            contourValue: 'contourValue',
            varianceValue: 'varianceValue',
            samplingValue: 'samplingValue',
            
            // Progress elements
            progressSection: 'progressSection',
            progressFill: 'progressFill',
            progressPercent: 'progressPercent',
            progressText: 'progressText',
            elapsedTime: 'elapsedTime',
            framesProcessed: 'framesProcessed',
            currentPhase: 'currentPhase',
            
            // Results elements
            resultsSection: 'resultsSection',
            cholestericPercent: 'cholestericPercent',
            cholestericDuration: 'cholestericDuration',
            isotropicPercent: 'isotropicPercent',
            isotropicDuration: 'isotropicDuration',
            transitionTime: 'transitionTime',
            
            // Download elements
            downloadCSV: 'downloadCSV',
            downloadPlot: 'downloadPlot',
            
            // Chart elements
            contourChart: 'contourChart',
            varianceChart: 'varianceChart'
        };
        
        this.elements = {};
        
        for (const [key, id] of Object.entries(elementsToCache)) {
            const element = document.getElementById(id);
            if (element) {
                this.elements[key] = element;
            } else {
                console.warn(`⚠️ Element #${id} not found`);
            }
        }
        
        console.log(`✅ Cached ${Object.keys(this.elements).length} elements`);
    }

    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // 1. FILE UPLOAD EVENT LISTENERS
        if (this.elements.uploadArea && this.elements.videoInput) {
            // Click to browse
            this.elements.uploadArea.addEventListener('click', () => {
                console.log('📁 Upload area clicked');
                this.elements.videoInput.click();
            });
            
            // Drag and drop
            this.elements.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.uploadArea.style.background = 'rgba(67, 97, 238, 0.15)';
                console.log('📁 File dragged over');
            });
            
            this.elements.uploadArea.addEventListener('dragleave', () => {
                this.elements.uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
                console.log('📁 File dragged away');
            });
            
            this.elements.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
                console.log('📁 File dropped');
                
                if (e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    console.log('Dropped file:', file.name);
                    this.handleFileSelect(file);
                }
            });
        } else {
            console.error('❌ Upload elements not found');
        }
        
        // File input change
        if (this.elements.videoInput) {
            this.elements.videoInput.addEventListener('change', (e) => {
                console.log('📁 File input changed');
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    console.log('Selected file:', file.name);
                    this.handleFileSelect(file);
                }
            });
        }
        
        // Remove file button
        if (this.elements.removeFile) {
            this.elements.removeFile.addEventListener('click', () => {
                console.log('🗑️ Remove file clicked');
                this.clearFile();
            });
        }
        
        // 2. SLIDER EVENT LISTENERS
        const sliders = [
            { 
                slider: this.elements.contourThreshold, 
                display: this.elements.contourValue, 
                property: 'CONTOUR_THRESHOLD' 
            },
            { 
                slider: this.elements.varianceThreshold, 
                display: this.elements.varianceValue, 
                property: 'VARIANCE_THRESHOLD' 
            },
            { 
                slider: this.elements.samplingRate, 
                display: this.elements.samplingValue, 
                property: 'samplingRate' 
            }
        ];
        
        sliders.forEach(({ slider, display, property }) => {
            if (slider && display) {
                slider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    display.textContent = value;
                    this[property] = value;
                    console.log(`${property} changed to: ${value}`);
                });
            }
        });
        
        // 3. BUTTON EVENT LISTENERS
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.addEventListener('click', () => {
                console.log('🚀 Analyze button clicked');
                this.startAnalysis();
            });
        }
        
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                console.log('🔄 Reset button clicked');
                this.resetAnalysis();
            });
        }
        
        if (this.elements.downloadCSV) {
            this.elements.downloadCSV.addEventListener('click', () => {
                console.log('📥 Download CSV clicked');
                this.downloadCSV();
            });
        }
        
        if (this.elements.downloadPlot) {
            this.elements.downloadPlot.addEventListener('click', () => {
                console.log('📥 Download Plot clicked');
                this.downloadPlot();
            });
        }
        
        console.log('✅ All event listeners setup successfully');
    }

    handleFileSelect(file) {
        console.log('📁 handleFileSelect called with:', file.name);
        
        // Validation
        if (!file) {
            console.error('❌ No file provided');
            return;
        }
        
        const maxSize = 200 * 1024 * 1024; // 200MB
        if (file.size > maxSize) {
            this.showError('File too large. Maximum 200MB.');
            return;
        }
        
        const validExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExts.includes(fileExt)) {
            this.showError('Invalid file type. Please use MP4, AVI, MOV, MKV, or WebM.');
            return;
        }
        
        // Store file
        this.videoFile = file;
        console.log('✅ File validated and stored');
        
        // Update UI
        if (this.elements.fileName) {
            this.elements.fileName.textContent = file.name;
        }
        
        if (this.elements.fileSize) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            this.elements.fileSize.textContent = sizeMB;
            console.log(`File size: ${sizeMB} MB`);
        }
        
        if (this.elements.fileInfo) {
            this.elements.fileInfo.classList.remove('hidden');
            console.log('📋 File info shown');
        }
        
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = false;
            console.log('▶️ Analyze button enabled');
        }
        
        // Create video element for preview (optional)
        try {
            const videoURL = URL.createObjectURL(file);
            this.video = document.createElement('video');
            this.video.src = videoURL;
            this.video.muted = true;
            console.log('🎬 Video element created');
        } catch (error) {
            console.warn('Could not create video preview:', error);
        }
    }

    clearFile() {
        console.log('🗑️ clearFile called');
        
        if (this.video) {
            URL.revokeObjectURL(this.video.src);
            this.video = null;
            console.log('🎬 Video element cleaned up');
        }
        
        this.videoFile = null;
        
        // Reset UI
        if (this.elements.fileInfo) {
            this.elements.fileInfo.classList.add('hidden');
            console.log('📋 File info hidden');
        }
        
        if (this.elements.videoInput) {
            this.elements.videoInput.value = '';
            console.log('📁 File input cleared');
        }
        
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = true;
            console.log('▶️ Analyze button disabled');
        }
    }

    async startAnalysis() {
        console.log('🚀 startAnalysis called');
        
        if (!this.videoFile) {
            this.showError('Please select a video file first.');
            return;
        }
        
        if (this.isAnalyzing) {
            this.showError('Analysis is already in progress.');
            return;
        }
        
        this.isAnalyzing = true;
        this.results = [];
        console.log('✅ Analysis started');
        
        // Show progress section
        if (this.elements.progressSection) {
            this.elements.progressSection.classList.remove('hidden');
            console.log('📊 Progress section shown');
        }
        
        if (this.elements.resultsSection) {
            this.elements.resultsSection.classList.add('hidden');
            console.log('📈 Results section hidden');
        }
        
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = true;
            console.log('▶️ Analyze button disabled');
        }
        
        // Start timing
        this.startTime = Date.now();
        this.updateProgressTime();
        this.progressInterval = setInterval(() => this.updateProgressTime(), 1000);
        
        try {
            console.log('🎬 Starting video analysis...');
            await this.analyzeVideoPureJS();
            
            console.log('📊 Analysis complete, showing results...');
            this.showResults();
            
        } catch (error) {
            console.error('❌ Analysis error:', error);
            this.showError('Analysis failed: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            clearInterval(this.progressInterval);
            
            if (this.elements.analyzeBtn) {
                this.elements.analyzeBtn.disabled = false;
                console.log('▶️ Analyze button re-enabled');
            }
        }
    }

    async analyzeVideoPureJS() {
        console.log('🎬 analyzeVideoPureJS called');
        
        // Create video element if not exists
        if (!this.video) {
            this.video = document.createElement('video');
            this.video.src = URL.createObjectURL(this.videoFile);
            this.video.muted = true;
            this.video.playsInline = true;
            console.log('🎬 Video element created');
        }
        
        // Wait for video metadata
        console.log('⏳ Waiting for video metadata...');
        await new Promise((resolve) => {
            if (this.video.readyState >= 2) { // HAVE_CURRENT_DATA
                console.log('✅ Video already has metadata');
                resolve();
            } else {
                this.video.addEventListener('loadedmetadata', () => {
                    console.log('✅ Video metadata loaded');
                    resolve();
                }, { once: true });
                
                // Timeout fallback
                setTimeout(() => {
                    console.log('⚠️ Video metadata timeout, proceeding anyway');
                    resolve();
                }, 3000);
            }
        });
        
        // Setup canvas
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        console.log(`📏 Canvas size: ${this.canvas.width}x${this.canvas.height}`);
        
        const duration = this.video.duration || 60; // Fallback 60 seconds
        const fps = 30; // Assume 30 FPS
        const samplingRate = this.samplingRate || 30;
        const timeIncrement = samplingRate / fps;
        
        console.log(`📊 Video duration: ${duration.toFixed(2)}s`);
        console.log(`📊 Sampling rate: ${samplingRate} (1 frame every ${samplingRate} frames)`);
        console.log(`📊 Time increment: ${timeIncrement.toFixed(2)}s`);
        
        // Process frames
        let currentTime = 0;
        let framesProcessed = 0;
        const totalExpectedFrames = Math.ceil(duration / timeIncrement);
        
        console.log(`🎯 Expected to process ~${totalExpectedFrames} frames`);
        
        while (currentTime < duration && this.isAnalyzing) {
            // Seek to current time
            this.video.currentTime = currentTime;
            
            await new Promise((resolve) => {
                const onSeeked = () => {
                    this.video.removeEventListener('seeked', onSeeked);
                    
                    try {
                        // Draw frame to canvas
                        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                        
                        // Get pixel data
                        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                        
                        // Analyze frame
                        const result = this.analyzeFrameJS(imageData, currentTime, framesProcessed);
                        this.results.push(result);
                        
                        framesProcessed++;
                        
                        // Log progress occasionally
                        if (framesProcessed % 10 === 0) {
                            console.log(`📊 Processed ${framesProcessed}/${totalExpectedFrames} frames`);
                        }
                        
                    } catch (error) {
                        console.error(`❌ Error processing frame at ${currentTime}s:`, error);
                    }
                    
                    // Update progress UI
                    const progress = (currentTime / duration) * 100;
                    this.updateProgress(progress, framesProcessed, totalExpectedFrames);
                    
                    resolve();
                };
                
                this.video.addEventListener('seeked', onSeeked);
                
                // Timeout for seek
                setTimeout(() => {
                    this.video.removeEventListener('seeked', onSeeked);
                    console.warn(`⚠️ Seek timeout at ${currentTime}s`);
                    resolve();
                }, 1000);
            });
            
            currentTime += timeIncrement;
            
            // Yield to UI occasionally
            if (framesProcessed % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        console.log(`✅ Analysis complete. Processed ${framesProcessed} frames.`);
        console.log(`📈 Results collected: ${this.results.length} data points`);
    }

    analyzeFrameJS(imageData, timestamp, frameIndex) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        console.log(`🔍 Analyzing frame ${frameIndex} (${width}x${height})`);
        
        // 1. Calculate brightness and identify LC pixels (non-electrode areas)
        let totalBrightness = 0;
        let lcPixelCount = 0;
        const brightnessValues = [];
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Consider pixels with brightness < 200 as LC pixels (not electrode)
            if (brightness < 200) {
                lcPixelCount++;
                totalBrightness += brightness;
                brightnessValues.push(brightness);
            }
        }
        
        // 2. Calculate variance for LC pixels
        let variance = 0;
        let stdDev = 0;
        
        if (lcPixelCount > 0) {
            const meanBrightness = totalBrightness / lcPixelCount;
            let sumSquaredDiff = 0;
            
            for (const brightness of brightnessValues) {
                sumSquaredDiff += Math.pow(brightness - meanBrightness, 2);
            }
            
            variance = sumSquaredDiff / lcPixelCount;
            stdDev = Math.sqrt(variance);
        }
        
        // 3. Simple edge detection for "contours"
        const edgeCount = this.detectEdgesSimple(data, width, height);
        
        // Scale to match Python contour counts (empirical scaling factor)
        const scaledContours = Math.floor(edgeCount / 1000);
        
        // 4. Classify phase (SAME LOGIC AS PYTHON)
        const phaseContour = scaledContours < this.CONTOUR_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
        const phaseVariance = variance >= this.VARIANCE_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
        
        console.log(`   Frame ${frameIndex}: Contours=${scaledContours}, Variance=${variance.toFixed(2)}, Phase=${phaseContour}`);
        
        return {
            frame_number: frameIndex,
            timestamp_seconds: timestamp,
            timestamp_minutes: timestamp / 60,
            num_contours: scaledContours,
            phase_contour: phaseContour,
            variance: parseFloat(variance.toFixed(2)),
            std_dev: parseFloat(stdDev.toFixed(2)),
            phase_variance: phaseVariance,
            lc_pixels: lcPixelCount,
            total_pixels: width * height
        };
    }

    detectEdgesSimple(data, width, height) {
        // Very simple edge detection for demonstration
        let edgeCount = 0;
        const threshold = 30;
        
        // Convert to grayscale array
        const gray = new Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const idx = Math.floor(i / 4);
            gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        
        // Simple horizontal and vertical differences
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // Skip very bright pixels (electrodes)
                if (gray[idx] > 200) continue;
                
                // Check differences with neighbors
                const diffH = Math.abs(gray[idx] - gray[idx - 1]) + Math.abs(gray[idx] - gray[idx + 1]);
                const diffV = Math.abs(gray[idx] - gray[idx - width]) + Math.abs(gray[idx] - gray[idx + width]);
                
                if (diffH > threshold || diffV > threshold) {
                    edgeCount++;
                }
            }
        }
        
        return edgeCount;
    }

    updateProgress(percent, currentFrame, totalFrames) {
        const progress = Math.min(100, Math.max(0, percent));
        
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progress}%`;
        }
        
        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent = `${Math.round(progress)}%`;
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `Processing: ${currentFrame}/${totalFrames} frames`;
        }
        
        if (this.elements.framesProcessed) {
            this.elements.framesProcessed.textContent = currentFrame;
        }
        
        if (this.elements.currentPhase && this.results.length > 0) {
            const lastResult = this.results[this.results.length - 1];
            this.elements.currentPhase.textContent = lastResult.phase_contour;
            this.elements.currentPhase.style.color = 
                lastResult.phase_contour === 'CHOLESTERIC' ? '#4361ee' : '#f72585';
        }
    }

    updateProgressTime() {
        if (!this.startTime) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        if (this.elements.elapsedTime) {
            this.elements.elapsedTime.textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    showResults() {
        console.log('📊 showResults called');
        
        // Hide progress, show results
        if (this.elements.progressSection) {
            this.elements.progressSection.classList.add('hidden');
            console.log('📊 Progress section hidden');
        }
        
        if (this.elements.resultsSection) {
            this.elements.resultsSection.classList.remove('hidden');
            console.log('📈 Results section shown');
        }
        
        // Calculate and display statistics
        const stats = this.calculateStatistics();
        
        if (this.elements.cholestericPercent) {
            this.elements.cholestericPercent.textContent = `${stats.cholestericPercent}%`;
        }
        
        if (this.elements.cholestericDuration) {
            this.elements.cholestericDuration.textContent = `${stats.cholestericDuration.toFixed(2)} min`;
        }
        
        if (this.elements.isotropicPercent) {
            this.elements.isotropicPercent.textContent = `${stats.isotropicPercent}%`;
        }
        
        if (this.elements.isotropicDuration) {
            this.elements.isotropicDuration.textContent = `${stats.isotropicDuration.toFixed(2)} min`;
        }
        
        if (this.elements.transitionTime) {
            this.elements.transitionTime.textContent = stats.transitionTime ? 
                `${stats.transitionTime.toFixed(2)} min` : 'No transition';
        }
        
        console.log('📊 Statistics calculated:', stats);
        
        // Create charts
        this.createCharts();
        
        console.log('✅ Results displayed successfully');
    }

    calculateStatistics() {
        if (this.results.length === 0) {
            return {
                cholestericPercent: '0.0',
                isotropicPercent: '0.0',
                cholestericDuration: 0,
                isotropicDuration: 0,
                transitionTime: null
            };
        }
        
        const total = this.results.length;
        const cholestericCount = this.results.filter(r => r.phase_contour === 'CHOLESTERIC').length;
        const isotropicCount = total - cholestericCount;
        
        // Find transition time
        let transitionTime = null;
        for (let i = 1; i < this.results.length; i++) {
            if (this.results[i-1].phase_contour === 'CHOLESTERIC' && 
                this.results[i].phase_contour === 'ISOTROPIC') {
                transitionTime = this.results[i].timestamp_minutes;
                break;
            }
        }
        
        // Calculate durations
        const videoDuration = this.results[this.results.length - 1].timestamp_minutes || 1;
        
        return {
            cholestericPercent: ((cholestericCount / total) * 100).toFixed(1),
            isotropicPercent: ((isotropicCount / total) * 100).toFixed(1),
            cholestericDuration: (cholestericCount / total) * videoDuration,
            isotropicDuration: (isotropicCount / total) * videoDuration,
            transitionTime: transitionTime
        };
    }

    createCharts() {
        console.log('📈 Creating charts...');
        
        if (this.results.length === 0) {
            console.warn('No data for charts');
            return;
        }
        
        const times = this.results.map(r => r.timestamp_minutes);
        const contours = this.results.map(r => r.num_contours);
        const variances = this.results.map(r => r.variance);
        
        // Destroy old charts if they exist
        if (this.charts.contour && typeof this.charts.contour.destroy === 'function') {
            this.charts.contour.destroy();
        }
        if (this.charts.variance && typeof this.charts.variance.destroy === 'function') {
            this.charts.variance.destroy();
        }
        
        // Create Contour Chart
        if (this.elements.contourChart) {
            const ctx = this.elements.contourChart.getContext('2d');
            this.charts.contour = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: times,
                    datasets: [{
                        label: 'Contours',
                        data: contours,
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Time (minutes)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Number of Contours'
                            },
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('📈 Contour chart created');
        }
        
        // Create Variance Chart
        if (this.elements.varianceChart) {
            const ctx = this.elements.varianceChart.getContext('2d');
            this.charts.variance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: times,
                    datasets: [{
                        label: 'Variance',
                        data: variances,
                        borderColor: '#f72585',
                        backgroundColor: 'rgba(247, 37, 133, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Time (minutes)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Variance'
                            },
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('📈 Variance chart created');
        }
    }

    downloadCSV() {
        console.log('📥 downloadCSV called');
        
        if (this.results.length === 0) {
            this.showError('No analysis data available to download.');
            return;
        }
        
        try {
            const csv = Papa.unparse(this.results);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `liquid_crystal_analysis_${Date.now()}.csv`);
            console.log('✅ CSV downloaded successfully');
        } catch (error) {
            console.error('❌ CSV download error:', error);
            this.showError('Failed to download CSV file.');
        }
    }

    downloadPlot() {
        console.log('📥 downloadPlot called');
        
        if (this.results.length === 0) {
            this.showError('No analysis data available to download.');
            return;
        }
        
        try {
            // Create a simple plot image
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            
            // Background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Title
            ctx.fillStyle = '#212529';
            ctx.font = 'bold 24px Arial';
            ctx.fillText('Liquid Crystal Analysis Results', 50, 50);
            
            // Statistics
            const stats = this.calculateStatistics();
            ctx.font = '18px Arial';
            ctx.fillStyle = '#4361ee';
            ctx.fillText(`Cholesteric Phase: ${stats.cholestericPercent}%`, 50, 100);
            ctx.fillStyle = '#f72585';
            ctx.fillText(`Isotropic Phase: ${stats.isotropicPercent}%`, 50, 130);
            
            if (stats.transitionTime) {
                ctx.fillStyle = '#f8961e';
                ctx.fillText(`Transition Time: ${stats.transitionTime.toFixed(2)} minutes`, 50, 160);
            }
            
            // Download
            canvas.toBlob(blob => {
                saveAs(blob, `analysis_plot_${Date.now()}.png`);
            }, 'image/png');
            
            console.log('✅ Plot image downloaded successfully');
            
        } catch (error) {
            console.error('❌ Plot download error:', error);
            this.showError('Failed to download plot image.');
        }
    }

    resetAnalysis() {
        console.log('🔄 resetAnalysis called');
        
        // Stop any ongoing analysis
        this.isAnalyzing = false;
        clearInterval(this.progressInterval);
        
        // Clear results
        this.results = [];
        
        // Reset UI
        if (this.elements.progressSection) {
            this.elements.progressSection.classList.add('hidden');
        }
        
        if (this.elements.resultsSection) {
            this.elements.resultsSection.classList.add('hidden');
        }
        
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = false;
        }
        
        // Clear charts
        if (this.charts.contour && typeof this.charts.contour.destroy === 'function') {
            this.charts.contour.destroy();
            this.charts.contour = null;
        }
        
        if (this.charts.variance && typeof this.charts.variance.destroy === 'function') {
            this.charts.variance.destroy();
            this.charts.variance = null;
        }
        
        // Reset progress indicators
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = '0%';
        }
        
        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent = '0%';
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = 'Initializing...';
        }
        
        if (this.elements.framesProcessed) {
            this.elements.framesProcessed.textContent = '0';
        }
        
        if (this.elements.currentPhase) {
            this.elements.currentPhase.textContent = '-';
        }
        
        if (this.elements.elapsedTime) {
            this.elements.elapsedTime.textContent = '0s';
        }
        
        // Clear file
        this.clearFile();
        
        console.log('✅ Analysis reset complete');
    }

    updateSliderValues() {
        console.log('⚙️ Updating slider values...');
        
        // Set initial slider values
        const sliders = [
            { element: this.elements.contourThreshold, value: this.CONTOUR_THRESHOLD },
            { element: this.elements.varianceThreshold, value: this.VARIANCE_THRESHOLD },
            { element: this.elements.samplingRate, value: this.samplingRate }
        ];
        
        sliders.forEach(({ element, value }) => {
            if (element) {
                element.value = value;
            }
        });
        
        // Set initial display values
        const displays = [
            { element: this.elements.contourValue, value: this.CONTOUR_THRESHOLD },
            { element: this.elements.varianceValue, value: this.VARIANCE_THRESHOLD },
            { element: this.elements.samplingValue, value: this.samplingRate }
        ];
        
        displays.forEach(({ element, value }) => {
            if (element) {
                element.textContent = value;
            }
        });
        
        console.log('✅ Slider values updated');
    }

    showError(message) {
        console.error('❌ Error:', message);
        alert('Error: ' + message);
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.VideoAnalyzer = VideoAnalyzer;
    console.log('✅ VideoAnalyzer exported to window scope');
}

console.log('✅ analyzer.js loaded successfully');
