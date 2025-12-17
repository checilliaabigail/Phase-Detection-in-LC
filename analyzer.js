class VideoAnalyzer {
    constructor() {
        this.video = null;
        this.videoFile = null;
        this.results = [];
        this.charts = {};
        this.isAnalyzing = false;
        this.worker = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Default parameters
        this.contourThreshold = 15;
        this.varianceThreshold = 96;
        this.samplingRate = 30;
        
        // Analysis state
        this.frameCount = 0;
        this.totalFrames = 0;
        this.startTime = null;
        
        // Bind methods
        this.onWorkerMessage = this.onWorkerMessage.bind(this);
        this.onWorkerError = this.onWorkerError.bind(this);
    }

    init() {
        this.setupEventListeners();
        this.updateSliderValues();
        this.initWorker();
    }

    initWorker() {
        if (window.Worker) {
            this.worker = new Worker('worker.js');
            this.worker.onmessage = this.onWorkerMessage;
            this.worker.onerror = this.onWorkerError;
        } else {
            console.warn('Web Workers not supported. Analysis will run on main thread.');
        }
    }

    setupEventListeners() {
        // File upload (sama seperti sebelumnya)
        const uploadArea = document.getElementById('uploadArea');
        const videoInput = document.getElementById('videoInput');
        const fileInfo = document.getElementById('fileInfo');
        const removeFileBtn = document.getElementById('removeFile');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const resetBtn = document.getElementById('resetBtn');

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

        removeFileBtn.addEventListener('click', () => this.clearFile());

        // Sliders
        const sliders = ['contourThreshold', 'varianceThreshold', 'samplingRate'];
        sliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            const valueSpan = document.getElementById(sliderId.replace('Threshold', 'Value').replace('Rate', 'Value'));
            
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                valueSpan.textContent = value;
                this[sliderId] = value;
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
        
        // Create video element to get metadata
        const videoURL = URL.createObjectURL(file);
        const tempVideo = document.createElement('video');
        
        tempVideo.addEventListener('loadedmetadata', () => {
            // Update UI with file info
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileSize').textContent = (file.size / (1024 * 1024)).toFixed(2);
            document.getElementById('fileInfo').classList.remove('hidden');
            document.getElementById('analyzeBtn').disabled = false;
            
            // Store video properties
            this.video = tempVideo;
            this.video.src = videoURL;
            this.totalFrames = Math.floor(tempVideo.duration * 30); // Estimate frames at 30fps
            
            tempVideo.remove();
        });
        
        tempVideo.src = videoURL;
    }

    clearFile() {
        if (this.video) {
            URL.revokeObjectURL(this.video.src);
            this.video = null;
        }
        
        this.videoFile = null;
        document.getElementById('fileInfo').classList.add('hidden');
        document.getElementById('videoInput').value = '';
        document.getElementById('analyzeBtn').disabled = true;
    }

    async startAnalysis() {
        if (!this.videoFile || this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.results = [];
        this.frameCount = 0;
        
        // Show progress section
        document.getElementById('progressSection').classList.remove('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = true;
        
        // Start timing
        this.startTime = Date.now();
        this.updateProgressTime();
        this.progressInterval = setInterval(() => this.updateProgressTime(), 1000);
        
        try {
            // Process video
            await this.processVideo();
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Analysis failed: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            clearInterval(this.progressInterval);
            document.getElementById('analyzeBtn').disabled = false;
        }
    }

    async processVideo() {
        if (!this.video) {
            throw new Error('Video not loaded');
        }

        // Create video element for processing
        const video = document.createElement('video');
        video.src = URL.createObjectURL(this.videoFile);
        video.muted = true;
        
        await new Promise((resolve) => {
            video.addEventListener('loadedmetadata', resolve);
        });
        
        // Setup canvas for frame capture
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        
        const duration = video.duration;
        const fps = 30; // We'll process at 30fps estimate
        this.totalFrames = Math.floor(duration * fps);
        
        // Process frames
        let currentTime = 0;
        const timeIncrement = this.samplingRate / fps;
        
        while (currentTime < duration && this.isAnalyzing) {
            video.currentTime = currentTime;
            
            await new Promise((resolve) => {
                video.addEventListener('seeked', () => {
                    // Draw frame to canvas
                    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
                    
                    // Get image data
                    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    
                    // Process frame
                    this.processFrame(imageData, currentTime);
                    
                    // Update progress
                    const progress = (currentTime / duration) * 100;
                    this.updateProgress(progress, Math.floor(currentTime * fps), this.totalFrames);
                    
                    resolve();
                }, { once: true });
            });
            
            currentTime += timeIncrement;
            this.frameCount++;
            
            // Yield to prevent blocking
            if (this.frameCount % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // Cleanup
        URL.revokeObjectURL(video.src);
        video.remove();
    }

    processFrame(imageData, timestamp) {
        try {
            // Convert ImageData to OpenCV Mat
            const src = cv.matFromImageData(imageData);
            
            // Convert to grayscale
            const gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            
            // Create mask (remove electrodes - simplified)
            const mask = new cv.Mat.ones(gray.rows, gray.cols, cv.CV_8UC1);
            
            // Apply thresholding
            const thresh = new cv.Mat();
            cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                                cv.THRESH_BINARY_INV, 15, 3);
            
            // Find contours
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();
            cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, 
                           cv.CHAIN_APPROX_SIMPLE);
            
            // Filter contours by area
            let validContours = 0;
            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);
                if (area > 20 && area < 2000) {
                    validContours++;
                }
            }
            
            // Calculate variance
            const mean = new cv.Mat();
            const stddev = new cv.Mat();
            cv.meanStdDev(gray, mean, stddev, mask);
            const variance = Math.pow(stddev.doubleAt(0), 2);
            
            // Determine phase
            const phaseContour = validContours < this.contourThreshold ? 
                                'ISOTROPIC' : 'CHOLESTERIC';
            const phaseVariance = variance >= this.varianceThreshold ? 
                                 'ISOTROPIC' : 'CHOLESTERIC';
            
            // Store result
            this.results.push({
                frame: this.frameCount,
                time: timestamp / 60, // Convert to minutes
                timestamp_seconds: timestamp,
                contours: validContours,
                variance: variance,
                phase_contour: phaseContour,
                phase_variance: phaseVariance,
                std_dev: stddev.doubleAt(0)
            });
            
            // Cleanup
            src.delete();
            gray.delete();
            mask.delete();
            thresh.delete();
            contours.delete();
            hierarchy.delete();
            mean.delete();
            stddev.delete();
            
        } catch (error) {
            console.error('Error processing frame:', error);
            // Add placeholder data
            this.results.push({
                frame: this.frameCount,
                time: timestamp / 60,
                timestamp_seconds: timestamp,
                contours: 0,
                variance: 0,
                phase_contour: 'UNKNOWN',
                phase_variance: 'UNKNOWN',
                std_dev: 0
            });
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
        
        // Update current phase
        if (this.results.length > 0) {
            const lastResult = this.results[this.results.length - 1];
            currentPhase.textContent = lastResult.phase_contour;
            currentPhase.style.color = lastResult.phase_contour === 'CHOLESTERIC' ? 
                'var(--cholesteric)' : 'var(--isotropic)';
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

    onWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'progress':
                this.updateProgress(data.percent, data.frame, data.totalFrames);
                break;
                
            case 'result':
                this.results.push(data);
                break;
                
            case 'complete':
                this.isAnalyzing = false;
                clearInterval(this.progressInterval);
                document.getElementById('analyzeBtn').disabled = false;
                this.showResults();
                break;
                
            case 'error':
                this.showError(data.message);
                this.isAnalyzing = false;
                clearInterval(this.progressInterval);
                document.getElementById('analyzeBtn').disabled = false;
                break;
        }
    }

    onWorkerError(error) {
        console.error('Worker error:', error);
        this.showError('Worker error: ' + error.message);
        this.isAnalyzing = false;
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
        
        // Calculate durations (assuming last timestamp is video duration)
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
                    tension: 0.4,
                    pointRadius: 0
                }, {
                    label: 'Threshold',
                    data: contours.map(() => this.contourThreshold),
                    borderColor: 'var(--danger)',
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
                        },
                        beginAtZero: true
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
                    tension: 0.4,
                    pointRadius: 0
                }, {
                    label: 'Threshold',
                    data: variances.map(() => this.varianceThreshold),
                    borderColor: 'var(--danger)',
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
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createTimeline() {
        const timeline = document.getElementById('phaseTimeline');
        timeline.innerHTML = '';
        
        if (this.results.length === 0) return;
        
        // Group results into segments
        const segmentCount = 20;
        const segmentSize = Math.ceil(this.results.length / segmentCount);
        
        for (let i = 0; i < segmentCount; i++) {
            const startIdx = i * segmentSize;
            const endIdx = Math.min(startIdx + segmentSize, this.results.length);
            
            if (startIdx >= this.results.length) break;
            
            // Determine dominant phase in this segment
            const segmentResults = this.results.slice(startIdx, endIdx);
            const cholestericCount = segmentResults.filter(r => r.phase_contour === 'CHOLESTERIC').length;
            const isotropicCount = segmentResults.length - cholestericCount;
            const dominantPhase = cholestericCount > isotropicCount ? 'CHOLESTERIC' : 'ISOTROPIC';
            
            const segment = document.createElement('div');
            segment.className = 'timeline-segment';
            
            segment.style.width = `${100 / segmentCount}%`;
            segment.style.height = '100%';
            segment.style.backgroundColor = dominantPhase === 'CHOLESTERIC' ? 
                'var(--cholesteric)' : 'var(--isotropic)';
            segment.style.float = 'left';
            segment.style.borderRight = '1px solid white';
            segment.style.position = 'relative';
            
            // Add tooltip
            const startTime = segmentResults[0].time.toFixed(1);
            const endTime = segmentResults[segmentResults.length - 1].time.toFixed(1);
            segment.title = `${startTime}-${endTime} min: ${dominantPhase}\nCholesteric: ${cholestericCount}, Isotropic: ${isotropicCount}`;
            
            // Add percentage indicator
            const percentage = document.createElement('div');
            percentage.className = 'timeline-percentage';
            percentage.textContent = `${Math.round((dominantPhase === 'CHOLESTERIC' ? cholestericCount : isotropicCount) / segmentResults.length * 100)}%`;
            percentage.style.position = 'absolute';
            percentage.style.top = '50%';
            percentage.style.left = '50%';
            percentage.style.transform = 'translate(-50%, -50%)';
            percentage.style.color = 'white';
            percentage.style.fontSize = '10px';
            percentage.style.fontWeight = 'bold';
            percentage.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            
            segment.appendChild(percentage);
            timeline.appendChild(segment);
        }
    }

    downloadCSV() {
        if (this.results.length === 0) {
            this.showError('No data to download');
            return;
        }
        
        const csv = Papa.unparse(this.results);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `liquid_crystal_analysis_${Date.now()}.csv`);
    }

    downloadPlot() {
        if (this.results.length === 0) {
            this.showError('No data to download');
            return;
        }
        
        // Create a canvas for the combined plot
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Title
        ctx.fillStyle = '#212529';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('Liquid Crystal Phase Analysis Results', 50, 50);
        
        // Metadata
        ctx.font = '16px Arial';
        ctx.fillStyle = '#6c757d';
        ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 50, 90);
        ctx.fillText(`Video: ${this.videoFile ? this.videoFile.name : 'Unknown'}`, 50, 115);
        ctx.fillText(`Total frames analyzed: ${this.results.length}`, 50, 140);
        
        // Statistics
        const stats = this.calculateStatistics();
        ctx.fillStyle = '#212529';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Summary Statistics:', 50, 190);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#4361ee';
        ctx.fillText(`Cholesteric Phase: ${stats.cholestericPercent}% (${stats.cholestericDuration.toFixed(2)} min)`, 70, 225);
        ctx.fillStyle = '#f72585';
        ctx.fillText(`Isotropic Phase: ${stats.isotropicPercent}% (${stats.isotropicDuration.toFixed(2)} min)`, 70, 255);
        
        if (stats.transitionTime) {
            ctx.fillStyle = '#f8961e';
            ctx.fillText(`Phase Transition: ${stats.transitionTime.toFixed(2)} min`, 70, 285);
        }
        
        // Add chart data
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#212529';
        ctx.fillText('Analysis Charts:', 50, 340);
        
        // Draw simple representation of data
        const chartTop = 380;
        const chartHeight = 150;
        const chartWidth = 1100;
        
        // Contour chart representation
        ctx.font = '14px Arial';
        ctx.fillStyle = '#4361ee';
        ctx.fillText('Contour Analysis', 50, chartTop - 10);
        
        ctx.strokeStyle = '#4361ee';
        ctx.beginPath();
        const contourData = this.results.map(r => r.contours);
        const maxContour = Math.max(...contourData);
        
        for (let i = 0; i < contourData.length; i++) {
            const x = 50 + (i / contourData.length) * chartWidth;
            const y = chartTop + chartHeight - (contourData[i] / maxContour) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Variance chart representation
        ctx.fillStyle = '#f72585';
        ctx.fillText('Variance Analysis', 50, chartTop + chartHeight + 40);
        
        ctx.strokeStyle = '#f72585';
        ctx.beginPath();
        const varianceData = this.results.map(r => r.variance);
        const maxVariance = Math.max(...varianceData);
        
        for (let i = 0; i < varianceData.length; i++) {
            const x = 50 + (i / varianceData.length) * chartWidth;
            const y = chartTop + chartHeight * 2 + 40 - (varianceData[i] / maxVariance) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        // Convert to blob and download
        canvas.toBlob(blob => {
            saveAs(blob, `analysis_plot_${Date.now()}.png`);
        }, 'image/png');
    }

    downloadAll() {
        if (this.results.length === 0) {
            this.showError('No data to download');
            return;
        }
        
        const zip = new JSZip();
        
        // Add CSV
        const csv = Papa.unparse(this.results);
        zip.file('analysis_results.csv', csv);
        
        // Add plot image (create canvas as in downloadPlot method)
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        // Draw simple summary
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText('Liquid Crystal Analysis Summary', 50, 50);
        
        // Convert to blob
        canvas.toBlob(blob => {
            zip.file('analysis_summary.png', blob);
            
            // Add parameters file
            const params = {
                timestamp: new Date().toISOString(),
                video_file: this.videoFile ? this.videoFile.name : 'Unknown',
                parameters: {
                    contour_threshold: this.contourThreshold,
                    variance_threshold: this.varianceThreshold,
                    sampling_rate: this.samplingRate
                },
                statistics: this.calculateStatistics()
            };
            
            zip.file('parameters.json', JSON.stringify(params, null, 2));
            
            // Add README
            const readme = `LIQUID CRYSTAL ANALYSIS RESULTS
===============================

Generated on: ${new Date().toLocaleString()}
Video file: ${this.videoFile ? this.videoFile.name : 'Unknown'}
Total samples: ${this.results.length}

Files included:
1. analysis_results.csv - Raw analysis data
2. analysis_summary.png - Summary plot
3. parameters.json - Analysis parameters and statistics

Parameters used:
- Contour threshold: ${this.contourThreshold}
- Variance threshold: ${this.varianceThreshold}
- Sampling rate: ${this.samplingRate}

This analysis was performed using the Liquid Crystal Phase Analyzer web tool.
`;
            
            zip.file('README.txt', readme);
            
            // Generate and download zip
            zip.generateAsync({type: 'blob'}).then(content => {
                saveAs(content, `liquid_crystal_analysis_${Date.now()}.zip`);
            });
        }, 'image/png');
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
        
        // Reset parameters
        this.contourThreshold = 15;
        this.varianceThreshold = 96;
        this.samplingRate = 30;
        this.updateSliderValues();
        
        // Reset slider UI elements
        document.getElementById('contourThreshold').value = 15;
        document.getElementById('varianceThreshold').value = 96;
        document.getElementById('samplingRate').value = 30;
        
        // Reset progress
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressPercent').textContent = '0%';
        document.getElementById('progressText').textContent = 'Initializing...';
        document.getElementById('framesProcessed').textContent = '0';
        document.getElementById('currentPhase').textContent = '-';
        document.getElementById('elapsedTime').textContent = '0s';
    }

    showError(message) {
        alert('Error: ' + message);
    }

    updateSliderValues() {
        document.getElementById('contourValue').textContent = this.contourThreshold;
        document.getElementById('varianceValue').textContent = this.varianceThreshold;
        document.getElementById('samplingValue').textContent = this.samplingRate;
    }
}
