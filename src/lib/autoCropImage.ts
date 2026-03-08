/**
 * Auto-crops an image by removing uniform-colored borders (e.g. desk/table background).
 * Returns a new base64 data URL of the cropped image.
 */
export function autoCropImage(dataUrl: string, threshold = 30, margin = 10): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;

      const getPixel = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return [data[i], data[i + 1], data[i + 2]];
      };

      // Sample corner colors to determine background
      const corners = [
        getPixel(0, 0),
        getPixel(width - 1, 0),
        getPixel(0, height - 1),
        getPixel(width - 1, height - 1),
      ];
      const bg = corners.reduce(
        (acc, c) => [acc[0] + c[0] / 4, acc[1] + c[1] / 4, acc[2] + c[2] / 4],
        [0, 0, 0]
      );

      const isBg = (x: number, y: number) => {
        const p = getPixel(x, y);
        return (
          Math.abs(p[0] - bg[0]) < threshold &&
          Math.abs(p[1] - bg[1]) < threshold &&
          Math.abs(p[2] - bg[2]) < threshold
        );
      };

      // Scan inward from each edge
      let top = 0, bottom = height - 1, left = 0, right = width - 1;
      const step = 3; // check every 3rd pixel for speed

      // Top
      outer: for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x += step) {
          if (!isBg(x, y)) { top = y; break outer; }
        }
      }
      // Bottom
      outer2: for (let y = height - 1; y >= top; y--) {
        for (let x = 0; x < width; x += step) {
          if (!isBg(x, y)) { bottom = y; break outer2; }
        }
      }
      // Left
      outer3: for (let x = 0; x < width; x++) {
        for (let y = top; y <= bottom; y += step) {
          if (!isBg(x, y)) { left = x; break outer3; }
        }
      }
      // Right
      outer4: for (let x = width - 1; x >= left; x--) {
        for (let y = top; y <= bottom; y += step) {
          if (!isBg(x, y)) { right = x; break outer4; }
        }
      }

      // Add margin
      top = Math.max(0, top - margin);
      left = Math.max(0, left - margin);
      bottom = Math.min(height - 1, bottom + margin);
      right = Math.min(width - 1, right + margin);

      const cropW = right - left + 1;
      const cropH = bottom - top + 1;

      // Only crop if we actually removed something meaningful (>5% per side)
      const minCrop = 0.05;
      if (
        top / height < minCrop &&
        left / width < minCrop &&
        (height - bottom) / height < minCrop &&
        (width - right) / width < minCrop
      ) {
        resolve(dataUrl); // No meaningful crop
        return;
      }

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext("2d")!;
      cropCtx.drawImage(img, left, top, cropW, cropH, 0, 0, cropW, cropH);

      resolve(cropCanvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

/** Converts a base64 data URL to a File */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
