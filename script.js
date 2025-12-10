// script.js - Liquid Crystal Phase Detection (Updated Version)

let video = document.getElementById("video");
let processBtn = document.getElementById("processBtn");
let canvas = document.getElementById("canvas");
let resultsDiv = document.getElementById("results");
let previewDiv = document.getElementById("preview");
let exportData = [];

// Phase colors for visualization
const phaseColors = {
    'ISOTROPIC': '#2196F3',
    'CHOLESTERIC': '#F44336'
};

// Initialize OpenCV
cv['onRuntimeInitialized'] = () => {
    console.log("OpenCV.js loaded successfully");
    document.getElementById("status").innerHTML = "✅ OpenCV.js ready";
    processBtn.disabled = false;
};

// File selection
document.getElementById("videoFile").addEventListener("change", (e) => {
    let file = e.target.files[0];
    if (file) {
        video.src = URL.createObjectURL(file);
        document.getElementById("status").innerHTML = "📁 Video loaded. Ready to process.";
    }
});

// Process button click
processBtn.addEventListener("click", async () => {
    if (!video.src) {
        alert("Please select a video file first!");
        return;
    }
    
    try {
        await processVideo();
    } catch (error) {
        console.error("Processing error:", error);
        document.getElementById("status").innerHTML = "❌ Error: " + error.message;
    }
});

// Main processing function
async function processVideo() {
    document.getElementById("status").innerHTML = "⏳ Processing...";
    
    // Reset data
    exportData = [];
    previewDiv.innerHTML = "";
    
    // Set canvas size (adjust as needed)
    canvas.width = 800;
    canvas.height = 600;
    
    // Play video briefly to load it
    await video.play();
    video.pause();
    
    // Get video properties
    const videoDuration = video.duration;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    console.log(`Video: ${videoWidth}x${videoHeight}, Duration: ${videoDuration}s`);
    
    // Process specific frames (like in Python code)
    const framesToProcess = [
        { name: "ISOTROPIC", time: 320.3 },   // Example: Frame at 320.3s
        { name: "CHOLESTERIC", time: 7.6 }     // Example: Frame at 7.6s
    ];
    
    for (let frameInfo of framesToProcess) {
        if (frameInfo.time > videoDuration) {
            console.warn(`Time ${frameInfo.time}s exceeds video duration`);
            continue;
        }
        
        // Seek to specific time
        video.currentTime = frameInfo.time;
        await waitForSeek();
        
        // Draw frame on canvas
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Process the frame
        const result = await processSingleFrame(canvas, frameInfo.name, frameInfo.time);
        exportData.push(result);
        
        // Display results
        displayFrameResult(result);
    }
    
    // Show results
    resultsDiv.style.display = "block";
    document.getElementById("status").innerHTML = "✅ Analysis complete!";
    
    // Generate summary
    generateSummary();
}

// Wait for video seek to complete
function waitForSeek() {
    return new Promise(resolve => {
        video.onseeked = () => {
            video.onseeked = null;
            setTimeout(resolve, 100);
        };
    });
}

