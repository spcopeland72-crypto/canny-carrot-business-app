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
 * Format: REWARD:{id}:{name}:{requirement}:{rewardType}:{products}
 */
export const generateRewardQRCode = (
  id: string,
  name: string,
  requirement: number,
  rewardType: 'free_product' | 'discount' | 'other',
  products?: string[]
): string => {
  const productsValue = products && products.length > 0
    ? products.join(',')
    : '';
  return `REWARD:${id}:${name}:${requirement}:${rewardType}:${productsValue}`;
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











