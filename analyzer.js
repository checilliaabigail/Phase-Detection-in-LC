// analyzer.js - IMPROVED DETECTION ALGORITHM
console.log('🎬 analyzer.js loading...');

class VideoAnalyzer {
    constructor() {
        console.log('✅ VideoAnalyzer instantiated');
        
        // State
        this.videoFile = null;
        this.results = [];
        this.charts = {};
        this.isAnalyzing = false;
        this.progressInterval = null;
        this.startTime = null;
        
        // PARAMETER YANG LEBIH REALISTIC untuk Liquid Crystal
        // Berdasarkan analisis pola di video:
        // - Cholesteric: pola tekstur kompleks, banyak edge, variance rendah-moderat
        // - Isotropic: homogen, sedikit edge, variance tinggi (noise)
        this.CONTOUR_THRESHOLD = 25;     // DINAIKKAN dari 15 ke 25
        this.VARIANCE_THRESHOLD = 85;    // DITURUNKAN dari 96 ke 85 (karena isotropic lebih noisy)
        this.samplingRate = 30;
        
        // Elements cache
        this.elements = {};
        
        // Canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        console.log('⚙️ IMPROVED Parameters for LC detection:');
        console.log(`  CONTOUR_THRESHOLD = ${this.CONTOUR_THRESHOLD} (higher = more sensitive to Isotropic)`);
        console.log(`  VARIANCE_THRESHOLD = ${this.VARIANCE_THRESHOLD} (lower = more sensitive to Cholesteric)`);
    }

    init() {
        console.log('🔄 Initializing...');
        try {
            this.cacheElements();
            this.setupEventListeners();
            this.updateSliderValues();
            console.log('✅ Initialized');
        } catch (error) {
            console.error('❌ Init error:', error);
            this.showError('Initialization failed');
        }
    }

