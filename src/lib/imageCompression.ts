/**
 * Client-side photo compression using HTML5 Canvas
 * Reduces smartphone photos (3MB-8MB) down to clean WebP/JPEG (<150KB)
 * to conserve Supabase Free Tier storage (1GB limit) and WhatsApp bandwidth.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/jpeg' | 'image/webp';
}

export async function compressImage(
  fileOrBlob: File | Blob,
  options: CompressionOptions = {}
): Promise<{ file: Blob; dataUrl: string; originalSize: number; compressedSize: number }> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.75,
    mimeType = 'image/jpeg',
  } = options;

  const originalSize = fileOrBlob.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        // Draw image with smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed blob and data URL
        const dataUrl = canvas.toDataURL(mimeType, quality);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas blob generation failed'));
              return;
            }
            resolve({
              file: blob,
              dataUrl,
              originalSize,
              compressedSize: blob.size,
            });
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image data'));
    reader.readAsDataURL(fileOrBlob);
  });
}
