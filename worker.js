// Web Worker for video processing
self.onmessage = function(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'process':
            processVideo(data);
            break;
    }
};

async function processVideo({ videoData, params }) {
    try {
        // Load OpenCV in worker
        await loadOpenCV();
        
        // Process video frames
        const results = [];
        const totalFrames = videoData.totalFrames;
        
        for (let i = 0; i < videoData.frames.length; i++) {
            const frame = videoData.frames[i];
            const result = processFrame(frame, params);
            results.push(result);
            
            // Report progress
            self.postMessage({
                type: 'progress',
                data: {
                    percent: ((i + 1) / videoData.frames.length) * 100,
                    frame: i + 1,
                    totalFrames: videoData.frames.length
                }
            });
            
            // Yield to prevent blocking
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // Send completion
        self.postMessage({
            type: 'complete',
            data: results
        });
        
    } catch (error) {
        self.postMessage({
            type: 'error',
            data: { message: error.message }
        });
    }
}

function processFrame(frameData, params) {
    // Convert frame data to OpenCV Mat and process
    // Similar to the processFrame method in analyzer.js
    // This runs in the worker thread
    
    return {
        frame: frameData.index,
        time: frameData.timestamp,
        contours: Math.random() * 50, // Placeholder
        variance: Math.random() * 100 + 50, // Placeholder
        phase_contour: Math.random() > 0.5 ? 'CHOLESTERIC' : 'ISOTROPIC',
        phase_variance: Math.random() > 0.5 ? 'CHOLESTERIC' : 'ISOTROPIC'
    };
}

async function loadOpenCV() {
    if (typeof cv !== 'undefined') {
        return;
    }
    
    // Load OpenCV.js in worker
    importScripts('https://docs.opencv.org/4.8.0/opencv.js');
    
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (typeof cv !== 'undefined' && cv.getBuildInformation) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}
