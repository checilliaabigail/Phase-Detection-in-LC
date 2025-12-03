let video = document.getElementById("video");
let processBtn = document.getElementById("processBtn");
let canvas = document.getElementById("canvas");
let resultsDiv = document.getElementById("results");
let exportData = [];

const crop = { x:100, y:100, w:1500, h:200 }; // sama seperti Python

document.getElementById("videoFile").addEventListener("change", (e) => {
    let file = e.target.files[0];
    video.src = URL.createObjectURL(file);
    processBtn.disabled = false;
});

processBtn.addEventListener("click", async () => {
    exportData = [];
    const fps = 1; // Ambil 1 frame per detik (dapat diubah seperti Python)

    canvas.width = crop.w;
    canvas.height = crop.h;

    await video.play();
    video.pause();
    
    const duration = Math.floor(video.duration);

    for (let t = 0; t < duration; t++) {
        video.currentTime = t;
        await new Promise(r => setTimeout(r, 80));

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        let equalized = new cv.Mat();
        cv.equalizeHist(gray, equalized);

        let thresh = new cv.Mat();
        cv.adaptiveThreshold(equalized, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                             cv.THRESH_BINARY_INV, 11, 2);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let validContours = 0;

        for (let i = 0; i < contours.size(); i++) {
            let c = contours.get(i);
            let area = cv.contourArea(c);
            let peri = cv.arcLength(c, true);

            if (area < 30 || area > 500 || peri === 0) continue;

            let circ = 4 * Math.PI * area / (peri * peri);

            if (circ > 0.2 && circ < 1.2) validContours++;
        }

        let phase = classify(validContours, t);

        exportData.push({
            time_sec: t,
            valid_contours: validContours,
            phase: phase
        });

        src.delete(); gray.delete(); equalized.delete();
        thresh.delete(); contours.delete(); hierarchy.delete();
    }

    resultsDiv.style.display = "block";
    document.getElementById("status").innerHTML = "✔ Analisis selesai!";
});

// ================= CLASSIFIER =================
function classify(contours, time){
    if (time < 22 * 60) return "cholesteric";
    if (contours > 25) return "cholesteric";
    if (contours >= 20) return "transition";
    return "isotropic";
}

// ================= EXPORT CSV =================
document.getElementById("downloadBtn").addEventListener("click", () => {
    let csv = "time_sec,valid_contours,phase\n";
    exportData.forEach(r => csv += `${r.time_sec},${r.valid_contours},${r.phase}\n`);

    let blob = new Blob([csv], { type: "text/csv" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hasil_bplc.csv";
    a.click();
});
