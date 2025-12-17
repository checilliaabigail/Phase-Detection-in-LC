# 🧮 Dokumentasi Algoritma

## Overview

Sistem deteksi fase BPLC ini menggunakan pendekatan computer vision untuk menganalisis perubahan tekstur mikroskopis pada liquid crystal. Berikut adalah penjelasan detail setiap komponen algoritma.

## 1. Preprocessing Pipeline

### 1.1 Konversi Grayscale

```javascript
gray = 0.299 * R + 0.587 * G + 0.114 * B
```

Menggunakan weighted average sesuai dengan persepsi mata manusia terhadap brightness.

### 1.2 Gaussian Blur

Mengurangi noise dengan averaging nilai pixel dalam kernel 3×3:

```
[1/9  1/9  1/9]
[1/9  1/9  1/9]
[1/9  1/9  1/9]
```

### 1.3 Adaptive Thresholding

```javascript
threshold(x,y) = mean(neighborhood) - C
if pixel(x,y) > threshold(x,y): pixel(x,y) = 0
else: pixel(x,y) = 255
```

- **Block size**: 15×15 pixels
- **Constant C**: 3
- Lebih robust terhadap variasi pencahayaan dibanding global thresholding

## 2. Electrode Masking

### 2.1 Deteksi Area Terang

Elektroda biasanya sangat terang (intensitas > 200), sehingga:

```javascript
if grayscale(x,y) > 200:
    mask(x,y) = 0  // Area elektroda
else:
    mask(x,y) = 1  // Area liquid crystal
```

### 2.2 Morphological Closing

**Dilasi** diikuti **Erosi** dengan kernel radius 7:

```
Dilasi: expand bright regions
Erosi: shrink bright regions
Result: menutup gap kecil, smooth boundaries
```

Tujuan: Menggabungkan fragmen elektroda yang terpisah dan membuat batas yang lebih smooth.

## 3. Contour Detection

### 3.1 Connected Component Labeling

Menggunakan **Flood Fill Algorithm** dengan 4-connectivity:

```
Stack-based approach:
1. Scan image for white pixel yang belum visited
2. Push ke stack, tandai sebagai visited
3. Expand ke 4 neighbors (atas, bawah, kiri, kanan)
4. Count total pixels = area komponen
5. Ulangi sampai semua pixel tervisit
```

### 3.2 Area Filtering

Hanya kontur dengan area tertentu yang dihitung:

```javascript
if (20 < area < 2000):
    valid_contour++
```

**Reasoning**:
- **< 20 pixels**: Terlalu kecil, kemungkinan noise
- **> 2000 pixels**: Terlalu besar, bukan pola LC individual

### 3.3 Klasifikasi Berdasarkan Kontur

```javascript
if (num_contours < 15):
    phase = "ISOTROPIC"
else:
    phase = "CHOLESTERIC"
```

**Threshold 15** dipilih berdasarkan:
- Fase cholesteric: 40-100 kontur (struktur helix menghasilkan banyak pola)
- Fase isotropic: 0-10 kontur (homogen, tidak ada pola)
- Nilai 15 sebagai pemisah yang robust

## 4. Variance Analysis

### 4.1 Perhitungan Variance

```javascript
mean = Σ(pixel_i) / N
variance = Σ(pixel_i - mean)² / N
```

Dimana:
- **pixel_i**: Intensitas pixel ke-i dalam area LC (mask = 1)
- **N**: Total pixel dalam area LC

### 4.2 Interpretasi Fisik

**Variance Rendah (< 96)**:
- Intensitas pixel bervariasi
- Menunjukkan adanya struktur/pola
- Karakteristik fase **CHOLESTERIC**

**Variance Tinggi (≥ 96)**:
- Intensitas pixel seragam
- Tidak ada struktur signifikan
- Karakteristik fase **ISOTROPIC**

> **Catatan**: Counterintuitive! Variance tinggi = homogen karena noise/fluktuasi kecil menghasilkan variance tinggi pada background yang seragam.

### 4.3 Klasifikasi Berdasarkan Variance

