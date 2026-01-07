/**
 * Shared QR Code Utilities
 * 
 * This module provides consistent QR code generation and parsing
 * for reward codes, campaign codes, and business codes.
 * 
 * Formats:
 * - Reward: REWARD:{id}:{name}:{requirement}:{rewardType}:{products}
 * - Company: COMPANY:{number}:{name}
 * - Campaign: CAMPAIGN:{id}:{name}:{description}
 */

export interface ParsedRewardQR {
  id: string;
  name: string;
  requirement: number;
  rewardType: string;
  products: string[];
}

export interface ParsedCompanyQR {
  number: string;
  name: string;
}

export interface ParsedCampaignQR {
  id: string;
  name: string;
  description: string;
}

export type ParsedQR = 
  | { type: 'reward'; data: ParsedRewardQR }
  | { type: 'company'; data: ParsedCompanyQR }
  | { type: 'campaign'; data: ParsedCampaignQR }
  | { type: 'unknown'; data: null };

/**
 * Generate QR code for a reward
 * Format: JSON string containing reward details + business profile data + PIN
 */
export const generateRewardQRCode = (
  id: string,
  name: string,
  requirement: number,
  rewardType: 'free_product' | 'discount' | 'other',
  products?: string[],
  actions?: string[],
  pinCode?: string,
  businessProfile?: {
    name: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string; // Business logo/icon URL or base64
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      tiktok?: string;
      linkedin?: string;
    };
  },
  pointsPerPurchase?: number // Points allocated per purchase/action
): string => {
  const qrData = {
    type: 'reward',
    reward: {
      id,
      name,
      requirement,
      pointsPerPurchase: pointsPerPurchase || 1, // Default to 1 point per transaction
      rewardType,
      products: products || [],
      actions: actions || [],
      pinCode: pinCode || '',
    },
    business: businessProfile ? {
      name: businessProfile.name,
      address: businessProfile.address || 
        [businessProfile.addressLine1, businessProfile.addressLine2, businessProfile.city, businessProfile.postcode, businessProfile.country]
          .filter(Boolean)
          .join(', '),
      phone: businessProfile.phone || '',
      email: businessProfile.email || '',
      website: businessProfile.website || '',
      // Note: Logo is NOT included in QR code to keep data size manageable
      // QR codes have limited capacity (~2,953 bytes max), and base64 images are too large
      // Logo is stored separately in business profile and can be displayed from there
      // logo: businessProfile.logo || '', // Excluded to prevent QR code data overflow
      socialMedia: businessProfile.socialMedia || {},
    } : undefined,
    version: '1.0',
    createdAt: new Date().toISOString(),
  };
  
  const qrCodeString = JSON.stringify(qrData);
  
  // Validate QR code size before returning
  // QR codes have limited capacity:
  // - Version 1-10: ~100-500 bytes
  // - Version 40 (max): ~2,953 bytes for alphanumeric
  // We'll use a conservative limit of 2000 bytes to ensure reliability
  const MAX_QR_SIZE = 2000;
  if (qrCodeString.length > MAX_QR_SIZE) {
    console.error(`[qrCodeUtils] QR code too large: ${qrCodeString.length} bytes (max: ${MAX_QR_SIZE})`);
    // Remove optional fields to reduce size
    const minimalQrData = {
      type: 'reward',
      reward: {
        id,
        name: name.substring(0, 50), // Truncate name if too long
        requirement,
        pointsPerPurchase: pointsPerPurchase || 1,
        rewardType,
        products: (products || []).slice(0, 5), // Limit products
        actions: (actions || []).slice(0, 5), // Limit actions
        pinCode: pinCode || '',
      },
      business: businessProfile ? {
        name: businessProfile.name.substring(0, 50), // Truncate business name
        // Remove address, phone, email, website to reduce size
      } : undefined,
      version: '1.0',
    };
    
    const minimalQrString = JSON.stringify(minimalQrData);
    if (minimalQrString.length > MAX_QR_SIZE) {
      throw new Error(`QR code data too large (${qrCodeString.length} bytes). Please reduce reward information (shorter name, fewer products, etc.).`);
    }
    
    console.warn(`[qrCodeUtils] QR code reduced from ${qrCodeString.length} to ${minimalQrString.length} bytes`);
    return minimalQrString;
  }
  
  return qrCodeString;
};