// Process a single frame (simplified version of Python code)
async function processSingleFrame(canvasElement, frameName, timestamp) {
    // Read image from canvas
    let src = cv.imread(canvasElement);
    
    // Convert to grayscale
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // 1. Create electrode mask (simplified version)
    let mask = createElectrodeMask(gray);
    
    // 2. Apply mask to frame
    let maskedFrame = applyMask(src, mask);
    
    // 3. Preprocessing (simplified)
    let processed = preprocessImage(maskedFrame, mask);
    
    // 4. Thresholding
    let thresh = new cv.Mat();
    cv.adaptiveThreshold(processed, thresh, 255, 
                         cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                         cv.THRESH_BINARY_INV, 11, 2);
    
    // Apply mask to threshold
    let threshMasked = new cv.Mat();
    cv.bitwise_and(thresh, mask, threshMasked);
    
    // 5. Find contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(threshMasked, contours, hierarchy, 
                    cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    // 6. Filter valid contours (simplified parameters)
    let validContours = 0;
    for (let i = 0; i < contours.size(); i++) {
        let c = contours.get(i);
        let area = cv.contourArea(c);
        
        // Filter by size
        if (area < 50 || area > 1000) continue;
        
        let peri = cv.arcLength(c, true);
        if (peri === 0) continue;
        
        // Filter by circularity
        let circ = 4 * Math.PI * area / (peri * peri);
        if (circ > 0.3 && circ < 1.0) {
            validContours++;
        }
    }
    
    // 7. Simple classification
    let phase = classifyPhase(validContours);
    
    // Create result object
    const result = {
        name: frameName,
        timestamp: timestamp,
        validContours: validContours,
        phase: phase,
        src: src,
        masked: maskedFrame,
        processed: processed,
        thresh: threshMasked,
        contours: contours
    };
    
    // Cleanup (keep needed mats)
    gray.delete();
    mask.delete();
    thresh.delete();
    
    return result;
}

// Simplified electrode mask creation
function createElectrodeMask(grayMat) {
    let mask = new cv.Mat.ones(grayMat.rows, grayMat.cols, cv.CV_8U);
    cv.multiply(mask, new cv.Scalar(255), mask);
    
    // Simple threshold for bright areas (electrodes)
    let brightMask = new cv.Mat();
    cv.threshold(grayMat, brightMask, 200, 255, cv.THRESH_BINARY);
    
    // Invert and apply to mask
    cv.bitwise_not(brightMask, brightMask);
    cv.bitwise_and(mask, brightMask, mask);
    
    brightMask.delete();
    return mask;
}

// Apply mask to frame
function applyMask(srcMat, maskMat) {
    let dst = new cv.Mat();
    cv.bitwise_and(srcMat, srcMat, dst, maskMat);
    return dst;
}

// Simplified preprocessing
function preprocessImage(srcMat, maskMat) {
    // Convert to grayscale if needed
    let gray = new cv.Mat();
    if (srcMat.type() === cv.CV_8UC4) {
        cv.cvtColor(srcMat, gray, cv.COLOR_RGBA2GRAY);
    } else if (srcMat.type() === cv.CV_8UC3) {
        cv.cvtColor(srcMat, gray, cv.COLOR_RGB2GRAY);
    } else {
        srcMat.copyTo(gray);
    }
    
    // Apply mask
    let masked = new cv.Mat();
    cv.bitwise_and(gray, gray, masked, maskMat);
    
    // Gaussian blur
    let blurred = new cv.Mat();
    cv.GaussianBlur(masked, blurred, new cv.Size(5, 5), 0);
    
    // Histogram equalization
    let equalized = new cv.Mat();
    cv.equalizeHist(blurred, equalized);
    
    // Cleanup
    gray.delete();
    masked.delete();
    blurred.delete();
    
    return equalized;
}

// Simple classification based on contours
function classifyPhase(contourCount) {
    if (contourCount === 0) {
        return "ISOTROPIC";
    } else {
        return "CHOLESTERIC";
    }
}

