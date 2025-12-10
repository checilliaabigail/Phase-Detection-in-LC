// ============================================================
// BPLC Phase Detection - Main Script
// Deteksi fase Blue Phase Liquid Crystal
// ============================================================

let video, canvas, ctx;
let analysisResults = [];
let chartInstance = null;

// ============================================================
// INITIALIZATION
// ============================================================
window.addEventListener('load', () => {
  video = document.getElementById('video');
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  
  // Event listeners
  document.getElementById('videoFile').addEventListener('change', handleFileSelect);
  document.getElementById('processBtn').addEventListener('click', startAnalysis);
  document.getElementById('downloadBtn').addEventListener('click', downloadCSV);
  document.getElementById('resetBtn').addEventListener('click', resetApp);
});

// ============================================================
// FILE HANDLING
// ============================================================
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    video.src = url;
    document.getElementById('processBtn').disabled = false;
  }
}

// ============================================================
// MAIN ANALYSIS PROCESS
// ============================================================
async function startAnalysis() {
  analysisResults = [];
  document.getElementById('processingArea').style.display = 'block';
  document.getElementById('progressContainer').style.display = 'block';
  document.getElementById('statusBox').style.display = 'block';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('processBtn').disabled = true;
  
  // Load and prepare video
  await video.play();
  video.pause();
  
  const fps = 30; // Estimate, could be read from video metadata
  const duration = video.duration;
  const totalFrames = Math.floor(duration * fps);
  const frameInterval = 1; // Process every frame
  
  document.getElementById('totalFrames').textContent = totalFrames;
  
  // Set canvas size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  let frameCount = 0;
  
  // Main processing loop
  const processFrame = () => {
    if (video.currentTime >= duration) {
      finishAnalysis();
      return;
    }
    
    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Analyze frame
    const result = analyzeFrame(imageData, frameCount, video.currentTime);
    analysisResults.push(result);
    
    // Update UI
    updateProgress(frameCount, totalFrames, result);
    
    frameCount++;
    video.currentTime += frameInterval / fps;
    
    // Continue processing
    setTimeout(processFrame, 1);
  };
  
  processFrame();
}

// ============================================================
// FRAME ANALYSIS
// ============================================================
function analyzeFrame(imageData, frameNumber, timestamp) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // Step 1: Create mask to remove electrode area
  const mask = createElectrodeMask(data, width, height);
  
  // Step 2: Apply preprocessing
  const processed = preprocessFrame(data, width, height, mask);
  
  // Step 3: Count contours (simplified version)
  const contours = countContours(processed, width, height);
  
  // Step 4: Simple classification
  // Rule: 0 contours = isotropic, >0 contours = cholesteric
  const phase = contours === 0 ? 'isotropic' : 'cholesteric';
  
  return {
    frame: frameNumber,
    time_sec: timestamp,
    contours: contours,
    phase: phase
  };
}

// ============================================================
// ELECTRODE MASKING
// ============================================================
function createElectrodeMask(data, width, height) {
  const mask = new Uint8Array(width * height);
  
  // Detect bright areas (electrode regions with white/pink background)
  // These areas typically have very high brightness values
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Convert to grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    const pixelIndex = i / 4;
    
    // If very bright (>200), mark as electrode area (0)
    // Otherwise, keep as liquid crystal area (255)
    mask[pixelIndex] = gray > 200 ? 0 : 255;
  }
  
  return mask;
}

// ============================================================
// PREPROCESSING
// ============================================================
function preprocessFrame(data, width, height, mask) {
  const processed = new Uint8Array(width * height);
  
  // Convert to grayscale and apply mask
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    
    if (mask[pixelIndex] === 0) {
      // Masked area (electrode) -> set to white
      processed[pixelIndex] = 255;
    } else {
      // Liquid crystal area -> convert to grayscale
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      processed[pixelIndex] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }
  
  // Apply simple threshold
  const threshold = 128;
  for (let i = 0; i < processed.length; i++) {
    processed[i] = processed[i] < threshold ? 0 : 255;
  }
  
  return processed;
}

// ============================================================
// CONTOUR COUNTING
// ============================================================
function countContours(processed, width, height) {
  let contourCount = 0;
  const visited = new Uint8Array(width * height);
  
  // Scan through image to find contours
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // If we find a dark pixel that hasn't been visited
      if (processed[idx] === 0 && !visited[idx]) {
        // Use flood fill to measure the area
        const area = floodFill(processed, visited, x, y, width, height);
        
        // Filter by area (similar to Python code: 50 < area < 1000)
        if (area > 50 && area < 1000) {
          contourCount++;
        }
      }
    }
  }
  
  return contourCount;
}

