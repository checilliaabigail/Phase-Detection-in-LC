const fileInput = document.getElementById("videoInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const videoPreview = document.getElementById("videoPreview");
const loading = document.getElementById("loading");
const resultsBox = document.getElementById("results");
const resultContent = document.getElementById("resultContent");
const downloadBtn = document.getElementById("downloadBtn");

let uploadedFile = null;

// =========================
// Handle File Upload
// =========================
fileInput.addEventListener("change", (event) => {
  uploadedFile = event.target.files[0];

  if (!uploadedFile) return;

  document.getElementById("fileInfo").innerText =
    `📁 File: ${uploadedFile.name} (${(uploadedFile.size/1024/1024).toFixed(2)} MB)`;

  const url = URL.createObjectURL(uploadedFile);
  videoPreview.src = url;
  videoPreview.style.display = "block";

  analyzeBtn.disabled = false;
});


// =========================
// Simulated Analysis
// =========================
analyzeBtn.addEventListener("click", () => {

  analyzeBtn.disabled = true;
  loading.style.display = "block";

  setTimeout(() => {
    loading.style.display = "none";
    resultsBox.style.display = "block";

    resultContent.innerHTML = `
      <div class="result-item">🧪 Detected Phase: <strong>Transition Phase</strong></div>
      <div class="result-item">🧮 Avg Contours: <strong>34</strong></div>
      <div class="result-item">📍 Duration analyzed: <strong>13,400 frames</strong></div>
    `;

    downloadBtn.style.display = "block";

  }, 3500); // simulasi delay analisis
});


// ================================
// Dummy Download CSV
// ================================
downloadBtn.addEventListener("click", () => {
  const csvContent = "frame,count,phase\n1,33,cholesteric\n2,10,isotropic";
  const blob = new Blob([csvContent], { type: "text/csv" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bplc_analysis.csv";
  link.click();
});
