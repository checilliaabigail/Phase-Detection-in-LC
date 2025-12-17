// analyzer.js - AWAL FILE
console.log('🔧 analyzer.js loading...');

class VideoAnalyzer {
    constructor() {
        console.log('✅ VideoAnalyzer class instantiated');
        // ... constructor code ...
    }

    init() {
        console.log('🔄 VideoAnalyzer.init() called');
        // ... init code ...
    }

    // ... other methods ...
}

// EKSPOR KE GLOBAL SCOPE
if (typeof window !== 'undefined') {
    window.VideoAnalyzer = VideoAnalyzer;
    console.log('🌐 VideoAnalyzer exported to window');
}

console.log('✅ analyzer.js loaded successfully');
