# 🔬 BPLC Phase Detection

**Analisis Fase Blue Phase Liquid Crystal: Cholesteric → Isotropic**

Aplikasi web berbasis JavaScript untuk mendeteksi transisi fase pada Blue Phase Liquid Crystal (BPLC) dari video mikroskop. Implementasi ini adalah versi browser dari algoritma Python yang menggunakan OpenCV dan Computer Vision.

## 📋 Deskripsi

Proyek ini menganalisis video mikroskop Blue Phase Liquid Crystal untuk mendeteksi transisi fase dari **Cholesteric** ke **Isotropic** menggunakan dua metode:

1. **Deteksi Kontur**: Menghitung jumlah kontur (pola tekstur) yang terdeteksi
2. **Analisis Variance**: Mengukur variasi intensitas pixel

### 🎯 Fitur Utama

- ✅ Upload video langsung dari browser
- ✅ Analisis frame-by-frame dengan sampling rate yang dapat dikonfigurasi
- ✅ Deteksi otomatis elektroda dengan masking
- ✅ Visualisasi real-time progress analisis
- ✅ Grafik interaktif hasil analisis
- ✅ Export hasil ke CSV
- ✅ Responsive design untuk mobile dan desktop

## 🧪 Metodologi

### Parameter Threshold

```javascript
CONTOUR_THRESHOLD = 15   // < 15 kontur → ISOTROPIC, ≥ 15 → CHOLESTERIC
VARIANCE_THRESHOLD = 96  // < 96 → CHOLESTERIC, ≥ 96 → ISOTROPIC
SAMPLING_RATE = 30       // Analisis 1 frame setiap 30 frame
```

### Pipeline Analisis

1. **Preprocessing**
   - Konversi ke grayscale
   - Gaussian blur (noise reduction)
   - Adaptive thresholding
   - Morphological operations

2. **Electrode Masking**
   - Deteksi area terang (elektroda)
   - Morphological closing
   - Pembuatan mask untuk area liquid crystal

3. **Feature Extraction**
   - **Contour Detection**: Connected component labeling dengan area filtering (20 < area < 2000)
   - **Variance Calculation**: Statistik intensitas pixel pada area LC

4. **Phase Classification**
   - **Cholesteric**: Banyak kontur (struktur helicoidal), variance rendah
   - **Isotropic**: Sedikit kontur (tidak ada struktur), variance tinggi

## 📊 Interpretasi Hasil

### Fase CHOLESTERIC
- 🔴 **Karakteristik**: Pola tekstur terstruktur dengan struktur helicoidal
- 📈 **Kontur**: Tinggi (≥ 15)
- 📉 **Variance**: Rendah (< 96)

### Fase ISOTROPIC
- 🔵 **Karakteristik**: Cairan homogen tanpa struktur
- 📉 **Kontur**: Rendah (< 15)
- 📈 **Variance**: Tinggi (≥ 96)

## 🚀 Cara Penggunaan

### Instalasi

Tidak diperlukan instalasi! Cukup buka file `index.html` di browser modern (Chrome, Firefox, Edge, Safari).

Atau host di GitHub Pages:

1. Upload semua file ke repository GitHub
2. Aktifkan GitHub Pages di Settings → Pages
3. Akses di `https://username.github.io/repository-name/`

### Penggunaan

1. **Upload Video**
   - Klik "Choose File" atau drag & drop video
   - Format yang didukung: MP4, WebM, OGG, AVI

2. **Mulai Analisis**
   - Klik tombol "🚀 Mulai Analisis"
   - Tunggu proses selesai (ditampilkan progress bar)

3. **Lihat Hasil**
   - Ringkasan statistik (jumlah frame per fase)
   - Grafik interaktif kontur dan variance
   - Download hasil CSV untuk analisis lebih lanjut

## 📁 Struktur File

```
bplc-phase-detection/
│
├── index.html          # UI dan struktur HTML
├── script.js           # Logika analisis dan pemrosesan
└── README.md           # Dokumentasi (file ini)
```

## 🔧 Teknologi

- **HTML5 Canvas**: Rendering dan manipulasi video frame
- **JavaScript (Vanilla)**: Implementasi algoritma computer vision
- **Chart.js**: Visualisasi grafik interaktif
- **CSS3**: Styling dengan gradient modern

## 📈 Perbandingan dengan Kode Python

| Aspek | Python (OpenCV) | JavaScript (Browser) |
|-------|----------------|---------------------|
| **Library** | OpenCV, NumPy, Matplotlib | Canvas API, Vanilla JS |
| **Performance** | Lebih cepat (native) | Lebih lambat (interpreted) |
| **Deployment** | Perlu Python environment | Langsung di browser |
| **Portability** | Platform-specific | Cross-platform |
| **UI** | Colab/Jupyter | Web interface |

### Kelebihan Versi Browser

✅ Tidak perlu instalasi Python/library  
✅ Akses langsung dari browser  
✅ Share link ke siapa saja  
✅ UI interaktif dan modern  
✅ Cross-platform (desktop, mobile, tablet)

### Keterbatasan

⚠️ Lebih lambat untuk video besar (>5 menit)  
⚠️ Tergantung kapasitas RAM browser  
⚠️ Tidak semua algoritma OpenCV tersedia

## 🎨 Customization

### Mengubah Threshold

Edit di `script.js`:

```javascript
const CONTOUR_THRESHOLD = 15;  // Ubah sesuai kebutuhan
const VARIANCE_THRESHOLD = 96;
```

### Mengubah Sampling Rate

```javascript
const SAMPLING_RATE = 30;  // Analisis tiap N frame
// Nilai lebih kecil = lebih detail, lebih lambat
// Nilai lebih besar = lebih cepat, kurang detail
```

### Mengubah Filter Area Kontur

Di fungsi `detectContours()`:

```javascript
if (area > 20 && area < 2000) {  // Ubah range sesuai kebutuhan
    contourCount++;
}
```

## 📝 Format Output CSV

```csv
frame_number,timestamp_seconds,timestamp_minutes,num_contours,phase_contour,variance,phase_variance
0,0.00,0.0000,45,CHOLESTERIC,92.45,CHOLESTERIC
30,1.00,0.0167,43,CHOLESTERIC,93.12,CHOLESTERIC
...
```

## 🔬 Dasar Teori

### Blue Phase Liquid Crystal (BPLC)

BPLC adalah fase mesomorfik dengan struktur kubik tiga dimensi yang unik. Transisi fase yang umum:

```
Cholesteric (Chiral Nematic) → Blue Phase → Isotropic
```

### Cholesteric Phase
- Molekul tersusun dalam lapisan dengan orientasi berputar (helix)
- Menunjukkan pola tekstur optik yang khas
- Birefringent dengan pola fingerprint

### Isotropic Phase
- Molekul berorientasi acak
- Tidak ada struktur optik teratur
- Tampilan homogen di bawah mikroskop

## 👥 Kontributor

Proyek ini dikembangkan untuk **Proyek Bersama Ganjil 2025/2026** sebagai implementasi browser dari algoritma analisis Python.

## 📄 Lisensi

MIT License - Silakan gunakan untuk keperluan pendidikan dan penelitian.

## 🙏 Acknowledgments

- Dosen pembimbing proyek
- Algoritma computer vision: OpenCV documentation
- Inspirasi UI: Modern web design patterns

## 📞 Kontak

Untuk pertanyaan atau saran, silakan buka issue di GitHub repository ini.

---

**⭐ Jika proyek ini bermanfaat, jangan lupa beri star!**
