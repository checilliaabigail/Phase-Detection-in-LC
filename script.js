class VideoAnalyzer {
    constructor() {
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
    }

    init() {
        this.setupEventListeners();
        this.updateSliderValues();
    }

    setupEventListeners() {
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const videoInput = document.getElementById('videoInput');
        const fileInfo = document.getElementById('fileInfo');
        const removeFileBtn = document.getElementById('removeFile');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const resetBtn = document.getElementById('resetBtn');

        // Drag and drop
        uploadArea.addEventListener('click', () => videoInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.background = 'rgba(67, 97, 238, 0.15)';
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
            if (e.dataTransfer.files.length) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        videoInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        removeFileBtn.addEventListener('click', () => {
            this.clearFile();
        });

        // Sliders
        const sliders = ['contourThreshold', 'varianceThreshold', 'samplingRate'];
        sliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            const valueSpan = document.getElementById(sliderId.replace('Threshold', 'Value').replace('Rate', 'Value'));
            
            slider.addEventListener('input', (e) => {
                valueSpan.textContent = e.target.value;
                this[sliderId] = parseInt(e.target.value);
            });
        });

        // Buttons
        analyzeBtn.addEventListener('click', () => this.startAnalysis());
        resetBtn.addEventListener('click', () => this.resetAnalysis());

        // Download buttons
        document.getElementById('downloadCSV').addEventListener('click', () => this.downloadCSV());
        document.getElementById('downloadPlot').addEventListener('click', () => this.downloadPlot());
        document.getElementById('downloadAll').addEventListener('click', () => this.downloadAll());
    }

    handleFileSelect(file) {
        // Check file size (max 500MB)
        if (file.size > 500 * 1024 * 1024) {
            alert('File too large. Maximum size is 500MB.');
            return;
        }

        // Check file type
        const validTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska', 'video/webm'];
        if (!validTypes.includes(file.type)) {
            alert('Invalid file type. Please upload a video file.');
            return;
        }

        this.videoFile = file;
        
        // Update UI
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = (file.size / (1024 * 1024)).toFixed(2);
        document.getElementById('fileInfo').classList.remove('hidden');
        document.getElementById('analyzeBtn').disabled = false;

        // Create video preview
        const videoURL = URL.createObjectURL(file);
        if (!this.video) {
            this.video = document.createElement('video');
        }
        this.video.src = videoURL;
    }

    clearFile() {
        this.videoFile = null;
        if (this.video) {
            this.video.src = '';
        }
        
        document.getElementById('fileInfo').classList.add('hidden');
        document.getElementById('videoInput').value = '';
        document.getElementById('analyzeBtn').disabled = true;
    }

    updateSliderValues() {
        document.getElementById('contourValue').textContent = this.contourThreshold;
        document.getElementById('varianceValue').textContent = this.varianceThreshold;
        document.getElementById('samplingValue').textContent = this.samplingRate;
    }

    async startAnalysis() {
        if (!this.videoFile || this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.results = [];
        
        // Show progress section
        document.getElementById('progressSection').classList.remove('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        
        // Disable UI
        document.getElementById('analyzeBtn').disabled = true;
        
        // Start timing
        this.startTime = Date.now();
        this.updateProgressTime();
        this.progressInterval = setInterval(() => this.updateProgressTime(), 1000);

        try {
            // Simulate analysis (you'll replace this with actual analysis)
            await this.simulateAnalysis();
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Analysis failed: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            clearInterval(this.progressInterval);
            document.getElementById('analyzeBtn').disabled = false;
        }
    }

    async simulateAnalysis() {
        // This is a simulation - replace with actual video analysis
        const totalFrames = 1000; // Simulated total frames
        const chunkSize = 50;
        
        for (let frame = 0; frame < totalFrames; frame += chunkSize) {
            if (!this.isAnalyzing) break;
            
            // Simulate processing chunk
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Generate simulated results
            for (let i = 0; i < chunkSize; i++) {
                const time = (frame + i) / 30; // Assuming 30 FPS
                const contours = this.generateSimulatedData(time, 'contours');
                const variance = this.generateSimulatedData(time, 'variance');
                const phase = contours < this.contourThreshold ? 'ISOTROPIC' : 'CHOLESTERIC';
                
                this.results.push({
                    frame: frame + i,
                    time: time / 60, // Convert to minutes
                    contours: contours,
                    variance: variance,
                    phase: phase
                });
            }
            
            // Update progress
            const progress = ((frame + chunkSize) / totalFrames) * 100;
            this.updateProgress(progress, frame + chunkSize, totalFrames);
        }
    }

    generateSimulatedData(time, type) {
        // Generate realistic looking data
        const transitionTime = 15; // Transition at 15 minutes
        
        if (type === 'contours') {
            if (time < transitionTime) {
                // Cholesteric phase: more contours
                return 40 + Math.random() * 10;
            } else {
                // Isotropic phase: fewer contours
                return 5 + Math.random() * 5;
            }
        } else {
            if (time < transitionTime) {
                // Cholesteric phase: lower variance
                return 92 + Math.random() * 4;
            } else {
                // Isotropic phase: higher variance
                return 98 + Math.random() * 2;
            }
        }
    }

    updateProgress(percent, currentFrame, totalFrames) {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressText = document.getElementById('progressText');
        const framesProcessed = document.getElementById('framesProcessed');
        const currentPhase = document.getElementById('currentPhase');
        
        progressFill.style.width = `${percent}%`;
        progressPercent.textContent = `${Math.round(percent)}%`;
        progressText.textContent = `Processing frame ${currentFrame} of ${totalFrames}`;
        framesProcessed.textContent = currentFrame;
        
        // Determine current phase based on latest data
        if (this.results.length > 0) {
            const lastResult = this.results[this.results.length - 1];
            currentPhase.textContent = lastResult.phase;
            currentPhase.style.color = lastResult.phase === 'CHOLESTERIC' ? 'var(--cholesteric)' : 'var(--isotropic)';
        }
    }

    updateProgressTime() {
        if (!this.startTime) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        document.getElementById('elapsedTime').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    showResults() {
        // Hide progress, show results
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');
        
        // Calculate statistics
        const stats = this.calculateStatistics();
        
        // Update summary cards
        document.getElementById('cholestericPercent').textContent = `${stats.cholestericPercent}%`;
        document.getElementById('cholestericDuration').textContent = `${stats.cholestericDuration.toFixed(2)} min`;
        document.getElementById('isotropicPercent').textContent = `${stats.isotropicPercent}%`;
        document.getElementById('isotropicDuration').textContent = `${stats.isotropicDuration.toFixed(2)} min`;
        document.getElementById('transitionTime').textContent = stats.transitionTime ?
            `${stats.transitionTime.toFixed(2)} min` : 'No transition';
        
        // Create charts
        this.createCharts();
        
        // Create timeline
        this.createTimeline();
    }

    calculateStatistics() {
        const total = this.results.length;
        const cholesteric = this.results.filter(r => r.phase === 'CHOLESTERIC').length;
        const isotropic = total - cholesteric;
        
        // Find transition
        let transitionTime = null;
        for (let i = 1; i < this.results.length; i++) {
            if (this.results[i-1].phase === 'CHOLESTERIC' && 
                this.results[i].phase === 'ISOTROPIC') {
                transitionTime = this.results[i].time;
                break;
            }
        }
        
        // Assuming video duration (simulated)
        const videoDuration = 30; // minutes
        
        return {
            cholestericPercent: ((cholesteric / total) * 100).toFixed(1),
            isotropicPercent: ((isotropic / total) * 100).toFixed(1),
            cholestericDuration: (cholesteric / total) * videoDuration,
            isotropicDuration: (isotropic / total) * videoDuration,
            transitionTime: transitionTime
        };
    }

    createCharts() {
        const times = this.results.map(r => r.time);
        const contours = this.results.map(r => r.contours);
        const variances = this.results.map(r => r.variance);
        
        // Destroy existing charts
        if (this.charts.contour) this.charts.contour.destroy();
        if (this.charts.variance) this.charts.variance.destroy();
        
        // Contour Chart
        const contourCtx = document.getElementById('contourChart').getContext('2d');
        this.charts.contour = new Chart(contourCtx, {
            type: 'line',
            data: {
                labels: times,
                datasets: [{
                    label: 'Number of Contours',
                    data: contours,
                    borderColor: 'var(--cholesteric)',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Threshold',
                    data: contours.map(() => this.contourThreshold),
                    borderColor: 'var(--danger)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
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
                        }
                    }
                }
            }
        });
        
        // Variance Chart
        const varianceCtx = document.getElementById('varianceChart').getContext('2d');
        this.charts.variance = new Chart(varianceCtx, {
            type: 'line',
            data: {
                labels: times,
                datasets: [{
                    label: 'Variance',
                    data: variances,
                    borderColor: 'var(--isotropic)',
                    backgroundColor: 'rgba(247, 37, 133, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Threshold',
                    data: variances.map(() => this.varianceThreshold),
                    borderColor: 'var(--danger)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
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
                        }
                    }
                }
            }
        });
    }

    createTimeline() {
        const timeline = document.getElementById('phaseTimeline');
        timeline.innerHTML = '';
        
        // Create timeline segments
        const segmentCount = 20;
        const segmentWidth = 100 / segmentCount;
        
        for (let i = 0; i < segmentCount; i++) {
            const segment = document.createElement('div');
            segment.className = 'timeline-segment';
            
            // Determine phase for this segment
            const segmentIndex = Math.floor(i / segmentCount * this.results.length);
            const phase = this.results[segmentIndex]?.phase;
            
            segment.style.width = `${segmentWidth}%`;
            segment.style.height = '100%';
            segment.style.backgroundColor = phase === 'CHOLESTERIC' ? 
                'var(--cholesteric)' : 'var(--isotropic)';
            segment.style.float = 'left';
            segment.style.borderRight = '1px solid white';
            
            // Add tooltip
            const time = (i / segmentCount * 30).toFixed(1); // 30 min total
            segment.title = `${time} min: ${phase || 'Unknown'}`;
            
            timeline.appendChild(segment);
        }
    }

    downloadCSV() {
        if (this.results.length === 0) return;
        
        const csv = Papa.unparse(this.results);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `liquid_crystal_analysis_${Date.now()}.csv`);
    }

    downloadPlot() {
        // Create a combined plot image
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw title
        ctx.fillStyle = 'black';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Liquid Crystal Phase Analysis', 50, 50);
        
        // Draw summary
        ctx.font = '16px Arial';
        ctx.fillText(`Cholesteric: ${document.getElementById('cholestericPercent').textContent}`, 50, 100);
        ctx.fillText(`Isotropic: ${document.getElementById('isotropicPercent').textContent}`, 50, 130);
        
        // Convert to blob and download
        canvas.toBlob(blob => {
            saveAs(blob, `analysis_plot_${Date.now()}.png`);
        });
    }

    downloadAll() {
        const zip = new JSZip();
        
        // Add CSV
        const csv = Papa.unparse(this.results);
        zip.file('analysis_results.csv', csv);
        
        // Add plot image
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        // ... draw on canvas ...
        canvas.toBlob(blob => {
            zip.file('analysis_plot.png', blob);
            
            // Add readme
            const readme = `Liquid Crystal Analysis Results\nGenerated on: ${new Date().toLocaleString()}`;
            zip.file('README.txt', readme);
            
            // Generate and download zip
            zip.generateAsync({type: 'blob'}).then(content => {
                saveAs(content, `liquid_crystal_analysis_${Date.now()}.zip`);
            });
        });
    }

    resetAnalysis() {
        this.isAnalyzing = false;
        clearInterval(this.progressInterval);
        this.results = [];
        
        // Reset UI
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;
        
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
        
        // Reset sliders
        this.contourThreshold = 15;
        this.varianceThreshold = 96;
        this.samplingRate = 30;
        this.updateSliderValues();
        
        // Reset slider UI
        document.getElementById('contourThreshold').value = 15;
        document.getElementById('varianceThreshold').value = 96;
        document.getElementById('samplingRate').value = 30;
    }
}