// Display frame results
function displayFrameResult(result) {
    const frameDiv = document.createElement("div");
    frameDiv.className = "frame-result";
    frameDiv.style.border = `3px solid ${phaseColors[result.phase]}`;
    frameDiv.style.padding = "15px";
    frameDiv.style.margin = "10px 0";
    frameDiv.style.borderRadius = "10px";
    
    // Convert mats to canvas for display
    const srcCanvas = matToCanvas(result.src, `Original - ${result.name}`);
    const processedCanvas = matToCanvas(result.processed, `Preprocessed`);
    const threshCanvas = matToCanvas(result.thresh, `Threshold (Contours: ${result.validContours})`);
    
    frameDiv.innerHTML = `
        <h3 style="color: ${phaseColors[result.phase]}; margin-top: 0;">
            ${result.name} - Time: ${result.timestamp}s
        </h3>
        <div class="frame-images">
            <div class="image-container">
                <h4>Original Frame</h4>
                ${srcCanvas.outerHTML}
            </div>
            <div class="image-container">
                <h4>Preprocessed</h4>
                ${processedCanvas.outerHTML}
            </div>
            <div class="image-container">
                <h4>Threshold</h4>
                ${threshCanvas.outerHTML}
            </div>
        </div>
        <div class="frame-info">
            <p><strong>Valid Contours:</strong> ${result.validContours}</p>
            <p><strong>Phase Detected:</strong> 
                <span style="color: ${phaseColors[result.phase]}; font-weight: bold;">
                    ${result.phase}
                </span>
            </p>
            <p><strong>Classification Rule:</strong> 
                ${result.validContours === 0 ? 
                  "Contours = 0 → ISOTROPIC" : 
                  "Contours > 0 → CHOLESTERIC"}
            </p>
        </div>
    `;
    
    previewDiv.appendChild(frameDiv);
    
    // Cleanup mats after display
    result.src.delete();
    result.masked.delete();
    result.processed.delete();
    result.thresh.delete();
    result.contours.delete();
}

// Convert OpenCV Mat to HTML Canvas
function matToCanvas(mat, title = "") {
    const canvas = document.createElement("canvas");
    canvas.width = mat.cols;
    canvas.height = mat.rows;
    
    // Determine color conversion
    if (mat.type() === cv.CV_8UC1) {
        cv.cvtColor(mat, mat, cv.COLOR_GRAY2RGBA);
    } else if (mat.type() === cv.CV_8UC3) {
        cv.cvtColor(mat, mat, cv.COLOR_RGB2RGBA);
    }
    
    cv.imshow(canvas, mat);
    canvas.style.border = "1px solid #ddd";
    canvas.style.margin = "5px";
    
    if (title) {
        canvas.title = title;
    }
    
    return canvas;
}

// Generate summary of results
function generateSummary() {
    const summaryDiv = document.getElementById("summary");
    summaryDiv.innerHTML = "";
    
    let html = `<h3>📋 Analysis Summary</h3>`;
    html += `<p><strong>Classification Rule:</strong><br>`;
    html += `• Contours = 0 → ISOTROPIC<br>`;
    html += `• Contours > 0 → CHOLESTERIC</p>`;
    
    html += `<table class="summary-table">
        <tr>
            <th>Frame</th>
            <th>Time (s)</th>
            <th>Contours</th>
            <th>Phase</th>
            <th>Result</th>
        </tr>`;
    
    exportData.forEach(result => {
        const isCorrect = (result.name === "ISOTROPIC" && result.phase === "ISOTROPIC") ||
                         (result.name === "CHOLESTERIC" && result.phase === "CHOLESTERIC");
        
        html += `<tr>
            <td>${result.name}</td>
            <td>${result.timestamp}</td>
            <td>${result.validContours}</td>
            <td style="color: ${phaseColors[result.phase]}">${result.phase}</td>
            <td>${isCorrect ? '✅ Correct' : '❌ Incorrect'}</td>
        </tr>`;
    });
    
    html += `</table>`;
    
    summaryDiv.innerHTML = html;
}

// Export data to CSV
document.getElementById("downloadBtn").addEventListener("click", () => {
    if (exportData.length === 0) {
        alert("No data to export. Please process video first.");
        return;
    }
    
    let csv = "frame_name,time_seconds,valid_contours,detected_phase\n";
    exportData.forEach(result => {
        csv += `${result.name},${result.timestamp},${result.validContours},${result.phase}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "liquid_crystal_analysis.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Code tab switching (for code preview section)
function showCode(language) {
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hide all code blocks
    document.querySelectorAll('.code-content pre').forEach(pre => {
        pre.classList.add('hidden');
    });
    
    // Activate selected button and show corresponding code
    document.querySelector(`[onclick="showCode('${language}')"]`).classList.add('active');
    document.getElementById(`${language}-code`).classList.remove('hidden');
}