    cacheElements() {
        console.log('🔍 Caching elements...');
        
        const essentialIds = [
            'uploadArea', 'videoInput', 'fileInfo', 'removeFile',
            'fileName', 'fileSize', 'analyzeBtn', 'resetBtn',
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
        essentialIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) this.elements[id] = el;
        });
    }

    setupEventListeners() {
        console.log('🔗 Setting up listeners...');
        
        // Upload
        if (this.elements.uploadArea && this.elements.videoInput) {
            this.elements.uploadArea.addEventListener('click', () => {
                this.elements.videoInput.click();
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
        
        // Sliders - real-time update
        if (this.elements.contourThreshold && this.elements.contourValue) {
            this.elements.contourThreshold.addEventListener('input', (e) => {
                this.CONTOUR_THRESHOLD = parseInt(e.target.value);
                this.elements.contourValue.textContent = this.CONTOUR_THRESHOLD;
                console.log(`🎚️ Contour threshold updated: ${this.CONTOUR_THRESHOLD}`);
            });
        }
        
        if (this.elements.varianceThreshold && this.elements.varianceValue) {
            this.elements.varianceThreshold.addEventListener('input', (e) => {
                this.VARIANCE_THRESHOLD = parseInt(e.target.value);
                this.elements.varianceValue.textContent = this.VARIANCE_THRESHOLD;
                console.log(`🎚️ Variance threshold updated: ${this.VARIANCE_THRESHOLD}`);
            });
        }
        
        if (this.elements.samplingRate && this.elements.samplingValue) {
            this.elements.samplingRate.addEventListener('input', (e) => {
                this.samplingRate = parseInt(e.target.value);
                this.elements.samplingValue.textContent = this.samplingRate;
            });
        }
    }

    handleFileSelect(file) {
        console.log('📁 File selected:', file.name);
        
        // Validation
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showError('File too large. Max 500MB.');
            return;
        }
        
        const validExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        if (!validExts.includes(fileExt)) {
            this.showError('Invalid file type.');
            return;
        }
        
        this.videoFile = file;
        
        // Update UI
        if (this.elements.fileName) this.elements.fileName.textContent = file.name;
        if (this.elements.fileSize) {
            this.elements.fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2);
        }
        if (this.elements.fileInfo) this.elements.fileInfo.classList.remove('hidden');
        if (this.elements.analyzeBtn) this.elements.analyzeBtn.disabled = false;
        
        console.log('✅ File ready for analysis');
    }

    clearFile() {
        console.log('🗑️ Clearing file...');
        this.videoFile = null;
        if (this.elements.fileInfo) this.elements.fileInfo.classList.add('hidden');
        if (this.elements.videoInput) this.elements.videoInput.value = '';
        if (this.elements.analyzeBtn) this.elements.analyzeBtn.disabled = true;
    }

    async startAnalysis() {
        console.log('🚀 Starting analysis...');
        
        if (!this.videoFile || this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.results = [];
        
        // Show progress
        if (this.elements.progressSection) this.elements.progressSection.classList.remove('hidden');
        if (this.elements.resultsSection) this.elements.resultsSection.classList.add('hidden');
        if (this.elements.analyzeBtn) this.elements.analyzeBtn.disabled = true;
        
        // Timing
        this.startTime = Date.now();
        this.updateProgressTime();
        this.progressInterval = setInterval(() => this.updateProgressTime(), 1000);
        
        try {
            await this.analyzeVideoWithImprovedDetection();
            this.showResults();
        } catch (error) {
            console.error('❌ Analysis error:', error);
            this.showError('Analysis failed');
        } finally {
            this.isAnalyzing = false;
            clearInterval(this.progressInterval);
            if (this.elements.analyzeBtn) this.elements.analyzeBtn.disabled = false;
        }
    }

    async analyzeVideoWithImprovedDetection() {
        console.log('🎬 Starting IMPROVED analysis...');
        
        // Create video element
        const video = document.createElement('video');
        video.src = URL.createObjectURL(this.videoFile);
        video.muted = true;
        video.playsInline = true;
        
        // Wait for metadata
        await new Promise(resolve => {
            if (video.readyState >= 2) resolve();
            else video.addEventListener('loadedmetadata', resolve);
        });
        
        // Setup canvas
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        
        const duration = video.duration;
        const fps = 30;
        const samplingRate = this.samplingRate || 30;
        const timeIncrement = samplingRate / fps;
        
        console.log(`📊 Video: ${video.videoWidth}x${video.videoHeight}, ${duration.toFixed(2)}s`);
        
        // Process frames
        let currentTime = 0;
        let framesProcessed = 0;
        
        while (currentTime < duration && this.isAnalyzing) {
            video.currentTime = currentTime;
            
            await new Promise((resolve) => {
                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    
                    try {
                        // Draw frame
                        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
                        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                        
                        // IMPROVED ANALYSIS
                        const result = this.analyzeFrameWithTextureDetection(imageData, currentTime, framesProcessed);
                        this.results.push(result);
                        
                        framesProcessed++;
                        
                    } catch (error) {
                        console.error('Frame error:', error);
                    }
                    
                    // Update progress
                    const progress = (currentTime / duration) * 100;
                    this.updateProgress(progress, framesProcessed, Math.floor(duration / timeIncrement));
                    
                    resolve();
                };
                
                video.addEventListener('seeked', onSeeked);
            });
            
            currentTime += timeIncrement;
            
            // Yield occasionally
            if (framesProcessed % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        console.log(`✅ Analysis complete. Processed ${framesProcessed} frames.`);
        URL.revokeObjectURL(video.src);
    }

    // ===========================================================
    // IMPROVED FRAME ANALYSIS - UNTUK LIQUID CRYSTAL
    // ===========================================================
    analyzeFrameWithTextureDetection(imageData, timestamp, frameIndex) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // 1. CONVERT TO GRAYSCALE AND APPLY SIMPLE MASK
        const gray = new Array(width * height);
        const lcPixels = [];
        
        for (let i = 0; i < data.length; i += 4) {
            const idx = Math.floor(i / 4);
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            
            gray[idx] = brightness;
            
            // Simple electrode mask: skip very bright areas
            if (brightness < 200) {
                lcPixels.push(brightness);
            }
        }
        
        // 2. CALCULATE TEXTURE METRICS (for LC pixels only)
        let variance = 0;
        let mean = 0;
        
        if (lcPixels.length > 0) {
            // Calculate mean
            mean = lcPixels.reduce((sum, val) => sum + val, 0) / lcPixels.length;
            
            // Calculate variance
            variance = lcPixels.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / lcPixels.length;
        }
        
        // 3. IMPROVED TEXTURE/EDGE DETECTION untuk Liquid Crystal
        // Cholesteric: banyak pola, texture complexity tinggi
        // Isotropic: homogen, texture complexity rendah
        
        let textureScore = 0;
        let edgeCount = 0;
        
        // Algorithm untuk detect texture complexity
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // Skip electrode areas
                if (gray[idx] > 200) continue;
                
                // Local neighborhood
                const neighbors = [
                    gray[idx - width - 1], gray[idx - width], gray[idx - width + 1],
                    gray[idx - 1], gray[idx], gray[idx + 1],
                    gray[idx + width - 1], gray[idx + width], gray[idx + width + 1]
                ];
                
                // Calculate local variance (texture indicator)
                const localMean = neighbors.reduce((s, v) => s + v, 0) / 9;
                const localVariance = neighbors.reduce((s, v) => s + Math.pow(v - localMean, 2), 0) / 9;
                
                // Texture score accumulates local variations
                textureScore += localVariance;
                
                // Edge detection using gradient
                const gx = (
                    -gray[idx - width - 1] + gray[idx - width + 1] +
                    -2 * gray[idx - 1] + 2 * gray[idx + 1] +
                    -gray[idx + width - 1] + gray[idx + width + 1]
                );
                
                const gy = (
                    gray[idx - width - 1] + 2 * gray[idx - width] + gray[idx - width + 1] +
                    -gray[idx + width - 1] - 2 * gray[idx + width] - gray[idx + width + 1]
                );
                
                const gradient = Math.sqrt(gx * gx + gy * gy);
                
                if (gradient > 20) { // Edge threshold
                    edgeCount++;
                }
            }
        }
        
        // Normalize scores
        const normalizedTexture = Math.floor(textureScore / 10000);
        const normalizedEdges = Math.floor(edgeCount / 1000);
        
        // Combined score (weighted)
        const contourScore = Math.floor(normalizedTexture * 0.7 + normalizedEdges * 0.3);
        
        // 4. PHASE CLASSIFICATION - IMPROVED LOGIC
        // Cholesteric: high texture, low-moderate variance
        // Isotropic: low texture, high variance (noisy)
        
        let phaseContour, phaseVariance;
        
        // Contour-based classification
        if (contourScore < this.CONTOUR_THRESHOLD) {
            phaseContour = "ISOTROPIC";  // Few textures/edges
        } else {
            phaseContour = "CHOLESTERIC"; // Many textures/edges
        }
        
        // Variance-based classification
        if (variance >= this.VARIANCE_THRESHOLD) {
            phaseVariance = "ISOTROPIC";    // High variance = noisy = isotropic
        } else {
            phaseVariance = "CHOLESTERIC";  // Low variance = structured = cholesteric
        }
        
        // Debug logging for first few frames
        if (frameIndex < 5) {
            console.log(`Frame ${frameIndex}:`);
            console.log(`  Texture: ${normalizedTexture}, Edges: ${normalizedEdges}`);
            console.log(`  Contour Score: ${contourScore} -> ${phaseContour}`);
            console.log(`  Variance: ${variance.toFixed(2)} -> ${phaseVariance}`);
        }
        
        return {
            frame_number: frameIndex,
            timestamp_seconds: timestamp,
            timestamp_minutes: timestamp / 60,
            num_contours: contourScore,
            phase_contour: phaseContour,
            variance: parseFloat(variance.toFixed(2)),
            std_dev: parseFloat(Math.sqrt(variance).toFixed(2)),
            phase_variance: phaseVariance,
            texture_score: normalizedTexture,
            edge_count: normalizedEdges,
            lc_pixels: lcPixels.length
        };
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
            this.elements.elapsedTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    showResults() {
        console.log('📊 Showing results...');
        
        if (this.elements.progressSection) this.elements.progressSection.classList.add('hidden');
        if (this.elements.resultsSection) this.elements.resultsSection.classList.remove('hidden');
        
        const stats = this.calculateStatistics();
        
        // Update UI
        if (this.elements.cholestericPercent) this.elements.cholestericPercent.textContent = `${stats.cholestericPercent}%`;
        if (this.elements.cholestericDuration) this.elements.cholestericDuration.textContent = `${stats.cholestericDuration.toFixed(2)} min`;
        if (this.elements.isotropicPercent) this.elements.isotropicPercent.textContent = `${stats.isotropicPercent}%`;
        if (this.elements.isotropicDuration) this.elements.isotropicDuration.textContent = `${stats.isotropicDuration.toFixed(2)} min`;
        if (this.elements.transitionTime) {
            this.elements.transitionTime.textContent = stats.transitionTime ? 
                `${stats.transitionTime.toFixed(2)} min` : 'No transition';
        }
        
        console.log('📈 Statistics:', stats);
        
        this.createCharts();
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
        
        // Find transition
        let transitionTime = null;
        for (let i = 1; i < this.results.length; i++) {
            if (this.results[i-1].phase_contour === 'CHOLESTERIC' && 
                this.results[i].phase_contour === 'ISOTROPIC') {
                transitionTime = this.results[i].timestamp_minutes;
                break;
            }
        }
        
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
        if (this.results.length === 0) return;
        
        const times = this.results.map(r => r.timestamp_minutes);
        const contours = this.results.map(r => r.num_contours);
        const variances = this.results.map(r => r.variance);
        
        // Clear old charts
        if (this.charts.contour) this.charts.contour.destroy();
        if (this.charts.variance) this.charts.variance.destroy();
        
        // Contour Chart
        if (this.elements.contourChart) {
            const ctx = this.elements.contourChart.getContext('2d');
            this.charts.contour = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: times,
                    datasets: [{
                        label: 'Texture Complexity',
                        data: contours,
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }, {
                        label: 'Threshold',
                        data: contours.map(() => this.CONTOUR_THRESHOLD),
                        borderColor: '#f72585',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Texture: ${context.parsed.y} (${context.parsed.y < context.dataset.data[0] ? 'Isotropic' : 'Cholesteric'})`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Time (minutes)' } },
                        y: { 
                            title: { display: true, text: 'Texture Complexity Score' },
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
                        tension: 0.4,
                        pointRadius: 0
                    }, {
                        label: 'Threshold',
                        data: variances.map(() => this.VARIANCE_THRESHOLD),
                        borderColor: '#4361ee',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Variance: ${context.parsed.y.toFixed(2)} (${context.parsed.y >= context.dataset.data[0] ? 'Isotropic' : 'Cholesteric'})`;
                                }
                            }
                        }
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
        } catch (error) {
            console.error('CSV error:', error);
            this.showError('Download failed');
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
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Liquid Crystal Analysis', 50, 40);
            
            const stats = this.calculateStatistics();
            ctx.font = '16px Arial';
            ctx.fillStyle = '#4361ee';
            ctx.fillText(`Cholesteric: ${stats.cholestericPercent}%`, 50, 80);
            ctx.fillStyle = '#f72585';
            ctx.fillText(`Isotropic: ${stats.isotropicPercent}%`, 50, 110);
            
            canvas.toBlob(blob => {
                saveAs(blob, `lc_plot_${Date.now()}.png`);
            }, 'image/png');
        } catch (error) {
            console.error('Plot error:', error);
            this.showError('Download failed');
        }
    }

    resetAnalysis() {
        this.isAnalyzing = false;
        clearInterval(this.progressInterval);
        this.results = [];
        
        if (this.elements.progressSection) this.elements.progressSection.classList.add('hidden');
        if (this.elements.resultsSection) this.elements.resultsSection.classList.add('hidden');
        if (this.elements.analyzeBtn) this.elements.analyzeBtn.disabled = false;
        
        if (this.charts.contour) {
            this.charts.contour.destroy();
            this.charts.contour = null;
        }
        if (this.charts.variance) {
            this.charts.variance.destroy();
            this.charts.variance = null;
        }
        
        this.clearFile();
    }

    updateSliderValues() {
        if (this.elements.contourThreshold) this.elements.contourThreshold.value = this.CONTOUR_THRESHOLD;
        if (this.elements.varianceThreshold) this.elements.varianceThreshold.value = this.VARIANCE_THRESHOLD;
        if (this.elements.samplingRate) this.elements.samplingRate.value = this.samplingRate;
        
        if (this.elements.contourValue) this.elements.contourValue.textContent = this.CONTOUR_THRESHOLD;
        if (this.elements.varianceValue) this.elements.varianceValue.textContent = this.VARIANCE_THRESHOLD;
        if (this.elements.samplingValue) this.elements.samplingValue.textContent = this.samplingRate;
    }

    showError(message) {
        console.error('❌ Error:', message);
        alert('Error: ' + message);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.VideoAnalyzer = VideoAnalyzer;
    console.log('✅ VideoAnalyzer exported');
}

console.log('✅ analyzer.js loaded');
