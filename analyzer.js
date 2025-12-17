// analyzer.js - PURE JAVASCRIPT VERSION
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
        
        console.log('⚙️ Parameters:');
        console.log(`  CONTOUR_THRESHOLD = ${this.CONTOUR_THRESHOLD}`);
        console.log(`  VARIANCE_THRESHOLD = ${this.VARIANCE_THRESHOLD}`);
        console.log(`  SAMPLING_RATE = ${this.samplingRate}`);
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
        
        // Cache all required elements
        const ids = [
            'uploadArea', 'videoInput', 'fileInfo', 'removeFile',
            'analyzeBtn', 'resetBtn', 'fileName', 'fileSize',
            'contourThreshold', 'varianceThreshold', 'samplingRate',
            'contourValue', 'varianceValue', 'samplingValue',
            'progressSection', 'progressFill', 'progressPercent',
            'progressText', 'elapsedTime', 'framesProcessed',
            'currentPhase', 'resultsSection', 'cholestericPercent',
            'cholestericDuration', 'isotropicPercent', 'isotropicDuration',
            'transitionTime', 'downloadCSV', 'downloadPlot',
            'contourChart', 'varianceChart'
        ];
        
        this.elements = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                this.elements[id] = el;
            } else if (!id.includes('Chart')) {
                console.warn(`⚠️ Element #${id} not found`);
            }
        });
    }

    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // File upload
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('click', () => {
                if (this.elements.videoInput) {
                    this.elements.videoInput.click();
                }
            });
            
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
        }
        
        if (this.elements.videoInput) {
            this.elements.videoInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }
        
        if (this.elements.removeFile) {
            this.elements.removeFile.addEventListener('click', () => this.clearFile());
        }
        
        // Sliders
        const sliders = [
            { id: 'contourThreshold', valueId: 'contourValue', property: 'CONTOUR_THRESHOLD' },
            { id: 'varianceThreshold', valueId: 'varianceValue', property: 'VARIANCE_THRESHOLD' },
            { id: 'samplingRate', valueId: 'samplingValue', property: 'samplingRate' }
        ];
        
        sliders.forEach(({ id, valueId, property }) => {
            const slider = this.elements[id];
            const valueSpan = this.elements[valueId];
            
            if (slider && valueSpan) {
                slider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    valueSpan.textContent = value;
                    this[property] = value;
                });
            }
        });
        
        // Buttons
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        }
        
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.resetAnalysis());
        }
        
        if (this.elements.downloadCSV) {
            this.elements.downloadCSV.addEventListener('click', () => this.downloadCSV());
        }
        
        if (this.elements.downloadPlot) {
            this.elements.downloadPlot.addEventListener('click', () => this.downloadPlot());
        }
    }

    handleFileSelect(file) {
        console.log('📁 File selected:', file.name);
        
        // Validation
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
        
        this.videoFile = file;
        
        // Update UI
        if (this.elements.fileName) {
            this.elements.fileName.textContent = file.name;
        }
        
        if (this.elements.fileSize) {
            this.elements.fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2);
        }
        
        if (this.elements.fileInfo) {
            this.elements.fileInfo.classList.remove('hidden');
        }
        
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = false;
        }
        
        // Create video preview
        const videoURL = URL.createObjectURL(file);
        this.video = document.createElement('video');
        this.video.src = videoURL;
        this.video.muted = true;
        
        console.log('✅ File ready for analysis');
    }

    clearFile() {
        console.log('🗑️ Clearing file...');
        
        if (this.video) {
            URL.revokeObjectURL(this.video.src);
            this.video = null;
        }
        
        this.videoFile = null;
        
        if (this.elements.fileInfo) {
            this.elements.fileInfo.classList.add('hidden');
        }
        
        if (this.elements.videoInput) {
            this.elements.videoInput.value = '';
        }
        
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = true;
        }
    }

    async startAnalysis() {
        console.log('🚀 Starting analysis...');
        
        if (!this.videoFile || this.isAnalyzing) {
            console.warn('Cannot start analysis');
            return;
        }
        
        this.isAnalyzing = true;
        this.results = [];
        
        // Show progress
        if (this.elements.progressSection) {
            this.elements.progressSection.classList.remove('hidden');
        }
        
        if (this.elements.resultsSection) {
            this.elements.resultsSection.classList.add('hidden');
        }
        
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = true;
        }
        
        // Start timing
        this.startTime = Date.now();
        this.updateProgressTime();
        this.progressInterval = setInterval(() => this.updateProgressTime(), 1000);
        
        try {
            // Analyze with pure JavaScript
            await this.analyzeVideoJS();
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('❌ Analysis error:', error);
            this.showError('Analysis failed: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            clearInterval(this.progressInterval);
            if (this.elements.analyzeBtn) {
                this.elements.analyzeBtn.disabled = false;
            }
        }
    }

    async analyzeVideoJS() {
        console.log('🎬 Starting pure JavaScript analysis...');
        
        if (!this.video) {
            this.video = document.createElement('video');
            this.video.src = URL.createObjectURL(this.videoFile);
            this.video.muted = true;
            this.video.playsInline = true;
        }
        
        // Wait for video to load
        await new Promise((resolve) => {
            if (this.video.readyState >= 2) {
                resolve();
            } else {
                this.video.addEventListener('loadedmetadata', resolve);
            }
        });
        
        // Setup canvas
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        const duration = this.video.duration;
        const fps = 30; // Assume 30 FPS
        const totalFrames = Math.floor(duration * fps);
        const samplingRate = this.samplingRate || 30;
        
        console.log(`📊 Video: ${this.video.videoWidth}x${this.video.videoHeight}, ${duration.toFixed(2)}s`);
        
        // Process frames
        const timeIncrement = samplingRate / fps;
        let currentTime = 0;
        let framesProcessed = 0;
        
        while (currentTime < duration && this.isAnalyzing) {
            // Seek to current time
            this.video.currentTime = currentTime;
            
            await new Promise((resolve) => {
                const onSeeked = () => {
                    this.video.removeEventListener('seeked', onSeeked);
                    
                    try {
                        // Draw frame
                        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                        
                        // Get pixel data
                        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                        
                        // Analyze frame
                        const result = this.analyzeFrameJS(imageData, currentTime, framesProcessed);
                        this.results.push(result);
                        
                        framesProcessed++;
                        
                    } catch (error) {
                        console.error(`Error processing frame:`, error);
                    }
                    
                    // Update progress
                    const progress = (currentTime / duration) * 100;
                    this.updateProgress(progress, framesProcessed, Math.floor(duration / timeIncrement));
                    
                    resolve();
                };
                
                this.video.addEventListener('seeked', onSeeked);
            });
            
            currentTime += timeIncrement;
            
            // Yield to UI every 5 frames
            if (framesProcessed % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        console.log(`✅ Analysis complete. Processed ${framesProcessed} frames.`);
    }

    analyzeFrameJS(imageData, timestamp, frameIndex) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // 1. SIMULATE MASK: Remove bright areas (electrodes)
        const maskedData = new Uint8ClampedArray(data);
        let lcPixelCount = 0;
        let totalBrightness = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            
            // If not too bright (not electrode), count as LC pixel
            if (brightness < 200) {
                lcPixelCount++;
                totalBrightness += brightness;
            } else {
                // Set electrode areas to white
                maskedData[i] = 255;
                maskedData[i + 1] = 255;
                maskedData[i + 2] = 255;
            }
        }
        
        // 2. CALCULATE VARIANCE for LC pixels
        let variance = 0;
        if (lcPixelCount > 0) {
            const meanBrightness = totalBrightness / lcPixelCount;
            let sumSquaredDiff = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (brightness < 200) { // LC pixel
                    sumSquaredDiff += Math.pow(brightness - meanBrightness, 2);
                }
            }
            
            variance = sumSquaredDiff / lcPixelCount;
        }
        
        // 3. SIMPLE EDGE DETECTION for contours
        let edgeCount = this.detectEdgesJS(maskedData, width, height);
        
        // Scale edge count to match Python results (empirical scaling)
        const scaledContours = Math.floor(edgeCount / 100);
        
        // 4. CLASSIFY (SAME LOGIC AS PYTHON)
        const phaseContour = scaledContours < this.CONTOUR_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
        const phaseVariance = variance >= this.VARIANCE_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
        
        return {
            frame_number: frameIndex,
            timestamp_seconds: timestamp,
            timestamp_minutes: timestamp / 60,
            num_contours: scaledContours,
            phase_contour: phaseContour,
            variance: parseFloat(variance.toFixed(2)),
            std_dev: parseFloat(Math.sqrt(variance).toFixed(2)),
            phase_variance: phaseVariance,
            lc_pixels: lcPixelCount
        };
    }

    detectEdgesJS(data, width, height) {
        // Simple Sobel edge detection
        let edgeCount = 0;
        const threshold = 30;
        
        // Convert to grayscale array
        const gray = new Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const idx = Math.floor(i / 4);
            gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        
        // Apply Sobel operator
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // Skip if pixel is white (electrode)
                if (gray[idx] > 250) continue;
                
                // Sobel kernels
                const gx = 
                    -gray[(y-1)*width + (x-1)] + gray[(y-1)*width + (x+1)] +
                    -2 * gray[y*width + (x-1)] + 2 * gray[y*width + (x+1)] +
                    -gray[(y+1)*width + (x-1)] + gray[(y+1)*width + (x+1)];
                
                const gy = 
                    gray[(y-1)*width + (x-1)] + 2 * gray[(y-1)*width + x] + gray[(y-1)*width + (x+1)] +
                    -gray[(y+1)*width + (x-1)] - 2 * gray[(y+1)*width + x] - gray[(y+1)*width + (x+1)];
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                if (magnitude > threshold) {
                    edgeCount++;
                }
            }
        }
        
        return edgeCount;
    }

    updateProgress(percent, currentFrame, totalFrames) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percent}%`;
        }
        
        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent = `${Math.round(percent)}%`;
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `Frame ${currentFrame} of ~${totalFrames}`;
        }
        
        if (this.elements.framesProcessed) {
            this.elements.framesProcessed.textContent = currentFrame;
        }
        
        if (this.elements.currentPhase && this.results.length > 0) {
            const last = this.results[this.results.length - 1];
            this.elements.currentPhase.textContent = last.phase_contour;
            this.elements.currentPhase.style.color = 
                last.phase_contour === 'CHOLESTERIC' ? '#4361ee' : '#f72585';
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
        console.log('📊 Showing results...');
        
        if (this.elements.progressSection) {
            this.elements.progressSection.classList.add('hidden');
        }
        
        if (this.elements.resultsSection) {
            this.elements.resultsSection.classList.remove('hidden');
        }
        
        // Calculate statistics
        const stats = this.calculateStatistics();
        
        // Update UI
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
        
        // Create charts
        this.createCharts();
        
        console.log('✅ Results displayed');
    }

    calculateStatistics() {
        if (this.results.length === 0) {
            return {
                cholestericPercent: 0,
                isotropicPercent: 0,
                cholestericDuration: 0,
                isotropicDuration: 0,
                transitionTime: null
            };
        }
        
        const total = this.results.length;
        const cholesteric = this.results.filter(r => r.phase_contour === 'CHOLESTERIC').length;
        const isotropic = total - cholesteric;
        
        // Find transition
        let transitionTime = null;
        for (let i = 1; i < this.results.length; i++) {
            if (this.results[i-1].phase_contour === 'CHOLESTERIC' && 
                this.results[i].phase_contour === 'ISOTROPIC') {
                transitionTime = this.results[i].timestamp_minutes;
                break;
            }
        }
        
        // Duration
        const videoDuration = this.results[this.results.length - 1].timestamp_minutes || 1;
        
        return {
            cholestericPercent: ((cholesteric / total) * 100).toFixed(1),
            isotropicPercent: ((isotropic / total) * 100).toFixed(1),
            cholestericDuration: (cholesteric / total) * videoDuration,
            isotropicDuration: (isotropic / total) * videoDuration,
            transitionTime: transitionTime
        };
    }

    createCharts() {
        if (this.results.length === 0) return;
        
        const times = this.results.map(r => r.timestamp_minutes);
        const contours = this.results.map(r => r.num_contours);
        const variances = this.results.map(r => r.variance);
        
        // Destroy old charts
        if (this.charts.contour) {
            this.charts.contour.destroy();
        }
        if (this.charts.variance) {
            this.charts.variance.destroy();
        }
        
        // Contour Chart
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
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Time (minutes)' } },
                        y: { 
                            title: { display: true, text: 'Number of Contours' },
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        // Variance Chart
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
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Time (minutes)' } },
                        y: { 
                            title: { display: true, text: 'Variance' },
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    downloadCSV() {
        if (this.results.length === 0) {
            this.showError('No data to download');
            return;
        }
        
        try {
            const csv = Papa.unparse(this.results);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `lc_analysis_${Date.now()}.csv`);
            console.log('✅ CSV downloaded');
        } catch (error) {
            console.error('CSV download error:', error);
            this.showError('Failed to download CSV');
        }
    }

    downloadPlot() {
        if (this.results.length === 0) {
            this.showError('No data to download');
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            
            // Simple plot
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Liquid Crystal Analysis', 50, 40);
            
            // Statistics
            const stats = this.calculateStatistics();
            ctx.font = '16px Arial';
            ctx.fillStyle = '#4361ee';
            ctx.fillText(`Cholesteric: ${stats.cholestericPercent}%`, 50, 80);
            ctx.fillStyle = '#f72585';
            ctx.fillText(`Isotropic: ${stats.isotropicPercent}%`, 50, 110);
            
            // Download
            canvas.toBlob(blob => {
                saveAs(blob, `lc_plot_${Date.now()}.png`);
            }, 'image/png');
            
        } catch (error) {
            console.error('Plot download error:', error);
            this.showError('Failed to download plot');
        }
    }

    resetAnalysis() {
        console.log('🔄 Resetting analysis...');
        
        this.isAnalyzing = false;
        clearInterval(this.progressInterval);
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
        if (this.charts.contour) {
            this.charts.contour.destroy();
            this.charts.contour = null;
        }
        if (this.charts.variance) {
            this.charts.variance.destroy();
            this.charts.variance = null;
        }
        
        // Reset progress
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = '0%';
        }
        
        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent = '0%';
        }
        
        if (this.elements.framesProcessed) {
            this.elements.framesProcessed.textContent = '0';
        }
        
        if (this.elements.elapsedTime) {
            this.elements.elapsedTime.textContent = '0s';
        }
        
        // Clear file
        this.clearFile();
        
        console.log('✅ Analysis reset');
    }

    updateSliderValues() {
        // Set slider values
        if (this.elements.contourThreshold) {
            this.elements.contourThreshold.value = this.CONTOUR_THRESHOLD;
        }
        if (this.elements.varianceThreshold) {
            this.elements.varianceThreshold.value = this.VARIANCE_THRESHOLD;
        }
        if (this.elements.samplingRate) {
            this.elements.samplingRate.value = this.samplingRate;
        }
        
        // Set display values
        if (this.elements.contourValue) {
            this.elements.contourValue.textContent = this.CONTOUR_THRESHOLD;
        }
        if (this.elements.varianceValue) {
            this.elements.varianceValue.textContent = this.VARIANCE_THRESHOLD;
        }
        if (this.elements.samplingValue) {
            this.elements.samplingValue.textContent = this.samplingRate;
        }
    }

    showError(message) {
        console.error('❌ Error:', message);
        alert('Error: ' + message);
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.VideoAnalyzer = VideoAnalyzer;
    console.log('✅ VideoAnalyzer exported to window');
}

console.log('✅ analyzer.js loaded successfully');
