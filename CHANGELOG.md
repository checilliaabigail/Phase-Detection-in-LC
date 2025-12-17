# Changelog

All notable changes to the BPLC Phase Detection project will be documented in this file.

## [1.0.0] - 2025-12-17

### 🎉 Initial Release

#### Added
- ✅ Core phase detection algorithm (contour-based)
- ✅ Variance-based phase classification
- ✅ Electrode masking system
- ✅ Real-time progress tracking
- ✅ Interactive Chart.js visualization
- ✅ CSV export functionality
- ✅ Responsive web design
- ✅ Mobile-friendly interface
- ✅ Complete documentation (README, ALGORITHM, INSTALL)

#### Features
- **Dual Classification System**: Kontur + Variance
- **Threshold Parameters**: Contour (15), Variance (96)
- **Sampling Rate**: 30 frames (customizable)
- **Preprocessing Pipeline**: Grayscale → Blur → Threshold
- **Morphological Operations**: Dilate & Erode untuk masking
- **Connected Component Labeling**: Flood fill algorithm
- **Statistical Analysis**: Mean, variance, contour counting

#### Technical Stack
- HTML5 Canvas API
- Vanilla JavaScript (no frameworks)
- Chart.js for visualization
- Pure CSS3 (no preprocessor)

#### Browser Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Known Issues
- ⚠️ Large videos (>10 minutes) may cause browser memory issues
- ⚠️ FPS estimation is fixed at 30 (browser limitation)
- ⚠️ No video format validation on upload

### Performance
- Average processing time: ~1-2 seconds per minute of video
- Memory usage: ~200-500 MB for typical videos
- Tested with videos up to 5 minutes duration

---

## Future Roadmap

### [1.1.0] - Planned
- [ ] Add video format validation
- [ ] Implement video preview before processing
- [ ] Add pause/resume capability during processing
- [ ] Show estimated time remaining

### [1.2.0] - Planned
- [ ] Adaptive threshold based on video statistics
- [ ] Temporal smoothing (moving average filter)
- [ ] Multiple threshold preset options
- [ ] Enhanced error handling and user feedback

### [2.0.0] - Future
- [ ] WebWorker support for background processing
- [ ] WebGL acceleration for faster processing
- [ ] Machine learning model integration
- [ ] Batch processing multiple videos
- [ ] Cloud storage integration (optional)
- [ ] Multi-language support (EN, ID, JP)

---

## Development Notes

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Contributing
Contributions are welcome! Please read CONTRIBUTING.md (coming soon) for guidelines.

---

**Project Start Date**: December 17, 2025  
**Status**: Active Development  
**Maintainer**: Project Team Ganjil 2025/2026
