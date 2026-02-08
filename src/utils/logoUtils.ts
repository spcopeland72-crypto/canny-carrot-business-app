/**
 * Logo Utilities
 * 
 * Functions for processing and generating circular icons from business logos
 */

/**
 * Generate a circular icon from a base64 logo image
 * This creates a small, optimized circular icon suitable for use in QR codes and app displays
 * 
 * @param base64Logo - Base64 encoded logo image (data URI format)
 * @param size - Target size in pixels (default: 64x64, same as reward icons)
 * @returns Promise<string> - Base64 encoded circular icon or null if processing fails
 */
export const generateCircularIcon = async (
  base64Logo: string | null | undefined,
  size: number = 64
): Promise<string | null> => {
  if (!base64Logo) {
    return null;
  }

  try {
    // For web platform, use canvas to create circular icon
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              resolve(null);
              return;
            }
            
            // Create circular clipping path
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            
            // Draw and scale image to fill circle
            ctx.drawImage(img, 0, 0, size, size);
            
            // Convert to base64
            const circularIcon = canvas.toDataURL('image/png', 0.8);
            resolve(circularIcon);
          } catch (error) {
            console.error('[logoUtils] Error creating circular icon:', error);
            resolve(null);
          }
        };
        
        img.onerror = () => {
          console.error('[logoUtils] Error loading image for circular icon');
          resolve(null);
        };
        
        img.src = base64Logo;
      });
    }
    
    // For React Native, return the original logo (circular styling will be applied via CSS/View)
    // In a real implementation, you'd use react-native-image-manipulator or similar
    // For now, we'll return the original and apply circular styling in the component
    return base64Logo;
  } catch (error) {
    console.error('[logoUtils] Error generating circular icon:', error);
    return null;
  }
};

/**
 * Validate and optimize logo for QR code embedding
 * Ensures logo is small enough to not break QR code generation
 * 
 * @param base64Logo - Base64 encoded logo image
 * @param maxSizeBytes - Maximum size in bytes (default: 5000 bytes for QR code)
 * @returns Promise<string | null> - Optimized base64 logo or null if too large
 */
export const optimizeLogoForQRCode = async (
  base64Logo: string | null | undefined,
  maxSizeBytes: number = 5000
): Promise<string | null> => {
  if (!base64Logo) {
    return null;
  }

  try {
    // Check current size
    const currentSize = base64Logo.length;
    
    if (currentSize <= maxSizeBytes) {
      return base64Logo;
    }
    
    // If too large, generate a smaller circular icon
    console.log(`[logoUtils] Logo too large (${currentSize} bytes), generating smaller icon`);
    const circularIcon = await generateCircularIcon(base64Logo, 32); // Very small for QR code
    
    if (circularIcon && circularIcon.length <= maxSizeBytes) {
      return circularIcon;
    }
    
    // If still too large, return null (don't include in QR code)
    console.warn('[logoUtils] Logo still too large after optimization, excluding from QR code');
    return null;
  } catch (error) {
    console.error('[logoUtils] Error optimizing logo for QR code:', error);
    return null;
  }
};

/**
 * Get logo dimensions from base64 image
 * @param base64Logo - Base64 encoded logo image
 * @returns Promise<{width: number, height: number} | null>
 */
export const getLogoDimensions = async (
  base64Logo: string | null | undefined
): Promise<{width: number; height: number} | null> => {
  if (!base64Logo) {
    return null;
  }

  try {
    if (typeof window !== 'undefined') {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = base64Logo;
      });
    }
    
    return null;
  } catch (error) {
    console.error('[logoUtils] Error getting logo dimensions:', error);
    return null;
  }
};

/** Banner target size: 120px height, 400px width (for customer/business app headers). */
export const BANNER_WIDTH = 400;
export const BANNER_HEIGHT = 120;

/**
 * Resize/crop image to banner dimensions (400x120px) for use in customer and business apps.
 * On web uses canvas (cover-style crop); on native uses expo-image-manipulator when available.
 */
export const resizeToBanner = async (
  imageUriOrBase64: string | null | undefined
): Promise<string | null> => {
  if (!imageUriOrBase64) return null;
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = BANNER_WIDTH;
            canvas.height = BANNER_HEIGHT;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            const targetAspect = BANNER_WIDTH / BANNER_HEIGHT;
            const imgAspect = img.width / img.height;
            let sx: number, sy: number, sWidth: number, sHeight: number;
            if (imgAspect >= targetAspect) {
              sHeight = img.height;
              sWidth = img.height * targetAspect;
              sx = (img.width - sWidth) / 2;
              sy = 0;
            } else {
              sWidth = img.width;
              sHeight = img.width / targetAspect;
              sx = 0;
              sy = (img.height - sHeight) / 2;
            }
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, BANNER_WIDTH, BANNER_HEIGHT);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch (e) {
            console.error('[logoUtils] Banner resize error:', e);
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = imageUriOrBase64;
      });
    }
    // React Native: use expo-image-manipulator
    try {
      const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
      const result = await manipulateAsync(
        imageUriOrBase64,
        [{ resize: { width: BANNER_WIDTH, height: BANNER_HEIGHT } }],
        { base64: true, compress: 0.85, format: SaveFormat.JPEG }
      );
      if (result?.base64) {
        return `data:image/jpeg;base64,${result.base64}`;
      }
      if (result?.uri) return result.uri;
    } catch (_) {
      // Fallback: return as-is (e.g. web may use canvas above)
    }
    return imageUriOrBase64;
  } catch (error) {
    console.error('[logoUtils] Error resizing banner:', error);
    return null;
  }
};

/**
 * Crop a region from an image and resize to banner size (400x120).
 * Used when user selects a region in the banner crop modal.
 * @param imageUriOrBase64 - Full image
 * @param originX - Left of crop in image pixels
 * @param originY - Top of crop in image pixels
 * @param cropWidth - Width of crop in image pixels
 * @param cropHeight - Height of crop in image pixels
 */
export const cropBannerRegion = async (
  imageUriOrBase64: string,
  originX: number,
  originY: number,
  cropWidth: number,
  cropHeight: number
): Promise<string | null> => {
  if (!imageUriOrBase64 || cropWidth <= 0 || cropHeight <= 0) return null;
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = BANNER_WIDTH;
            canvas.height = BANNER_HEIGHT;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(
              img,
              Math.max(0, originX), Math.max(0, originY), cropWidth, cropHeight,
              0, 0, BANNER_WIDTH, BANNER_HEIGHT
            );
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch (e) {
            console.error('[logoUtils] cropBannerRegion error:', e);
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = imageUriOrBase64;
      });
    }
    try {
      const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
      const result = await manipulateAsync(
        imageUriOrBase64,
        [
          {
            crop: {
              originX: Math.round(originX),
              originY: Math.round(originY),
              width: Math.round(cropWidth),
              height: Math.round(cropHeight),
            },
          },
          { resize: { width: BANNER_WIDTH, height: BANNER_HEIGHT } },
        ],
        { base64: true, compress: 0.85, format: SaveFormat.JPEG }
      );
      if (result?.base64) return `data:image/jpeg;base64,${result.base64}`;
      if (result?.uri) return result.uri;
    } catch (_) {}
    return null;
  } catch (error) {
    console.error('[logoUtils] Error in cropBannerRegion:', error);
    return null;
  }
};






