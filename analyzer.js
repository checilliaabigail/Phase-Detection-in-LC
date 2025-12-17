class VideoAnalyzer {
    constructor() {
        console.log('VideoAnalyzer constructor called');
        this.video = null;
        this.videoFile = null;
        this.results = [];
        this.charts = {};
        this.isAnalyzing = false;
        this.progressInterval = null;
        this.startTime = null;
        
        // Thresholds
        this.contourThreshold = 15;
        this.varianceThreshold = 96;
        this.samplingRate = 30;
        
        // Elements cache
        this.elements = {};
    }

    init() {
        console.log('Initializing VideoAnalyzer...');
        
        // Cache elements first
        this.cacheElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update slider values
        this.updateSliderValues();
        
        console.log('VideoAnalyzer initialized successfully');
    }

    cacheElements() {
        console.log('Caching DOM elements...');
        
        // Cache all DOM elements dengan null checks
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
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
            if (!this.elements[id] && id !== 'contourChart' && id !== 'varianceChart') {
                console.warn(`Element with id "${id}" not found`);
            }
        });
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // File upload - dengan null checks
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
        if (this.elements.contourThreshold && this.elements.contourValue) {
            this.elements.contourThreshold.addEventListener('input', (e) => {
                this.contourThreshold = parseInt(e.target.value);
                this.elements.contourValue.textContent = e.target.value;
            });
        }

        if (this.elements.varianceThreshold && this.elements.varianceValue) {
            this.elements.varianceThreshold.addEventListener('input', (e) => {
                this.varianceThreshold = parseInt(e.target.value);
                this.elements.varianceValue.textContent = e.target.value;
            });
        }

        if (this.elements.samplingRate && this.elements.samplingValue) {
            this.elements.samplingRate.addEventListener('input', (e) => {
                this.samplingRate = parseInt(e.target.value);
                this.elements.samplingValue.textContent = e.target.value;
            });
        }

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
        
        console.log('Event listeners setup completed');
    }

    handleFileSelect(file) {
        console.log('File selected:', file.name);
        
        // Check file size (max 500MB)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showError('File too large. Maximum size is 500MB.');
            return;
        }

        // Check file type
        const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(fileExt)) {
            this.showError('Invalid file type. Please upload a video file (MP4, AVI, MOV, MKV, WebM).');
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
        
        // Create video element for preview (optional)
        const videoURL = URL.createObjectURL(file);
        this.video = document.createElement('video');
        this.video.src = videoURL;
        this.video.muted = true;
        
        console.log('File ready for analysis');
    }

    clearFile() {
        console.log('Clearing file...');
        
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
        console.log('Starting analysis...');
        
        if (!this.videoFile || this.isAnalyzing) {
            console.warn('Cannot start analysis: no file or already analyzing');
            return;
        }
        
        this.isAnalyzing = true;
        this.results = [];
        this.frameCount = 0;
        
        // Show progress section
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
            // Simulate analysis (for now)
            await this.simulateAnalysis();
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Analysis failed: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            clearInterval(this.progressInterval);
            if (this.elements.analyzeBtn) {
                this.elements.analyzeBtn.disabled = false;
            }
        }
    }

    async simulateAnalysis() {
        console.log('Simulating analysis (placeholder)...');
        
        // This is a simulation - in real implementation, use OpenCV
        const totalFrames = 100;
        const chunkSize = 10;
        
        for (let frame = 0; frame < totalFrames; frame += chunkSize) {
            if (!this.isAnalyzing) break;
            
            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Generate simulated data
            for (let i = 0; i < chunkSize; i++) {
                const time = (frame + i) / 30;
                const contours = Math.random() * 50;
                const variance = 80 + Math.random() * 40;
                
                this.results.push({
                    frame: frame + i,
                    time: time / 60,
                    timestamp_seconds: time,
                    contours: Math.round(contours),
                    variance: parseFloat(variance.toFixed(2)),
                    phase_contour: contours < this.contourThreshold ? 'ISOTROPIC' : 'CHOLESTERIC',
                    phase_variance: variance >= this.varianceThreshold ? 'ISOTROPIC' : 'CHOLESTERIC',
                    std_dev: Math.sqrt(variance)
                });
            }
            
            // Update progress
            const progress = ((frame + chunkSize) / totalFrames) * 100;
            this.updateProgress(progress, frame + chunkSize, totalFrames);
        }
        
        console.log('Simulation completed, results:', this.results.length);
    }

    updateProgress(percent, currentFrame, totalFrames) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percent}%`;
        }
        
        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent = `${Math.round(percent)}%`;
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `Processing frame ${currentFrame} of ${totalFrames}`;
        }
        
        if (this.elements.framesProcessed) {
            this.elements.framesProcessed.textContent = currentFrame;
        }
        
        if (this.elements.currentPhase && this.results.length > 0) {
            const lastResult = this.results[this.results.length - 1];
            this.elements.currentPhase.textContent = lastResult.phase_contour;
            this.elements.currentPhase.style.color = lastResult.phase_contour === 'CHOLESTERIC' ? 
                '#4361ee' : '#f72585';
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
        console.log('Showing results...');
        
        // Hide progress, show results
        if (this.elements.progressSection) {
            this.elements.progressSection.classList.add('hidden');
        }
        
        if (this.elements.resultsSection) {
            this.elements.resultsSection.classList.remove('hidden');
        }
        
        // Calculate statistics
        const stats = this.calculateStatistics();
        
        // Update summary cards
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
        
        // Create timeline
        this.createTimeline();
        
        console.log('Results displayed');
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
        
        // Find transition time
        let transitionTime = null;
        for (let i = 1; i < this.results.length; i++) {
            if (this.results[i-1].phase_contour === 'CHOLESTERIC' && 
                this.results[i].phase_contour === 'ISOTROPIC') {
                transitionTime = this.results[i].time;
                break;
            }
        }
        
        // Calculate durations
        const videoDuration = this.results[this.results.length - 1].time || 1;
        
        return {
            cholestericPercent: ((cholesteric / total) * 100).toFixed(1),
            isotropicPercent: ((isotropic / total) * 100).toFixed(1),
            cholestericDuration: (cholesteric / total) * videoDuration,
            isotropicDuration: (isotropic / total) * videoDuration,
            transitionTime: transitionTime
        };
    }

    createCharts() {
        console.log('Creating charts...');
        
        if (this.results.length === 0) {
            console.warn('No data for charts');
            return;
        }
        
        const times = this.results.map(r => r.time);
        const contours = this.results.map(r => r.contours);
        const variances = this.results.map(r => r.variance);
        
        // Destroy existing charts
        if (this.charts.contour) {
            this.charts.contour.destroy();
        }
        if (this.charts.variance) {
            this.charts.variance.destroy();
        }
        
        // Contour Chart
        if (this.elements.contourChart) {
            const contourCtx = this.elements.contourChart.getContext('2d');
            this.charts.contour = new Chart(contourCtx, {
                type: 'line',
                data: {
                    labels: times,
                    datasets: [{
                        label: 'Number of Contours',
                        data: contours,
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }, {
                        label: 'Threshold',
                        data: contours.map(() => this.contourThreshold),
                        borderColor: '#f72585',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'top',
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
        }
        
        // Variance Chart
        if (this.elements.varianceChart) {
            const varianceCtx = this.elements.varianceChart.getContext('2d');
            this.charts.variance = new Chart(varianceCtx, {
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
                        data: variances.map(() => this.varianceThreshold),
                        borderColor: '#4361ee',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'top',
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
        }
    }

    createTimeline() {
        if (!this.elements.phaseTimeline || this.results.length === 0) return;
        
        this.elements.phaseTimeline.innerHTML = '';
        
        // Group results into segments
        const segmentCount = Math.min(20, this.results.length);
        const segmentSize = Math.ceil(this.results.length / segmentCount);
        
        for (let i = 0; i < segmentCount; i++) {
            const startIdx = i * segmentSize;
            const endIdx = Math.min(startIdx + segmentSize, this.results.length);
            
            if (startIdx >= this.results.length) break;
            
            // Determine dominant phase
            const segmentResults = this.results.slice(startIdx, endIdx);
            const cholestericCount = segmentResults.filter(r => r.phase_contour === 'CHOLESTERIC').length;
            const dominantPhase = cholestericCount > segmentResults.length / 2 ? 'CHOLESTERIC' : 'ISOTROPIC';
            
            const segment = document.createElement('div');
            segment.className = 'timeline-segment';
            
            segment.style.width = `${100 / segmentCount}%`;
            segment.style.height = '100%';
            segment.style.backgroundColor = dominantPhase === 'CHOLESTERIC' ? 
                '#4361ee' : '#f72585';
            segment.style.float = 'left';
            segment.style.borderRight = '1px solid white';
            segment.style.position = 'relative';
            segment.style.cursor = 'pointer';
            
            // Tooltip
            const startTime = segmentResults[0].time.toFixed(1);
            const endTime = segmentResults[segmentResults.length - 1].time.toFixed(1);
            segment.title = `${startTime}-${endTime} min: ${dominantPhase}`;
            
            // Percentage indicator
            const percentage = document.createElement('div');
            percentage.className = 'timeline-percentage';
            percentage.textContent = `${Math.round((dominantPhase === 'CHOLESTERIC' ? cholestericCount : segmentResults.length - cholestericCount) / segmentResults.length * 100)}%`;
            percentage.style.position = 'absolute';
            percentage.style.top = '50%';
            percentage.style.left = '50%';
            percentage.style.transform = 'translate(-50%, -50%)';
            percentage.style.color = 'white';
            percentage.style.fontSize = '10px';
            percentage.style.fontWeight = 'bold';
            percentage.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            percentage.style.opacity = '0';
            percentage.style.transition = 'opacity 0.3s';
            
            segment.addEventListener('mouseenter', () => {
                percentage.style.opacity = '1';
            });
            
            segment.addEventListener('mouseleave', () => {
                percentage.style.opacity = '0';
            });
            
            segment.appendChild(percentage);
            this.elements.phaseTimeline.appendChild(segment);
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
            saveAs(blob, `liquid_crystal_analysis_${Date.now()}.csv`);
            console.log('CSV downloaded');
        } catch (error) {
            console.error('Error downloading CSV:', error);
            this.showError('Failed to download CSV');
        }
    }

    downloadPlot() {
        if (this.results.length === 0) {
            this.showError('No data to download');
            return;
        }
        
        try {
            // Create a simple plot image
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            
            // White background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Title
            ctx.fillStyle = '#212529';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Liquid Crystal Analysis Summary', 50, 40);
            
            // Statistics
            const stats = this.calculateStatistics();
            ctx.font = '16px Arial';
            ctx.fillStyle = '#4361ee';
            ctx.fillText(`Cholesteric: ${stats.cholestericPercent}%`, 50, 80);
            ctx.fillStyle = '#f72585';
            ctx.fillText(`Isotropic: ${stats.isotropicPercent}%`, 50, 110);
            
            // Convert to blob and download
            canvas.toBlob(blob => {
                saveAs(blob, `analysis_plot_${Date.now()}.png`);
                console.log('Plot image downloaded');
            }, 'image/png');
        } catch (error) {
            console.error('Error downloading plot:', error);
            this.showError('Failed to download plot');
        }
    }

    downloadAll() {
        if (this.results.length === 0) {
            this.showError('No data to download');
            return;
        }
        
        try {
            const zip = new JSZip();
            
            // Add CSV
            const csv = Papa.unparse(this.results);
            zip.file('analysis_results.csv', csv);
            
            // Add simple summary
            const summary = `Liquid Crystal Analysis Results\nGenerated: ${new Date().toLocaleString()}\n\n` +
                          `Total samples: ${this.results.length}\n` +
                          `Parameters: Contour=${this.contourThreshold}, Variance=${this.varianceThreshold}, Sampling=${this.samplingRate}`;
            
            zip.file('summary.txt', summary);
            
            // Generate zip
            zip.generateAsync({type: 'blob'}).then(content => {
                saveAs(content, `liquid_crystal_analysis_${Date.now()}.zip`);
                console.log('All files downloaded as ZIP');
            });
        } catch (error) {
            console.error('Error downloading all files:', error);
            this.showError('Failed to create download package');
        }
    }

    resetAnalysis() {
        console.log('Resetting analysis...');
        
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
        
        // Clear file
        this.clearFile();
        
        // Reset progress display
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
        
        // Clear timeline
        if (this.elements.phaseTimeline) {
            this.elements.phaseTimeline.innerHTML = '';
        }
        
        console.log('Analysis reset complete');
    }

    showError(message) {
        console.error('Error:', message);
        alert('Error: ' + message);
    }

    updateSliderValues() {
        // Set initial values
        if (this.elements.contourValue) {
            this.elements.contourValue.textContent = this.contourThreshold;
        }
        
        if (this.elements.varianceValue) {
            this.elements.varianceValue.textContent = this.varianceThreshold;
        }
        
        if (this.elements.samplingValue) {
            this.elements.samplingValue.textContent = this.samplingRate;
        }
        
        // Set slider values
        if (this.elements.contourThreshold) {
            this.elements.contourThreshold.value = this.contourThreshold;
        }
        
        if (this.elements.varianceThreshold) {
            this.elements.varianceThreshold.value = this.varianceThreshold;
        }
        
        if (this.elements.samplingRate) {
            this.elements.samplingRate.value = this.samplingRate;
        }
    }
}

// Export untuk global access
if (typeof window !== 'undefined') {
    window.VideoAnalyzer = VideoAnalyzer;
}
