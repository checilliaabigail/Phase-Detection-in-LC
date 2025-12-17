// worker.js - Web Worker untuk processing video
self.onmessage = async function(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'processFrame':
            const result = await processFrameWithOpenCV(data);
            self.postMessage({
                type: 'frameResult',
                data: result
            });
            break;
            
        case 'initialize':
            // Load OpenCV in worker
            await loadOpenCV();
            self.postMessage({ type: 'initialized' });
            break;
    }
};

async function loadOpenCV() {
    if (typeof cv !== 'undefined') {
        return;
    }
    
    // Import OpenCV in worker
    importScripts('https://docs.opencv.org/4.8.0/opencv.js');
    
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (typeof cv !== 'undefined' && cv.getBuildInformation) {
                clearInterval(checkInterval);
                console.log('OpenCV loaded in worker');
                resolve();
            }
        }, 100);
    });
}

async function processFrameWithOpenCV(data) {
    // Implementasi sama dengan method processFrameWithOpenCV di atas
    // Tapi di dalam worker thread
    return {
        frame_number: data.frameIndex,
        timestamp_seconds: data.timestamp,
        // ... hasil processing
    };
}
