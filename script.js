// ============================================================================
// BPLC Phase Detection - JavaScript Implementation
// Deteksi fase Cholesteric → Isotropic pada Blue Phase Liquid Crystal
// ============================================================================

// 🎯 PARAMETER THRESHOLD (sama dengan kode Python)
const CONTOUR_THRESHOLD = 15;  // < 15 = ISOTROPIC, ≥ 15 = CHOLESTERIC
const VARIANCE_THRESHOLD = 96;  // < 96 = CHOLESTERIC, ≥ 96 = ISOTROPIC
const SAMPLING_RATE = 30;       // Analisis 1 frame setiap 30 frame

// Global variables
let videoElement;
let canvas;
let ctx;
let analysisResults = [];
let videoInfo = {};
let myChart = null;

// ============================================================================
// INITIALIZE AFTER DOM LOADED
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing...');
  
  videoElement = document.getElementById('video');
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  
  // Event listeners
  document.getElementById('videoFile').addEventListener('change', handleVideoUpload);
  document.getElementById('processBtn').addEventListener('click', startAnalysis);
  document.getElementById('resetBtn').addEventListener('click', resetAnalysis);
  document.getElementById('downloadBtn').addEventListener('click', downloadCSV);
  
  console.log('Initialization complete');
});

// ============================================================================
// HANDLE VIDEO UPLOAD
// ============================================================================
function handleVideoUpload(e) {
  const file = e.target.files[0];
  console.log('File selected:', file);
  
  if (file) {
    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      alert('⚠️ Harap upload file video! (MP4, WebM, atau format video lainnya)');
      return;
    }
    
    const url = URL.createObjectURL(file);
    videoElement.src = url;
    
    videoElement.onloadedmetadata = function() {
      console.log('Video metadata loaded:', {
        duration: videoElement.duration,
        width: videoElement.videoWidth,
        height: videoElement.videoHeight
      });
      document.getElementById('processBtn').disabled = false;
    };
    
    videoElement.onerror = function() {
      console.error('Error loading video');
      alert('⚠️ Gagal memuat video. Pastikan format video didukung browser Anda.');
    };
  }
}

// ============================================================================
// 1️⃣ FUNGSI UTAMA: ANALISIS VIDEO
// ============================================================================
async function startAnalysis() {
  console.log('Starting analysis...');
  
  try {
    // Reset
    analysisResults = [];
    
    // Disable button
    document.getElementById('processBtn').disabled = true;
    
    // Show processing area
    document.getElementById('processingArea').style.display = 'block';
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('statusBox').style.display = 'block';
    
    // Get video info
    await getVideoInfo();
    console.log('Video info obtained:', videoInfo);
    
    // Start processing
    await processVideo();
    console.log('Processing complete');
    
    // Show results
    displayResults();
    
  } catch (error) {
    console.error('Analysis error:', error);
    alert('⚠️ Terjadi kesalahan saat analisis: ' + error.message);
    document.getElementById('processBtn').disabled = false;
  }
}

// ============================================================================
// 2️⃣ GET VIDEO INFO
// ============================================================================
function getVideoInfo() {
  return new Promise((resolve, reject) => {
    // Check if metadata already loaded
    if (videoElement.readyState >= 1) {
      videoInfo = {
        duration: videoElement.duration,
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        fps: 30 // Estimasi, browser tidak menyediakan FPS langsung
      };
      
      // Update canvas size
      canvas.width = videoInfo.width;
      canvas.height = videoInfo.height;
      
      // Calculate total frames
      videoInfo.totalFrames = Math.floor(videoInfo.fps * videoInfo.duration);
      
      document.getElementById('totalFrames').textContent = videoInfo.totalFrames;
      
      console.log('Video info:', videoInfo);
      resolve();
    } else {
      // Wait for metadata
      videoElement.addEventListener('loadedmetadata', function() {
        videoInfo = {
          duration: videoElement.duration,
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          fps: 30
        };
        
        canvas.width = videoInfo.width;
        canvas.height = videoInfo.height;
        videoInfo.totalFrames = Math.floor(videoInfo.fps * videoInfo.duration);
        
        document.getElementById('totalFrames').textContent = videoInfo.totalFrames;
        
        console.log('Video info:', videoInfo);
        resolve();
      }, { once: true });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Timeout waiting for video metadata'));
      }, 5000);
    }
  });
}