```javascript
if (variance >= 96):
    phase = "ISOTROPIC"
else:
    phase = "CHOLESTERIC"
```

## 5. Dual Classification System

Sistem menggunakan **2 metode independen**:

| Metode | Basis | Threshold | Fase Detection |
|--------|-------|-----------|----------------|
| **Kontur** | Structural patterns | 15 | Visual texture loss |
| **Variance** | Pixel statistics | 96 | Intensity homogeneity |

### Keuntungan Dual System

1. **Cross-validation**: Kedua metode harus konsisten
2. **Robust detection**: Tidak tergantung satu metode
3. **Early warning**: Variance lebih sensitif pada perubahan awal
4. **Visual confirmation**: Kontur mendeteksi hilangnya pola visual

## 6. Sampling Strategy

### 6.1 Frame Sampling

```javascript
for (frame = 0; frame < total_frames; frame += SAMPLING_RATE) {
    analyze(frame)
}
```

**SAMPLING_RATE = 30** berarti:
- Untuk video 30 FPS: analisis 1 frame per detik
- Untuk video 60 FPS: analisis 2 frame per detik

### 6.2 Trade-off

| Sampling Rate | Pros | Cons |
|--------------|------|------|
| **Kecil (10)** | Detail tinggi | Lambat, resource-intensive |
| **Sedang (30)** | Balance optimal | ✓ Default choice |
| **Besar (60)** | Cepat | Mungkin miss transisi cepat |

## 7. Performance Optimization

### 7.1 Teknik yang Digunakan

1. **Single-pass mask creation**: Mask dibuat 1× di awal, reused untuk semua frame
2. **Typed arrays**: `Uint8Array` untuk efisiensi memori
3. **Simplified morphology**: Kernel sederhana tanpa weight
4. **Stack-based flood fill**: Lebih cepat dari recursive approach

### 7.2 Kompleksitas Algoritma

```
Preprocessing:      O(W × H)
Masking:           O(W × H)
Contour detection: O(W × H × N)  # N = avg contour size
Variance:          O(W × H)
-----------------------------------
Total per frame:   O(W × H × N)
```

Dimana:
- **W**: Width video
- **H**: Height video
- **N**: Complexity factor (typically small)

## 8. Validation & Calibration

### 8.1 Validasi Threshold

Threshold dikalibrasi berdasarkan:

1. **Ground truth data**: Video dengan fase yang sudah diketahui
2. **Statistical analysis**: Histogram distribusi kontur & variance
3. **Visual inspection**: Perbandingan dengan analisis manual

### 8.2 Quality Metrics

```python
Precision = TP / (TP + FP)
Recall = TP / (TP + FN)
F1-score = 2 × (Precision × Recall) / (Precision + Recall)
```

Dimana:
- **TP**: True Positive (correct phase detection)
- **FP**: False Positive (wrong phase detection)
- **FN**: False Negative (missed phase transition)

## 9. Limitasi & Future Work

### 9.1 Limitasi Saat Ini

- ❌ Fixed threshold (tidak adaptive per video)
- ❌ Simplified morphology (tidak weighted kernel)
- ❌ No temporal smoothing (setiap frame independent)
- ❌ Browser memory limit untuk video panjang

### 9.2 Potential Improvements

- ✅ Machine learning untuk adaptive threshold
- ✅ Temporal filtering (moving average)
- ✅ Multi-scale analysis
- ✅ Real-time processing dengan Web Workers
- ✅ GPU acceleration dengan WebGL

## 10. Referensi Ilmiah

### Liquid Crystal Phase Transitions

1. De Gennes, P. G., & Prost, J. (1993). *The Physics of Liquid Crystals*. Oxford University Press.
2. Kikuchi, H., et al. (2002). "Polymer-stabilized liquid crystal blue phases". *Nature Materials*, 1(1), 64-68.

### Computer Vision Algorithms

1. Gonzalez, R. C., & Woods, R. E. (2018). *Digital Image Processing*. Pearson.
2. Szeliski, R. (2010). *Computer Vision: Algorithms and Applications*. Springer.

---

**Last Updated**: 2025-12-17
