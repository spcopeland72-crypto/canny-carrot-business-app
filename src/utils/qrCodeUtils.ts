/**
 * Shared QR Code Utilities
 * 
 * This module provides consistent QR code generation and parsing
 * for reward codes, campaign codes, and business codes.
 * 
 * Formats:
 * - Reward: REWARD:{businessId}:{businessName}:{id}:{name}:{requirement}:{rewardType}:{products}:{pinCode}
 * - Company: COMPANY:{number}:{name}
 * - Campaign: CAMPAIGN:{id}:{name}:{description}
 * - Campaign item: CAMPAIGN_ITEM:{businessId}:{businessName}:{campaignName}:{itemType}:{itemName}:{startDate}:{endDate}
 */

export interface ParsedRewardQR {
  businessId?: string;
  id: string;
  name: string;
  requirement: number;
  rewardType: string;
  products: string[];
  pinCode?: string;
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
 * Format: REWARD:{businessId}:{businessName}:{id}:{name}:{requirement}:{rewardType}:{products}:{pinCode}
 */
export const generateRewardQRCode = (
  id: string,
  name: string,
  requirement: number,
  rewardType: 'free_product' | 'discount' | 'other',
  products?: string[],
  actions?: string[],
  pinCode?: string,
  businessProfile?: any,
  pointsPerPurchase?: number,
  businessId?: string
): string => {
  const productsValue = products && products.length > 0
    ? products.join(',')
    : '';
  const pinCodeValue = pinCode || '';
  const businessIdValue = businessId || '';
  const businessNameValue = (businessProfile?.name ?? '')
    .replace(/:/g, '-')
    .trim() || '';
  return `REWARD:${businessIdValue}:${businessNameValue}:${id}:${name}:${requirement}:${rewardType}:${productsValue}:${pinCodeValue}`;
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
 * Generate QR code for a campaign product or action.
 * Each QR embeds ALL campaign data (all products + all actions) so the customer app
 * can store it locally on first scan. Delimiter || for lists; names must not contain ||.
 * Format: CAMPAIGN_ITEM:{businessId}:{businessName}:{campaignName}:{itemType}:{itemName}:{startDate}:{endDate}:{productsPart}:{actionsPart}
 */
export const generateCampaignItemQRCode = (
  businessId: string,
  businessName: string,
  campaignName: string,
  itemType: 'product' | 'action',
  itemName: string,
  startDate: string,
  endDate: string,
  allProducts?: string[],
  allActions?: string[]
): string => {
  const safe = (s: string) => (s ?? '').replace(/:/g, '-').trim();
  const safeBusinessName = safe(businessName ?? '');
  const safeCampaignName = safe(campaignName);
  const safeItemName = safe(itemName);
  const productsPart = (allProducts && allProducts.length > 0) ? allProducts.join('||') : '';
  const actionsPart = (allActions && allActions.length > 0) ? allActions.join('||') : '';
  return `CAMPAIGN_ITEM:${businessId}:${safeBusinessName}:${safeCampaignName}:${itemType}:${safeItemName}:${startDate}:${endDate}:${productsPart}:${actionsPart}`;
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
  // Format: REWARD:{businessId}:{id}:{name}:{requirement}:{rewardType}:{products}:{pinCode}
  if (normalizedQr.startsWith('REWARD:')) {
    const withoutPrefix = normalizedQr.substring(7); // Remove 'REWARD:'
    const parts = withoutPrefix.split(':');
    
    if (parts.length >= 7) {
      // Format with businessId and PIN: {businessId}:{id}:{name}:{requirement}:{rewardType}:{products}:{pinCode}
      const businessId = parts[0] || '';
      const id = parts[1] || 'unknown';
      const pinCode = parts[parts.length - 1] || '';
      const productsStr = parts[parts.length - 2] || '';
      const rewardType = parts[parts.length - 3] || 'free_product';
      const requirement = parseInt(parts[parts.length - 4], 10) || 1;
      // Everything between id and requirement is the name
      const name = parts.slice(2, parts.length - 4).join(':') || 'Unnamed Reward';
      const products = productsStr ? productsStr.split(',').filter(p => p.trim()) : [];
      
      return {
        type: 'reward',
        data: {
          businessId,
          id,
          name,
          requirement,
          rewardType,
          products,
          pinCode,
        },
      };
    }
    
    // Invalid format
    return { type: 'unknown', data: null };
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
