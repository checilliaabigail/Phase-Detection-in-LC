let uploadedImage = null;

document.getElementById("fileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    document.getElementById("analyzeBtn").disabled = false;

    const preview = document.getElementById("filePreview");
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";

    uploadedImage = file;
});


document.getElementById("analyzeBtn").addEventListener("click", async function () {
    if (!uploadedImage) return;

    document.getElementById("loading").style.display = "block";

    const img = document.getElementById("filePreview");
    await new Promise(r => setTimeout(r, 500)); // delay to load canvas

    let src = cv.imread(img);

    // --- CROP AREA (sesuai Python mu) ---
    let cropRect = new cv.Rect(100, 100, 1500, 200);
    let cropped = src.roi(cropRect);

    // --- GRAYSCALE ---
    let gray = new cv.Mat();
    cv.cvtColor(cropped, gray, cv.COLOR_RGBA2GRAY);

    // --- HISTOGRAM EQUALIZATION ---
    let equalized = new cv.Mat();
    cv.equalizeHist(gray, equalized);

    // --- NORMALIZATION ---
    let norm = new cv.Mat();
    cv.normalize(equalized, norm, 0, 255, cv.NORM_MINMAX);

    // --- ADAPTIVE THRESHOLD ---
    let thresh = new cv.Mat();
    cv.adaptiveThreshold(norm, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    // --- FIND CONTOURS ---
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let validContours = 0;

    for (let i = 0; i < contours.size(); i++){
        let cnt = contours.get(i);
        let area = cv.contourArea(cnt);
        let perimeter = cv.arcLength(cnt, true);

        if (area < 30 || area > 500 || perimeter === 0) continue;

        let circularity = 4 * Math.PI * area / (perimeter * perimeter);

        if (circularity > 0.2 && circularity < 1.2){
            validContours++;
        }
    }

    // --- CLASSIFICATION (same rules as Python) ---
    let detectedPhase = "";
    if (validContours > 25) detectedPhase = "cholesteric";
    else if (validContours >= 20) detectedPhase = "transition";
    else detectedPhase = "isotropic";

    document.getElementById("loading").style.display = "none";

    document.getElementById("results").style.display = "block";
    document.getElementById("resultContent").innerHTML = `
        <div class='result-item'>🔍 Kontur Valid: <b>${validContours}</b></div>
        <div class='result-item'>📌 Fase Terdeteksi: <b>${detectedPhase.toUpperCase()}</b></div>
    `;

    // cleanup
    src.delete(); cropped.delete(); gray.delete(); equalized.delete(); norm.delete();
    thresh.delete(); contours.delete(); hierarchy.delete();
});