/**
 * Generate QR code for a company/business
 * Format: COMPANY:{number}:{name}
 * Number should be 7 digits (0000001-1000000)
 */
export const generateCompanyQRCode = (
  businessNumber: string | number,
  name: string
): string => {
  // Ensure number is 7 digits
  const numberStr = typeof businessNumber === 'number'
    ? businessNumber.toString().padStart(7, '0')
    : businessNumber.padStart(7, '0');
  return `COMPANY:${numberStr}:${name}`;
};

/**
 * Generate QR code for a campaign
 * Format: CAMPAIGN:{id}:{name}:{description}
 */
export const generateCampaignQRCode = (
  id: string,
  name: string,
  description: string = ''
): string => {
  return `CAMPAIGN:${id}:${name}:${description}`;
};

/**
 * Parse QR code - handles REWARD, COMPANY, and CAMPAIGN formats
 */
export const parseQRCode = (qrValue: string): ParsedQR => {
  if (!qrValue || typeof qrValue !== 'string') {
    return { type: 'unknown', data: null };
  }
  
  const normalizedQr = qrValue.trim();
  
  // Handle COMPANY QR codes (business QR codes)
  if (normalizedQr.startsWith('COMPANY:')) {
    const parts = normalizedQr.split(':');
    if (parts.length >= 3) {
      return {
        type: 'company',
        data: {
          number: parts[1] || '',
          name: parts.slice(2).join(':') || 'Business',
        },
      };
    }
    return { type: 'unknown', data: null };
  }
  
  // Handle CAMPAIGN QR codes
  if (normalizedQr.startsWith('CAMPAIGN:')) {
    const parts = normalizedQr.split(':');
    if (parts.length >= 3) {
      return {
        type: 'campaign',
        data: {
          id: parts[1] || '',
          name: parts[2] || 'Campaign',
          description: parts.slice(3).join(':') || '',
        },
      };
    }
    return { type: 'unknown', data: null };
  }
  
  // Handle REWARD QR codes
  if (normalizedQr.startsWith('REWARD:')) {
    const withoutPrefix = normalizedQr.substring(7); // Remove 'REWARD:'
    const parts = withoutPrefix.split(':');
    
    if (parts.length < 2) {
      return { type: 'unknown', data: null };
    }
    
    if (parts.length >= 5) {
      // Full format: {id}:{name}:{requirement}:{rewardType}:{products}
      const id = parts[0] || 'unknown';
      const productsStr = parts[parts.length - 1] || '';
      const rewardType = parts[parts.length - 2] || 'free_product';
      const requirement = parseInt(parts[parts.length - 3], 10) || 1;
      // Everything between id and requirement is the name
      const name = parts.slice(1, parts.length - 3).join(':') || 'Unnamed Reward';
      const products = productsStr ? productsStr.split(',').filter(p => p.trim()) : [];
      
      return {
        type: 'reward',
        data: {
          id,
          name,
          requirement,
          rewardType,
          products,
        },
      };
    } else {
      // Minimal format: {id}:{name} (or {id}:{name}:{requirement} etc.)
      const id = parts[0] || 'unknown';
      const name = parts.slice(1).join(':') || 'Unnamed Reward';
      
      return {
        type: 'reward',
        data: {
          id,
          name,
          requirement: 1,
          rewardType: 'free_product',
          products: [],
        },
      };
    }
  }
  
  return { type: 'unknown', data: null };
};

/**
 * Check if QR code is valid (starts with known prefix)
 */
export const isValidQRCode = (qrValue: string): boolean => {
  if (!qrValue || typeof qrValue !== 'string') {
    return false;
  }
  const normalized = qrValue.trim();
  return normalized.startsWith('REWARD:') || 
         normalized.startsWith('COMPANY:') || 
         normalized.startsWith('CAMPAIGN:');
};