// ============================================================
// FLOOD FILL ALGORITHM
// ============================================================
function floodFill(processed, visited, startX, startY, width, height) {
  const stack = [[startX, startY]];
  let area = 0;
  const maxArea = 1000; // Prevent infinite loops
  
  while (stack.length > 0 && area < maxArea) {
    const [x, y] = stack.pop();
    const idx = y * width + x;
    
    // Boundary check
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    // Already visited or not a dark pixel
    if (visited[idx] || processed[idx] !== 0) continue;
    
    // Mark as visited
    visited[idx] = 1;
    area++;
    
    // Add neighbors to stack (4-connectivity)
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  return area;
}

// ============================================================
// UI UPDATE
// ============================================================
function updateProgress(frameCount, totalFrames, result) {
  const progress = (frameCount / totalFrames) * 100;
  
  document.getElementById('progressFill').style.width = progress + '%';
  document.getElementById('progressFill').textContent = Math.round(progress) + '%';
  document.getElementById('currentFrame').textContent = frameCount;
  document.getElementById('currentPhase').textContent = result.phase.toUpperCase();
  document.getElementById('currentContours').textContent = result.contours;
}

// ============================================================
// FINISH ANALYSIS
// ============================================================
function finishAnalysis() {
  document.getElementById('processingArea').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'block';
  
  // Calculate statistics
  const cholestericFrames = analysisResults.filter(r => r.phase === 'cholesteric').length;
  const isotropicFrames = analysisResults.filter(r => r.phase === 'isotropic').length;
  const total = analysisResults.length;
  
  // Update UI
  document.getElementById('cholestericCount').textContent = cholestericFrames;
  document.getElementById('isotropicCount').textContent = isotropicFrames;
  document.getElementById('totalFrameCount').textContent = total;
  document.getElementById('cholestericPercent').textContent = 
    ((cholestericFrames / total) * 100).toFixed(1) + '%';
  document.getElementById('isotropicPercent').textContent = 
    ((isotropicFrames / total) * 100).toFixed(1) + '%';
  
  // Create visualization chart
  createChart();
}

// ============================================================
// CHART CREATION
// ============================================================
function createChart() {
  // Destroy previous chart if exists
  if (chartInstance) {
    chartInstance.destroy();
  }
  
  const ctx = document.getElementById('phaseChart').getContext('2d');
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: analysisResults.map(r => r.time_sec.toFixed(1)),
      datasets: [{
        label: 'Jumlah Kontur',
        data: analysisResults.map(r => r.contours),
        borderColor: 'rgb(102, 126, 234)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.1,
        pointRadius: 2,
        pointBackgroundColor: analysisResults.map(r => 
          r.phase === 'cholesteric' ? 'rgb(250, 112, 154)' : 'rgb(79, 172, 254)'
        )
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: {
          display: true,
          text: 'Perubahan Fase: Jumlah Kontur vs Waktu',
          font: { 
            size: 16, 
            weight: 'bold' 
          }
        },
        legend: { 
          display: true 
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const result = analysisResults[context.dataIndex];
              return [
                `Kontur: ${result.contours}`,
                `Fase: ${result.phase.toUpperCase()}`,
                `Frame: ${result.frame}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          title: { 
            display: true, 
            text: 'Waktu (detik)' 
          },
          ticks: { 
            maxTicksLimit: 20 
          }
        },
        y: {
          title: { 
            display: true, 
            text: 'Jumlah Kontur' 
          },
          beginAtZero: true
        }
      }
    }
  });
}

// ============================================================
// CSV DOWNLOAD
// ============================================================
function downloadCSV() {
  // Create CSV header
  let csv = 'Frame,Time(s),Contours,Phase\n';
  
  // Add data rows
  analysisResults.forEach(r => {
    csv += `${r.frame},${r.time_sec.toFixed(2)},${r.contours},${r.phase}\n`;
  });
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bplc_phase_analysis_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// RESET APPLICATION
// ============================================================
function resetApp() {
  if (confirm('Apakah Anda yakin ingin menganalisis video baru? Data saat ini akan hilang.')) {
    location.reload();
  }
}