// ============================================================================
// 3️⃣ PROCESS VIDEO FRAME BY FRAME
// ============================================================================
async function processVideo() {
  const totalFramesToAnalyze = Math.floor(videoInfo.totalFrames / SAMPLING_RATE);
  console.log('Total frames to analyze:', totalFramesToAnalyze);
  
  let analyzedFrames = 0;
  let currentFrame = 0;
  
  // Create electrode mask (dari frame pertama)
  console.log('Creating mask from first frame...');
  videoElement.currentTime = 0;
  await waitForSeek();
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const firstFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mask = createElectrodeMask(firstFrameData);
  console.log('Mask created');
  
  // Reset video
  videoElement.currentTime = 0;
  
  // Process frames
  for (let i = 0; i < videoInfo.totalFrames; i += SAMPLING_RATE) {
    currentFrame = i;
    const timestamp = i / videoInfo.fps;
    
    console.log(`Processing frame ${i}/${videoInfo.totalFrames} (${timestamp.toFixed(2)}s)`);
    
    // Seek to frame
    videoElement.currentTime = timestamp;
    await waitForSeek();
    
    // Draw frame to canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Apply mask
    const maskedImageData = applyMask(imageData, mask);
    
    // Analyze frame
    const result = analyzeFrame(maskedImageData, mask, currentFrame, timestamp);
    analysisResults.push(result);
    
    console.log(`Frame ${i}: contours=${result.num_contours}, variance=${result.variance.toFixed(2)}, phase=${result.phase_contour}`);
    
    analyzedFrames++;
    
    // Update progress
    const progress = (analyzedFrames / totalFramesToAnalyze) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressFill').textContent = Math.round(progress) + '%';
    document.getElementById('currentFrame').textContent = currentFrame;
    document.getElementById('currentPhase').textContent = result.phase_contour;
    document.getElementById('currentContours').textContent = result.num_contours;
    
    // Small delay to allow UI update
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log('Analysis complete. Total results:', analysisResults.length);
}

// ============================================================================
// 4️⃣ CREATE ELECTRODE MASK
// ============================================================================
function createElectrodeMask(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Convert to grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  
  // Create mask: 1 = valid area, 0 = electrode area
  const mask = new Uint8Array(width * height);
  mask.fill(1);
  
  // Threshold bright areas (electrodes)
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] > 200) {
      mask[i] = 0;
    }
  }
  
  // Morphological closing (simplified)
  const radius = 7;
  const morphed = morphologicalClose(mask, width, height, radius);
  
  return morphed;
}

// ============================================================================
// 5️⃣ MORPHOLOGICAL OPERATIONS
// ============================================================================
function morphologicalClose(mask, width, height, radius) {
  // Dilate then erode
  let dilated = dilate(mask, width, height, radius);
  let eroded = erode(dilated, width, height, radius);
  return eroded;
}

function dilate(mask, width, height, radius) {
  const result = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const idx = ny * width + nx;
            if (mask[idx] > maxVal) maxVal = mask[idx];
          }
        }
      }
      
      result[y * width + x] = maxVal;
    }
  }
  
  return result;
}

function erode(mask, width, height, radius) {
  const result = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 255;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const idx = ny * width + nx;
            if (mask[idx] < minVal) minVal = mask[idx];
          }
        }
      }
      
      result[y * width + x] = minVal;
    }
  }
  
  return result;
}

// ============================================================================
// 6️⃣ APPLY MASK
// ============================================================================
function applyMask(imageData, mask) {
  const data = imageData.data;
  const maskedData = new ImageData(
    new Uint8ClampedArray(data),
    imageData.width,
    imageData.height
  );
  
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 0) {
      // Set to white background
      maskedData.data[i * 4] = 255;     // R
      maskedData.data[i * 4 + 1] = 255; // G
      maskedData.data[i * 4 + 2] = 255; // B
    }
  }
  
  return maskedData;
}

