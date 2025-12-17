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
        
        // PARAMETER THRESHOLD (SAMA PERSIS DENGAN PYTHON)
        this.CONTOUR_THRESHOLD = 15;    // Jika < 15 kontur → ISOTROPIC
        this.VARIANCE_THRESHOLD = 96;   // Jika > 96 variance → ISOTROPIC (TERBALIK!)
        
        // Elements cache
        this.elements = {};
        
        // Canvas untuk processing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        console.log('⚙️ KONFIGURASI THRESHOLD (SAMA DENGAN PYTHON):');
        console.log('=' .repeat(60));
        console.log(`   CONTOUR_THRESHOLD = ${this.CONTOUR_THRESHOLD}`);
        console.log(`     → Kontur < ${this.CONTOUR_THRESHOLD} = ISOTROPIC`);
        console.log(`     → Kontur ≥ ${this.CONTOUR_THRESHOLD} = CHOLESTERIC`);
        console.log(`   VARIANCE_THRESHOLD = ${this.VARIANCE_THRESHOLD}`);
        console.log(`     → Variance < ${this.VARIANCE_THRESHOLD} = CHOLESTERIC`);
        console.log(`     → Variance ≥ ${this.VARIANCE_THRESHOLD} = ISOTROPIC`);
        console.log('=' .repeat(60));
    }

    // ... [cacheElements dan setupEventListeners tetap sama] ...

    async startAnalysis() {
        console.log('🚀 Starting REAL analysis with OpenCV...');
        
        if (!this.videoFile || this.isAnalyzing) {
            console.warn('Cannot start analysis: no file or already analyzing');
            return;
        }
        
        // Check if OpenCV is loaded
        if (typeof cv === 'undefined') {
            this.showError('OpenCV.js is not loaded. Please wait or refresh the page.');
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
            // REAL analysis with OpenCV
            await this.analyzeVideoWithOpenCV();
            
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

    async analyzeVideoWithOpenCV() {
        console.log('🎬 Starting OpenCV video analysis...');
        
        // Create video element
        const video = document.createElement('video');
        video.src = URL.createObjectURL(this.videoFile);
        video.muted = true;
        video.playsInline = true;
        
        // Wait for video metadata
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
                console.log('✅ Video metadata loaded');
                resolve();
            };
            video.onerror = reject;
            setTimeout(() => {
                console.log('⚠️ Video load timeout, proceeding anyway');
                resolve();
            }, 3000);
        });
        
        // Setup canvas
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        
        const duration = video.duration;
        const fps = 30; // Default assumption
        this.totalFrames = Math.floor(duration * fps);
        const samplingRate = this.samplingRate || 30;
        
        console.log(`📊 Video Info:`);
        console.log(`   Size: ${video.videoWidth}x${video.videoHeight}`);
        console.log(`   Duration: ${duration.toFixed(2)}s`);
        console.log(`   Estimated FPS: ${fps}`);
        console.log(`   Total frames: ~${this.totalFrames}`);
        console.log(`   Sampling rate: ${samplingRate} (1 frame every ${samplingRate} frames)`);
        
        // Process first frame to create mask
        console.log('🛠️ Creating electrode mask from first frame...');
        video.currentTime = 0;
        
        const mask = await new Promise((resolve) => {
            const onFirstFrame = () => {
                video.removeEventListener('seeked', onFirstFrame);
                
                this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
                const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                
                try {
                    // Create mask from first frame
                    const src = cv.matFromImageData(imageData);
                    const mask = this.createElectrodeMask(src);
                    src.delete();
                    
                    console.log('✅ Electrode mask created successfully');
                    resolve(mask);
                } catch (error) {
                    console.error('❌ Failed to create mask:', error);
                    // Create default mask (all white)
                    const mask = new cv.Mat.ones(this.canvas.height, this.canvas.width, cv.CV_8UC1);
                    cv.multiply(mask, new cv.Scalar(255), mask);
                    resolve(mask);
                }
            };
            
            video.addEventListener('seeked', onFirstFrame);
        });
        
        // Process frames at sampling intervals
        const timeIncrement = samplingRate / fps;
        let currentTime = 0;
        let framesProcessed = 0;
        
        console.log('🔍 Starting frame processing...');
        
        while (currentTime < duration && this.isAnalyzing) {
            // Seek to current time
            video.currentTime = currentTime;
            
            await new Promise((resolve) => {
                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    
                    try {
                        // Draw frame
                        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
                        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                        
                        // Convert to OpenCV Mat
                        const src = cv.matFromImageData(imageData);
                        
                        // Process frame
                        const result = this.processSingleFrame(src, mask, currentTime, framesProcessed);
                        this.results.push(result);
                        
                        // Cleanup
                        src.delete();
                        
                        framesProcessed++;
                        
                    } catch (error) {
                        console.error(`❌ Error processing frame at ${currentTime}s:`, error);
                    }
                    
                    // Update progress
                    const progress = (currentTime / duration) * 100;
                    this.updateProgress(progress, framesProcessed, Math.floor(duration / timeIncrement));
                    
                    resolve();
                };
                
                video.addEventListener('seeked', onSeeked);
            });
            
            currentTime += timeIncrement;
            
            // Yield to UI every 5 frames
            if (framesProcessed % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // Cleanup
        mask.delete();
        URL.revokeObjectURL(video.src);
        
        console.log(`✅ Analysis completed. Processed ${framesProcessed} frames.`);
        console.log(`📈 Results: ${this.results.length} data points`);
    }

    processSingleFrame(frameMat, mask, timestamp, frameIndex) {
        try {
            // ===========================================================
            // 1. APPLY MASK (SAMA DENGAN PYTHON)
            // ===========================================================
            const maskedFrame = this.applyMask(frameMat, mask);
            
            // ===========================================================
            // 2. PREPROCESSING - DETECT AND CLASSIFY (KONTUR)
            // ===========================================================
            const { numContours, phaseContour } = this.detectAndClassifyContours(maskedFrame, mask);
            
            // ===========================================================
            // 3. VARIANCE CALCULATION (SAMA DENGAN PYTHON)
            // ===========================================================
            const { variance, stdDev } = this.calculateVariance(maskedFrame, mask);
            
            // ===========================================================
            // 4. CLASSIFY BY VARIANCE (TERBALIK - SAMA DENGAN PYTHON)
            // ===========================================================
            const phaseVariance = variance >= this.VARIANCE_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
            
            // Cleanup
            maskedFrame.delete();
            
            return {
                frame_number: frameIndex,
                timestamp_seconds: timestamp,
                timestamp_minutes: timestamp / 60,
                num_contours: numContours,
                phase_contour: phaseContour,
                variance: parseFloat(variance.toFixed(2)),
                std_dev: parseFloat(stdDev.toFixed(2)),
                phase_variance: phaseVariance
            };
            
        } catch (error) {
            console.error('Error in processSingleFrame:', error);
            
            return {
                frame_number: frameIndex,
                timestamp_seconds: timestamp,
                timestamp_minutes: timestamp / 60,
                num_contours: 0,
                phase_contour: "ERROR",
                variance: 0,
                std_dev: 0,
                phase_variance: "ERROR"
            };
        }
    }

    // ===========================================================
    // CREATE ELECTRODE MASK (SAMA PERSIS DENGAN PYTHON)
    // ===========================================================
    createElectrodeMask(frame) {
        try {
            const h = frame.rows;
            const w = frame.cols;
            
            // Create white mask (255)
            const mask = new cv.Mat(h, w, cv.CV_8UC1);
            mask.setTo(new cv.Scalar(255));
            
            // Convert to grayscale
            const gray = new cv.Mat();
            cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
            
            // Threshold for bright areas (electrodes)
            const brightMask = new cv.Mat();
            cv.threshold(gray, brightMask, 200, 255, cv.THRESH_BINARY);
            
            // Morphological closing
            const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 15));
            cv.morphologyEx(brightMask, brightMask, cv.MORPH_CLOSE, kernel);
            
            // Find contours
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();
            cv.findContours(brightMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            // Draw black rectangles for electrodes
            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);
                
                if (area > 5000) {
                    const rect = cv.boundingRect(contour);
                    const padding = 10;
                    
                    const xStart = Math.max(0, rect.x - padding);
                    const yStart = Math.max(0, rect.y - padding);
                    const xEnd = Math.min(w, rect.x + rect.width + padding);
                    const yEnd = Math.min(h, rect.y + rect.height + padding);
                    
                    // Create rectangle ROI and set to black (0)
                    const rectMask = new cv.Mat(mask, new cv.Rect(xStart, yStart, xEnd - xStart, yEnd - yStart));
                    rectMask.setTo(new cv.Scalar(0));
                    rectMask.delete();
                }
            }
            
            // Cleanup
            gray.delete();
            brightMask.delete();
            kernel.delete();
            contours.delete();
            hierarchy.delete();
            
            return mask;
            
        } catch (error) {
            console.error('Error in createElectrodeMask:', error);
            // Return default mask (all white)
            const mask = new cv.Mat.ones(frame.rows, frame.cols, cv.CV_8UC1);
            cv.multiply(mask, new cv.Scalar(255), mask);
            return mask;
        }
    }

    // ===========================================================
    // APPLY MASK (SAMA PERSIS DENGAN PYTHON)
    // ===========================================================
    applyMask(frame, mask) {
        const h = frame.rows;
        const w = frame.cols;
        
        // Create white background
        const result = new cv.Mat(h, w, cv.CV_8UC4);
        result.setTo(new cv.Scalar(255, 255, 255, 255));
        
        // Convert mask to 4 channels
        const mask4ch = new cv.Mat();
        const channels = new cv.MatVector();
        for (let i = 0; i < 4; i++) {
            channels.push_back(mask);
        }
        cv.merge(channels, mask4ch);
        
        // Copy frame pixels where mask is white
        frame.copyTo(result, mask);
        
        // Cleanup
        mask4ch.delete();
        channels.delete();
        
        return result;
    }

    // ===========================================================
    // DETECT AND CLASSIFY - KONTUR (SAMA PERSIS DENGAN PYTHON)
    // ===========================================================
    detectAndClassifyContours(maskedFrame, mask) {
        try {
            // Convert to grayscale
            const gray = new cv.Mat();
            cv.cvtColor(maskedFrame, gray, cv.COLOR_RGBA2GRAY);
            
            // Apply mask
            const grayMasked = new cv.Mat();
            cv.bitwise_and(gray, gray, grayMasked, mask);
            
            // Set masked areas to white
            for (let i = 0; i < mask.rows; i++) {
                for (let j = 0; j < mask.cols; j++) {
                    if (mask.data[i * mask.cols + j] === 0) {
                        grayMasked.data[i * grayMasked.cols + j] = 255;
                    }
                }
            }
            
            // Gaussian blur
            const blurred = new cv.Mat();
            cv.GaussianBlur(grayMasked, blurred, new cv.Size(3, 3), 0);
            
            // Adaptive threshold
            const thresh = new cv.Mat();
            cv.adaptiveThreshold(blurred, thresh, 255, 
                cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 3);
            
            // Morphological operations
            const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
            
            // Opening
            const opened = new cv.Mat();
            cv.morphologyEx(thresh, opened, cv.MORPH_OPEN, kernel);
            
            // Closing (2 iterations)
            const closed = new cv.Mat();
            cv.morphologyEx(opened, closed, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 2);
            
            // Apply mask again
            cv.bitwise_and(closed, closed, closed, mask);
            
            // Find contours
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();
            cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            // Filter contours by area
            let validContours = 0;
            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);
                
                if (area > 20 && area < 2000) {
                    validContours++;
                }
            }
            
            // Classify based on threshold (SAMA DENGAN PYTHON)
            const phase = validContours < this.CONTOUR_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
            
            // Cleanup
            gray.delete();
            grayMasked.delete();
            blurred.delete();
            thresh.delete();
            kernel.delete();
            opened.delete();
            closed.delete();
            contours.delete();
            hierarchy.delete();
            
            return {
                numContours: validContours,
                phaseContour: phase
            };
            
        } catch (error) {
            console.error('Error in detectAndClassifyContours:', error);
            return {
                numContours: 0,
                phaseContour: "ERROR"
            };
        }
    }

    // ===========================================================
    // CALCULATE VARIANCE (SAMA PERSIS DENGAN PYTHON)
    // ===========================================================
    calculateVariance(frame, mask) {
        try {
            // Convert to grayscale
            const gray = new cv.Mat();
            cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
            
            // Get LC pixels (where mask > 0)
            const lcPixels = [];
            const maskData = mask.data;
            const grayData = gray.data;
            
            for (let i = 0; i < mask.rows; i++) {
                for (let j = 0; j < mask.cols; j++) {
                    const idx = i * mask.cols + j;
                    if (maskData[idx] > 0) { // Mask is white
                        lcPixels.push(grayData[idx]);
                    }
                }
            }
            
            // Calculate variance and std dev
            let variance = 0;
            let stdDev = 0;
            
            if (lcPixels.length > 0) {
                // Calculate mean
                const sum = lcPixels.reduce((a, b) => a + b, 0);
                const mean = sum / lcPixels.length;
                
                // Calculate variance
                let sumSquaredDiff = 0;
                for (const pixel of lcPixels) {
                    sumSquaredDiff += Math.pow(pixel - mean, 2);
                }
                variance = sumSquaredDiff / lcPixels.length;
                stdDev = Math.sqrt(variance);
            }
            
            // Cleanup
            gray.delete();
            
            return {
                variance: variance,
                stdDev: stdDev
            };
            
        } catch (error) {
            console.error('Error in calculateVariance:', error);
            return {
                variance: 0,
                stdDev: 0
            };
        }
    }

    // ... [sisanya: showResults, createCharts, dll tetap sama] ...
}
