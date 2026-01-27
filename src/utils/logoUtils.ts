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