// ============================================================================
// 7️⃣ ANALYZE FRAME
// ============================================================================
function analyzeFrame(imageData, mask, frameNumber, timestamp) {
  // Preprocessing
  const processed = preprocessFrame(imageData, mask);
  
  // Detect contours
  const numContours = detectContours(processed, mask);
  
  // Calculate variance
  const variance = calculateVariance(imageData, mask);
  
  // Classify phases
  const phaseContour = numContours < CONTOUR_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
  const phaseVariance = variance >= VARIANCE_THRESHOLD ? "ISOTROPIC" : "CHOLESTERIC";
  
  return {
    frame_number: frameNumber,
    timestamp_seconds: timestamp,
    timestamp_minutes: timestamp / 60,
    num_contours: numContours,
    phase_contour: phaseContour,
    variance: variance,
    phase_variance: phaseVariance
  };
}

// ============================================================================
// 8️⃣ PREPROCESSING
// ============================================================================
function preprocessFrame(imageData, mask) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Convert to grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    if (mask[idx] === 1) {
      gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    } else {
      gray[idx] = 255; // White background
    }
  }
  
  // Gaussian blur (simplified)
  const blurred = gaussianBlur(gray, width, height, 3);
  
  // Adaptive threshold (simplified)
  const threshold = adaptiveThreshold(blurred, width, height, 15);
  
  return threshold;
}

// ============================================================================
// 9️⃣ GAUSSIAN BLUR
// ============================================================================
function gaussianBlur(gray, width, height, kernelSize) {
  const result = new Uint8Array(width * height);
  const radius = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += gray[ny * width + nx];
            count++;
          }
        }
      }
      
      result[y * width + x] = sum / count;
    }
  }
  
  return result;
}

// ============================================================================
// 🔟 ADAPTIVE THRESHOLD
// ============================================================================
function adaptiveThreshold(gray, width, height, blockSize) {
  const result = new Uint8Array(width * height);
  const radius = Math.floor(blockSize / 2);
  const C = 3;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += gray[ny * width + nx];
            count++;
          }
        }
      }
      
      const mean = sum / count;
      const pixel = gray[y * width + x];
      
      result[y * width + x] = pixel > (mean - C) ? 0 : 255;
    }
  }
  
  return result;
}

// ============================================================================
// 1️⃣1️⃣ DETECT CONTOURS
// ============================================================================
function detectContours(binary, mask) {
  const width = canvas.width;
  const height = canvas.height;
  
  // Simple contour detection using connected components
  const visited = new Uint8Array(width * height);
  let contourCount = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (binary[idx] === 255 && mask[idx] === 1 && visited[idx] === 0) {
        const area = floodFill(binary, visited, mask, x, y, width, height);
        
        // Filter by area (same as Python: 20 < area < 2000)
        if (area > 20 && area < 2000) {
          contourCount++;
        }
      }
    }
  }
  
  return contourCount;
}

// ============================================================================
// 1️⃣2️⃣ FLOOD FILL (for connected components)
// ============================================================================
function floodFill(binary, visited, mask, startX, startY, width, height) {
  const stack = [[startX, startY]];
  let area = 0;
  
  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] === 1) continue;
    if (binary[idx] !== 255) continue;
    if (mask[idx] !== 1) continue;
    
    visited[idx] = 1;
    area++;
    
    // 4-connectivity
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }
  
  return area;
}

// ============================================================================
// 1️⃣3️⃣ CALCULATE VARIANCE
// ============================================================================
function calculateVariance(imageData, mask) {
  const data = imageData.data;
  const pixels = [];
  
  // Collect LC pixels
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      const gray = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      pixels.push(gray);
    }
  }
  
  if (pixels.length === 0) return 0;
  
  // Calculate mean
  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  
  // Calculate variance
  const variance = pixels.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / pixels.length;
  
  return variance;
}

