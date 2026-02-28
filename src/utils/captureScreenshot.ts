/**
 * Capture a JPEG screenshot from a <video> element.
 * Creates a temporary off-screen canvas so the landmark overlay canvas is untouched.
 */
export function captureScreenshot(
  video: HTMLVideoElement,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (video.readyState < 2) {
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      0.85,
    );
  });
}
