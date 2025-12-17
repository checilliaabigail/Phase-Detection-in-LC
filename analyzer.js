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
        
        // PARAMETER THRESHOLD (SAMA DENGAN PYTHON)
        this.CONTOUR_THRESHOLD = 15;    // Jika < 15 kontur → ISOTROPIC
        this.VARIANCE_THRESHOLD = 96;   // Jika > 96 variance → ISOTROPIC
        
        // Elements cache
        this.elements = {};
        
        // Canvas untuk processing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        // OpenCV status
        this.opencvReady = false;
        
        console.log('Threshold Configuration:');
        console.log(`  CONTOUR_THRESHOLD = ${this.CONTOUR_THRESHOLD}`);
        console.log(`    → Kontur < ${this.CONTOUR_THRESHOLD} = ISOTROPIC`);
        console.log(`    → Kontur ≥ ${this.CONTOUR_THRESHOLD} = CHOLESTERIC`);
        console.log(`  VARIANCE_THRESHOLD = ${this.VARIANCE_THRESHOLD}`);
        console.log(`    → Variance < ${this.VARIANCE_THRESHOLD} = CHOLESTERIC`);
        console.log(`    → Variance ≥ ${this.VARIANCE_THRESHOLD} = ISOTROPIC`);
    }

    init() {
        console.log('Initializing VideoAnalyzer...');
        
        // Cache elements
        this.cacheElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update slider values
        this.updateSliderValues();
        
        console.log('VideoAnalyzer initialized successfully');
    }

    // ... [cacheElements dan setupEventListeners sama seperti sebelumnya] ...

    async startAnalysis() {
        console.log('Starting REAL analysis...');
        
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

    async analyzeVideoWithOpenCV() {
        console.log('Starting OpenCV analysis...');
        
        if (!this.video) {
            this.video = document.createElement('video');
            this.video.src = URL.createObjectURL(this.videoFile);
            this.video.muted = true;
            this.video.playsInline = true;
        }
        
        // Wait for video to load
        await new Promise((resolve, reject) => {
            this.video.onloadedmetadata = resolve;
            this.video.onerror = reject;
            setTimeout(resolve, 1000); // Fallback timeout
        });
        
        // Set canvas size to video size
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        const fps = 30; // Assuming 30 FPS
        const duration = this.video.duration;
        this.totalFrames = Math.floor(duration * fps);
        
        console.log(`Video info: ${this.video.videoWidth}x${this.video.videoHeight}, Duration: ${duration}s, Estimated frames: ${this.totalFrames}`);
        
        // Create electrode mask (once, from first frame)
        let mask = null;
        
        // Process frames with sampling
        const samplingRate = this.samplingRate || 30;
        const timeIncrement = samplingRate / fps;
        
        let currentTime = 0;
        let frameIndex = 0;
        
        while (currentTime < duration && this.isAnalyzing) {
            // Seek to current time
            this.video.currentTime = currentTime;
            
            await new Promise((resolve) => {
                const onSeeked = () => {
                    this.video.removeEventListener('seeked', onSeeked);
                    
                    // Draw frame to canvas
                    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                    
                    // Get image data
                    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    
                    // Process the frame
                    try {
                        const result = this.processFrameWithOpenCV(imageData, currentTime, frameIndex, mask);
                        this.results.push(result);
                        
                        // Update mask from first frame
                        if (mask === null && result.mask) {
                            mask = result.mask;
                        }
                        
                    } catch (error) {
                        console.error('Error processing frame:', error);
                    }
                    
                    // Update progress
                    const progress = (currentTime / duration) * 100;
                    this.updateProgress(progress, frameIndex, this.totalFrames);
                    
                    frameIndex++;
                    resolve();
                };
                
                this.video.addEventListener('seeked', onSeeked);
            });
            
            currentTime += timeIncrement;
            
            // Yield to prevent blocking
            if (frameIndex % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        console.log(`Analysis completed. Processed ${this.results.length} frames.`);
    }

    processFrameWithOpenCV(imageData, timestamp, frameIndex, existingMask = null) {
        try {
            // Convert ImageData to OpenCV Mat
            const src = cv.matFromImageData(imageData);
            
            // ===========================================================
            // CREATE ELECTRODE MASK (SAMA DENGAN PYTHON)
            // ===========================================================
            let mask;
            if (existingMask) {
                mask = existingMask.clone();
            } else {
                mask = this.createElectrodeMask(src);
            }
            
            // ===========================================================
            // APPLY MASK (SAMA DENGAN PYTHON)
            // ===========================================================
            const maskedFrame = this.applyMask(src, mask);
            
            // ===========================================================
            // DETECT AND CLASSIFY (SAMA DENGAN PYTHON)
            // ===========================================================
            const processed = this.preprocessImproved(maskedFrame, mask);
            const { numContours, phaseContour } = this.detectAndClassify(processed, mask);
            
            // ===========================================================
            // VARIANCE-BASED DETECTION (SAMA DENGAN PYTHON)
            // ===========================================================
            const { variance, stdDev } = this.calculateVariance(maskedFrame, mask);
            
            // PERBAIKAN: Klasifikasi berdasarkan variance (TERBALIK!)
            const phaseVariance = variance >= this.VARIANCE_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
            
            // Cleanup OpenCV mats
            src.delete();
            if (processed) processed.delete();
            
            return {
                frame_number: frameIndex,
                timestamp_seconds: timestamp,
                timestamp_minutes: timestamp / 60,
                num_contours: numContours,
                phase_contour: phaseContour,
                variance: variance,
                std_dev: stdDev,
                phase_variance: phaseVariance,
                mask: mask
            };
            
        } catch (error) {
            console.error('OpenCV processing error:', error);
            
            // Return fallback data
            return {
                frame_number: frameIndex,
                timestamp_seconds: timestamp,
                timestamp_minutes: timestamp / 60,
                num_contours: 0,
                phase_contour: 'ERROR',
                variance: 0,
                std_dev: 0,
                phase_variance: 'ERROR'
            };
        }
    }

    // ===========================================================
    // 1️⃣ CREATE ELECTRODE MASK (SAMA DENGAN PYTHON)
    // ===========================================================
    createElectrodeMask(frame) {
        const h = frame.rows;
        const w = frame.cols;
        
        // Create white mask
        const mask = new cv.Mat.ones(h, w, cv.CV_8UC1);
        cv.multiply(mask, new cv.Scalar(255), mask);
        
        // Convert to grayscale
        const gray = new cv.Mat();
        cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
        
        // Threshold for bright areas (electrodes)
        const brightMask = new cv.Mat();
        cv.threshold(gray, brightMask, 200, 255, cv.THRESH_BINARY);
        
        // Morphological operations
        const kernel = cv.Mat.ones(15, 15, cv.CV_8U);
        cv.morphologyEx(brightMask, brightMask, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 3);
        
        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(brightMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        // Draw black rectangles on mask for electrode areas
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
                
                // Draw black rectangle on mask
                const roi = mask.roi(new cv.Rect(xStart, yStart, xEnd - xStart, yEnd - yStart));
                roi.setTo(new cv.Scalar(0));
                roi.delete();
            }
        }
        
        // Cleanup
        gray.delete();
        brightMask.delete();
        kernel.delete();
        contours.delete();
        hierarchy.delete();
        
        return mask;
    }

    // ===========================================================
    // 2️⃣ APPLY MASK (SAMA DENGAN PYTHON)
    // ===========================================================
    applyMask(frame, mask) {
        const result = new cv.Mat(frame.rows, frame.cols, frame.type());
        
        // Create white background
        result.setTo(new cv.Scalar(255, 255, 255, 255));
        
        // Apply mask: where mask > 0, copy from frame
        const mask3ch = new cv.Mat();
        const channels = new cv.MatVector();
        channels.push_back(mask);
        channels.push_back(mask);
        channels.push_back(mask);
        cv.merge(channels, mask3ch);
        
        frame.copyTo(result, mask);
        
        // Cleanup
        mask3ch.delete();
        channels.delete();
        
        return result;
    }

    // ===========================================================
    // 3️⃣ IMPROVED PREPROCESSING (SAMA DENGAN PYTHON)
    // ===========================================================
    preprocessImproved(frame, mask) {
        // Convert to grayscale
        const gray = new cv.Mat();
        cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
        
        // Apply mask
        const grayMasked = new cv.Mat();
        cv.bitwise_and(gray, gray, grayMasked, mask);
        
        // Set masked areas to white
        for (let i = 0; i < grayMasked.rows; i++) {
            for (let j = 0; j < grayMasked.cols; j++) {
                if (mask.ucharPtr(i, j)[0] === 0) {
                    grayMasked.ucharPtr(i, j)[0] = 255;
                }
            }
        }
        
        // Gaussian Blur
        const blurred = new cv.Mat();
        cv.GaussianBlur(grayMasked, blurred, new cv.Size(3, 3), 0);
        
        // CLAHE untuk kontras lokal
        const clahe = new cv.CLAHE();
        clahe.clipLimit = 3.0;
        clahe.tilesGridSize = new cv.Size(8, 8);
        
        const enhanced = new cv.Mat();
        clahe.apply(blurred, enhanced);
        
        // Adaptive Threshold
        const thresh = new cv.Mat();
        cv.adaptiveThreshold(enhanced, thresh, 255, 
            cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 3);
        
        // Morphological operations
        const kernelSmall = cv.Mat.ones(2, 2, cv.CV_8U);
        cv.morphologyEx(thresh, thresh, cv.MORPH_OPEN, kernelSmall);
        
        const kernelSmall2 = cv.Mat.ones(2, 2, cv.CV_8U);
        cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernelSmall2, new cv.Point(-1, -1), 2);
        
        // Apply mask
        cv.bitwise_and(thresh, thresh, thresh, mask);
        
        // Cleanup
        gray.delete();
        grayMasked.delete();
        blurred.delete();
        enhanced.delete();
        kernelSmall.delete();
        kernelSmall2.delete();
        
        return thresh;
    }

    // ===========================================================
    // 4️⃣ DETECT AND CLASSIFY (SAMA DENGAN PYTHON)
    // ===========================================================
    detectAndClassify(thresholded, mask) {
        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        // Filter contours
        let validContours = 0;
        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            
            if (area > 20 && area < 2000) {
                validContours++;
            }
        }
        
        // Klasifikasi dengan threshold (SAMA DENGAN PYTHON)
        const phase = validContours < this.CONTOUR_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
        
        // Cleanup
        contours.delete();
        hierarchy.delete();
        
        return {
            numContours: validContours,
            phaseContour: phase
        };
    }

    // ===========================================================
    // 5️⃣ CALCULATE VARIANCE (SAMA DENGAN PYTHON)
    // ===========================================================
    calculateVariance(frame, mask) {
        // Convert to grayscale
        const gray = new cv.Mat();
        cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);
        
        // Apply mask
        const grayMasked = new cv.Mat();
        cv.bitwise_and(gray, gray, grayMasked, mask);
        
        // Collect non-zero pixels (LC pixels)
        const lcPixels = [];
        for (let i = 0; i < grayMasked.rows; i++) {
            for (let j = 0; j < grayMasked.cols; j++) {
                if (mask.ucharPtr(i, j)[0] > 0) {
                    lcPixels.push(grayMasked.ucharPtr(i, j)[0]);
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
            const squaredDiffs = lcPixels.map(pixel => Math.pow(pixel - mean, 2));
            const sumSquaredDiffs = squaredDiffs.reduce((a, b) => a + b, 0);
            variance = sumSquaredDiffs / lcPixels.length;
            stdDev = Math.sqrt(variance);
        }
        
        // Cleanup
        gray.delete();
        grayMasked.delete();
        
        return {
            variance: variance,
            stdDev: stdDev
        };
    }

    // ... [sisanya sama seperti sebelumnya: updateProgress, showResults, dll] ...
}