// ============================================================================
// 1️⃣4️⃣ DISPLAY RESULTS
// ============================================================================
function displayResults() {
  console.log('Displaying results...');
  
  // Hide processing area
  document.getElementById('processingArea').style.display = 'none';
  
  // Show results section
  document.getElementById('resultsSection').style.display = 'block';
  
  // Calculate statistics
  const cholestericCount = analysisResults.filter(r => r.phase_contour === "CHOLESTERIC").length;
  const isotropicCount = analysisResults.filter(r => r.phase_contour === "ISOTROPIC").length;
  const totalCount = analysisResults.length;
  
  const cholestericPercent = ((cholestericCount / totalCount) * 100).toFixed(1);
  const isotropicPercent = ((isotropicCount / totalCount) * 100).toFixed(1);
  
  console.log(`Results: Cholesteric=${cholestericCount}, Isotropic=${isotropicCount}, Total=${totalCount}`);
  
  // Update summary cards
  document.getElementById('cholestericCount').textContent = cholestericCount;
  document.getElementById('cholestericPercent').textContent = cholestericPercent + '%';
  document.getElementById('isotropicCount').textContent = isotropicCount;
  document.getElementById('isotropicPercent').textContent = isotropicPercent + '%';
  document.getElementById('totalFrameCount').textContent = totalCount;
  
  // Create chart
  createChart();
}

// ============================================================================
// 1️⃣5️⃣ CREATE CHART
// ============================================================================
function createChart() {
  const ctx = document.getElementById('phaseChart').getContext('2d');
  
  // Prepare data
  const labels = analysisResults.map(r => r.timestamp_minutes.toFixed(2));
  const contours = analysisResults.map(r => r.num_contours);
  const variance = analysisResults.map(r => r.variance);
  
  // Destroy existing chart
  if (myChart) {
    myChart.destroy();
  }
  
  // Create new chart
  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Jumlah Kontur',
          data: contours,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          yAxisID: 'y',
          tension: 0.1
        },
        {
          label: 'Variance',
          data: variance,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          yAxisID: 'y1',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Analisis Kontur dan Variance vs Waktu',
          font: {
            size: 16
          }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Waktu (menit)'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Jumlah Kontur'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Variance'
          },
          grid: {
            drawOnChartArea: false,
          }
        }
      }
    }
  });
}

// ============================================================================
// 1️⃣6️⃣ DOWNLOAD CSV
// ============================================================================
function downloadCSV() {
  // Create CSV content
  let csv = 'frame_number,timestamp_seconds,timestamp_minutes,num_contours,phase_contour,variance,phase_variance\n';
  
  analysisResults.forEach(result => {
    csv += `${result.frame_number},${result.timestamp_seconds.toFixed(2)},${result.timestamp_minutes.toFixed(4)},${result.num_contours},${result.phase_contour},${result.variance.toFixed(2)},${result.phase_variance}\n`;
  });
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bplc_analysis_results.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============================================================================
// 1️⃣7️⃣ RESET ANALYSIS
// ============================================================================
function resetAnalysis() {
  // Reset variables
  analysisResults = [];
  videoInfo = {};
  
  // Reset UI
  document.getElementById('videoFile').value = '';
  document.getElementById('processBtn').disabled = true;
  document.getElementById('processingArea').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('progressContainer').style.display = 'none';
  document.getElementById('statusBox').style.display = 'none';
  
  // Clear video
  videoElement.src = '';
  
  // Destroy chart
  if (myChart) {
    myChart.destroy();
    myChart = null;
  }
}

// ============================================================================
// 1️⃣8️⃣ HELPER: Wait for video seek
// ============================================================================
function waitForSeek() {
  return new Promise((resolve) => {
    const handler = function() {
      videoElement.removeEventListener('seeked', handler);
      resolve();
    };
    videoElement.addEventListener('seeked', handler);
    
    // Timeout safety
    setTimeout(resolve, 1000);
  });
}
