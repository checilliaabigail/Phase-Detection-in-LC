class VideoAnalyzer {
    constructor() {
        // ... constructor sama ...
        
        // DEBUG MODE - bandingkan dengan Python
        this.debugMode = true;
        this.debugData = [];
    }

    async analyzeVideoWithOpenCV() {
        if (this.debugMode) {
            console.log('🐍 DEBUG MODE: Comparing with Python results');
        }
        
        // ... kode sebelumnya ...
        
        while (currentTime < duration && this.isAnalyzing) {
            // ... processing ...
            
            const result = this.processSingleFrame(src, mask, currentTime, framesProcessed);
            
            // DEBUG: Simpan data untuk komparasi
            if (this.debugMode) {
                this.debugData.push({
                    frame: framesProcessed,
                    time: currentTime,
                    contours: result.num_contours,
                    variance: result.variance,
                    phase_contour: result.phase_contour,
                    phase_variance: result.phase_variance
                });
                
                // Log setiap 10 frame
                if (framesProcessed % 10 === 0) {
                    console.log(`🐍 Frame ${framesProcessed}:`);
                    console.log(`   Time: ${currentTime.toFixed(2)}s`);
                    console.log(`   Contours: ${result.num_contours} -> ${result.phase_contour}`);
                    console.log(`   Variance: ${result.variance.toFixed(2)} -> ${result.phase_variance}`);
                }
            }
            
            // ... lanjut ...
        }
        
        // DEBUG: Export data untuk komparasi dengan Python
        if (this.debugMode) {
            this.exportDebugData();
        }
    }

    processSingleFrame(frameMat, mask, timestamp, frameIndex) {
        try {
            // ===================================================
            // STEP 1: KONVERSI COLOR SPACE (SAMA DENGAN PYTHON)
            // ===================================================
            // Canvas memberikan RGBA, Python BGR, konversi ke BGR dulu
            const bgr = new cv.Mat();
            cv.cvtColor(frameMat, bgr, cv.COLOR_RGBA2BGR);
            
            // ===================================================
            // STEP 2: CREATE ELECTRODE MASK (DARI BGR)
            // ===================================================
            const maskFromBgr = this.createElectrodeMask(bgr);
            
            // ===================================================
            // STEP 3: APPLY MASK (SAMA DENGAN PYTHON)
            // ===================================================
            const maskedFrame = this.applyMask(bgr, maskFromBgr);
            
            // ===================================================
            // STEP 4: PREPROCESSING IMPROVED (SAMA PERSIS)
            // ===================================================
            const processed = this.preprocessImproved(maskedFrame, maskFromBgr);
            
            // ===================================================
            // STEP 5: DETECT CONTOURS (DENGAN PARAMETER SAMA)
            // ===================================================
            const contoursResult = this.detectContoursExact(processed, maskFromBgr);
            
            // ===================================================
            // STEP 6: CALCULATE VARIANCE (DARI GRAYSCALE)
            // ===================================================
            const gray = new cv.Mat();
            cv.cvtColor(maskedFrame, gray, cv.COLOR_BGR2GRAY);
            const varianceResult = this.calculateVarianceExact(gray, maskFromBgr);
            
            // ===================================================
            // STEP 7: CLASSIFICATION (THRESHOLD SAMA)
            // ===================================================
            const phaseContour = contoursResult.numContours < this.CONTOUR_THRESHOLD 
                ? "ISOTROPIC" : "CHOLESTERIC";
            
            const phaseVariance = varianceResult.variance >= this.VARIANCE_THRESHOLD 
                ? "ISOTROPIC" : "CHOLESTERIC";
            
            // Cleanup
            bgr.delete();
            maskFromBgr.delete();
            maskedFrame.delete();
            processed.delete();
            gray.delete();
            
            return {
                frame_number: frameIndex,
                timestamp_seconds: timestamp,
                timestamp_minutes: timestamp / 60,
                num_contours: contoursResult.numContours,
                phase_contour: phaseContour,
                variance: parseFloat(varianceResult.variance.toFixed(2)),
                std_dev: parseFloat(varianceResult.stdDev.toFixed(2)),
                phase_variance: phaseVariance
            };
            
        } catch (error) {
            console.error('Error:', error);
            return this.getErrorResult(timestamp, frameIndex);
        }
    }

    createElectrodeMask(frame) {
        // SAMA PERSIS DENGAN PYTHON
        const h = frame.rows;
        const w = frame.cols;
        
        // 1. White mask
        const mask = new cv.Mat.ones(h, w, cv.CV_8UC1);
        cv.multiply(mask, new cv.Scalar(255), mask);
        
        // 2. Convert to grayscale (BGR2GRAY, bukan RGBA2GRAY)
        const gray = new cv.Mat();
        cv.cvtColor(frame, gray, cv.COLOR_BGR2GRAY);
        
        // 3. Threshold bright areas
        const brightMask = new cv.Mat();
        cv.threshold(gray, brightMask, 200, 255, cv.THRESH_BINARY);
        
        // 4. Morphological closing (15x15, 3 iterations)
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 15));
        const closed = new cv.Mat();
        cv.morphologyEx(brightMask, closed, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 3);
        
        // 5. Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        // 6. Draw black rectangles
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
                
                const roi = mask.roi(new cv.Rect(xStart, yStart, xEnd - xStart, yEnd - yStart));
                roi.setTo(new cv.Scalar(0));
                roi.delete();
            }
        }
        
        // Cleanup
        gray.delete();
        brightMask.delete();
        closed.delete();
        kernel.delete();
        contours.delete();
        hierarchy.delete();
        
        return mask;
    }

    preprocessImproved(frame, mask) {
        // SAMA PERSIS DENGAN PYTHON
        // 1. Convert to grayscale
        const gray = new cv.Mat();
        cv.cvtColor(frame, gray, cv.COLOR_BGR2GRAY);
        
        // 2. Apply mask
        const grayMasked = new cv.Mat();
        cv.bitwise_and(gray, gray, grayMasked, mask);
        
        // 3. Set masked areas to white
        for (let i = 0; i < mask.rows; i++) {
            for (let j = 0; j < mask.cols; j++) {
                if (mask.ucharPtr(i, j)[0] === 0) {
                    grayMasked.ucharPtr(i, j)[0] = 255;
                }
            }
        }
        
        // 4. Gaussian blur (3x3)
        const blurred = new cv.Mat();
        cv.GaussianBlur(grayMasked, blurred, new cv.Size(3, 3), 0);
        
        // 5. CLAHE - OpenCV.js tidak punya CLAHE, gunakan equalizeHist
        const clahe = new cv.Mat();
        cv.equalizeHist(blurred, clahe);
        
        // 6. Denoising (fastNlMeansDenoising)
        const denoised = new cv.Mat();
        cv.fastNlMeansDenoising(clahe, denoised, 7);
        
        // 7. Adaptive threshold (PARAMETER SAMA: 15, 3)
        const thresh = new cv.Mat();
        cv.adaptiveThreshold(
            denoised, 
            thresh, 
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY_INV,
            15,  // blockSize
            3    // C
        );
        
        // 8. Morphological operations (SAMA: kernel 2x2)
        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
        
        // Opening (1 iteration)
        cv.morphologyEx(thresh, thresh, cv.MORPH_OPEN, kernel);
        
        // Closing (2 iterations)
        cv.morphologyEx(thresh, thresh, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 2);
        
        // 9. Apply mask
        cv.bitwise_and(thresh, thresh, thresh, mask);
        
        // Cleanup
        gray.delete();
        grayMasked.delete();
        blurred.delete();
        clahe.delete();
        denoised.delete();
        kernel.delete();
        
        return thresh;
    }

    detectContoursExact(thresh, mask) {
        // SAMA PERSIS DENGAN PYTHON
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        let validContours = 0;
        const contourAreas = [];
        
        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            contourAreas.push(area);
            
            // FILTER SAMA: 20 < area < 2000
            if (area > 20 && area < 2000) {
                validContours++;
            }
        }
        
        if (this.debugMode && contours.size() > 0) {
            console.log(`   Found ${contours.size()} contours, areas:`, 
                contourAreas.slice(0, 5).map(a => a.toFixed(0)));
            console.log(`   Valid contours (20-2000): ${validContours}`);
        }
        
        contours.delete();
        hierarchy.delete();
        
        return {
            numContours: validContours,
            totalContours: contours.size()
        };
    }

    calculateVarianceExact(gray, mask) {
        // SAMA PERSIS DENGAN PYTHON
        const lcPixels = [];
        const maskData = mask.data;
        const grayData = gray.data;
        const totalPixels = mask.rows * mask.cols;
        
        // Collect LC pixels (mask > 0)
        for (let i = 0; i < totalPixels; i++) {
            if (maskData[i] > 0) {
                lcPixels.push(grayData[i]);
            }
        }
        
        if (lcPixels.length === 0) {
            return { variance: 0, stdDev: 0 };
        }
        
        // Calculate mean
        let sum = 0;
        for (const pixel of lcPixels) {
            sum += pixel;
        }
        const mean = sum / lcPixels.length;
        
        // Calculate variance
        let sumSquaredDiff = 0;
        for (const pixel of lcPixels) {
            sumSquaredDiff += Math.pow(pixel - mean, 2);
        }
        const variance = sumSquaredDiff / lcPixels.length;
        const stdDev = Math.sqrt(variance);
        
        if (this.debugMode) {
            console.log(`   LC pixels: ${lcPixels.length}/${totalPixels}`);
            console.log(`   Mean: ${mean.toFixed(2)}, Variance: ${variance.toFixed(2)}`);
        }
        
        return {
            variance: variance,
            stdDev: stdDev,
            mean: mean,
            pixelCount: lcPixels.length
        };
    }

    exportDebugData() {
        // Export untuk komparasi dengan Python
        const csvContent = [
            'frame,timestamp_minutes,num_contours,variance,phase_contour,phase_variance',
            ...this.debugData.map(d => 
                `${d.frame},${(d.time/60).toFixed(4)},${d.contours},${d.variance.toFixed(4)},${d.phase_contour},${d.phase_variance}`
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'javascript_results.csv';
        a.click();
        
        console.log('📊 Debug data exported for comparison with Python');
    }

    getErrorResult(timestamp, frameIndex) {
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
