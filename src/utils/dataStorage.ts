// File system storage for rewards - saves to /tmp/rewards.json
// Uses Node.js fs when available, falls back to localStorage for web

// Safe environment detection
const isWeb = (() => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
})();

const isNode = (() => {
  try {
    return typeof process !== 'undefined' && 
           process.versions && 
           process.versions.node && 
           typeof require !== 'undefined';
  } catch {
    return false;
  }
})();

// Rewards file path
const REWARDS_FILE_PATH = '/tmp/rewards.json';

// Dynamically import fs only in Node environment - lazy load to prevent web errors
let fs: any = null;
let fsLoadAttempted = false;
const loadFs = () => {
  if (fs) return fs;
  if (fsLoadAttempted) return null;
  if (isNode) {
    try {
      fsLoadAttempted = true;
      fs = require('fs');
    } catch (e) {
      console.warn('fs module not available:', e);
      return null;
    }
  }
  return fs;
};

// Products storage - saves to /tmp/products.json
const PRODUCTS_FILE_PATH = '/tmp/products.json';

export const saveProducts = async (products: string[]): Promise<void> => {
  try {
    const fileSystem = loadFs();
    if (isNode && fileSystem) {
      // Ensure /tmp directory exists
      const tmpDir = '/tmp';
      try {
        if (!fileSystem.existsSync(tmpDir)) {
          fileSystem.mkdirSync(tmpDir, { recursive: true });
        }
        
        // Write products to file
        if (fileSystem.promises && fileSystem.promises.writeFile) {
          await fileSystem.promises.writeFile(
            PRODUCTS_FILE_PATH,
            JSON.stringify(products, null, 2),
            'utf8'
          );
        } else {
          fileSystem.writeFileSync(
            PRODUCTS_FILE_PATH,
            JSON.stringify(products, null, 2),
            'utf8'
          );
        }
        console.log(`✅ Products saved to ${PRODUCTS_FILE_PATH} (${products.length} products)`);
      } catch (fileError) {
        console.error('Error writing products to file system:', fileError);
        // Fallback to localStorage
        if (isWeb) {
          localStorage.setItem('canny_carrot_products', JSON.stringify(products));
          console.log('Products saved to localStorage (fallback)');
        }
      }
    } else if (isWeb) {
      // Fallback to localStorage for web
      localStorage.setItem('canny_carrot_products', JSON.stringify(products));
      console.log('Products saved to localStorage (web environment)');
    }
  } catch (error) {
    console.error('Error saving products:', error);
    // Final fallback to localStorage if available
    if (isWeb) {
      try {
        localStorage.setItem('canny_carrot_products', JSON.stringify(products));
        console.log('Products saved to localStorage (error fallback)');
      } catch (localError) {
        console.error('Error saving products to localStorage fallback:', localError);
      }
    }
  }
};

export const loadProducts = async (): Promise<string[]> => {
  try {
    const fileSystem = loadFs();
    if (isNode && fileSystem) {
      // Try to read from /tmp/products.json
      try {
        if (fileSystem.existsSync(PRODUCTS_FILE_PATH)) {
          let fileContent: string;
          if (fileSystem.promises && fileSystem.promises.readFile) {
            fileContent = await fileSystem.promises.readFile(PRODUCTS_FILE_PATH, 'utf8');
          } else {
            fileContent = fileSystem.readFileSync(PRODUCTS_FILE_PATH, 'utf8');
          }
          const products = JSON.parse(fileContent);
          console.log(`✅ Products loaded from ${PRODUCTS_FILE_PATH} (${products.length} products)`);
          return products;
        } else {
          console.log(`ℹ️ Products file not found at ${PRODUCTS_FILE_PATH}, returning empty array`);
          return [];
        }
      } catch (fileError) {
        console.error('Error reading products from file system:', fileError);
        // Fallback to localStorage
        if (isWeb) {
          const stored = localStorage.getItem('canny_carrot_products');
          if (stored) {
            return JSON.parse(stored);
          }
        }
      }
    } else if (isWeb) {
      // Fallback to localStorage for web
      const stored = localStorage.getItem('canny_carrot_products');
      if (stored) {
        const products = JSON.parse(stored);
        console.log(`Products loaded from localStorage (${products.length} products)`);
        return products;
      }
    }
  } catch (error) {
    console.error('Error loading products:', error);
    // Final fallback to localStorage if available
    if (isWeb) {
      try {
        const stored = localStorage.getItem('canny_carrot_products');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (localError) {
        console.error('Error loading products from localStorage fallback:', localError);
      }
    }
  }
  return [];
};

// Rewards storage - saves to /tmp/rewards.json
export interface Reward {
  id: string;
  name: string;
  count: number;
  total: number;
  icon: string;
  type: 'product' | 'action';
  requirement: number;
  rewardType: 'free_product' | 'discount' | 'other';
  selectedProducts?: string[];
  selectedActions?: string[];
  qrCode?: string; // QR code value for the reward
}

export const saveRewards = async (rewards: Reward[]): Promise<void> => {
  try {
    const fileSystem = loadFs();
    if (isNode && fileSystem) {
      // Ensure /tmp directory exists
      const tmpDir = '/tmp';
      try {
        if (!fileSystem.existsSync(tmpDir)) {
          fileSystem.mkdirSync(tmpDir, { recursive: true });
        }
        
        // Write rewards to file
        if (fileSystem.promises && fileSystem.promises.writeFile) {
          await fileSystem.promises.writeFile(
            REWARDS_FILE_PATH,
            JSON.stringify(rewards, null, 2),
            'utf8'
          );
        } else {
          // Fallback to synchronous write
          fileSystem.writeFileSync(
            REWARDS_FILE_PATH,
            JSON.stringify(rewards, null, 2),
            'utf8'
          );
        }
        console.log(`✅ Rewards saved to ${REWARDS_FILE_PATH} (${rewards.length} rewards)`);
      } catch (fileError) {
        console.error('Error writing to file system:', fileError);
        // Fallback to localStorage
        if (isWeb) {
          localStorage.setItem('canny_carrot_rewards', JSON.stringify(rewards));
          console.log('Rewards saved to localStorage (fallback)');
        }
      }
    } else if (isWeb) {
      // Fallback to localStorage for web
      localStorage.setItem('canny_carrot_rewards', JSON.stringify(rewards));
      console.log('Rewards saved to localStorage (web environment)');
    }
  } catch (error) {
    console.error('Error saving rewards:', error);
    // Final fallback to localStorage if available
    if (isWeb) {
      try {
        localStorage.setItem('canny_carrot_rewards', JSON.stringify(rewards));
        console.log('Rewards saved to localStorage (error fallback)');
      } catch (localError) {
        console.error('Error saving to localStorage fallback:', localError);
      }
    }
  }
};

export const loadRewards = async (): Promise<Reward[]> => {
  try {
    const fileSystem = loadFs();
    if (isNode && fileSystem) {
      // Try to read from /tmp/rewards.json
      try {
        if (fileSystem.existsSync(REWARDS_FILE_PATH)) {
          let fileContent: string;
          if (fileSystem.promises && fileSystem.promises.readFile) {
            fileContent = await fileSystem.promises.readFile(REWARDS_FILE_PATH, 'utf8');
          } else {
            // Fallback to synchronous read
            fileContent = fileSystem.readFileSync(REWARDS_FILE_PATH, 'utf8');
          }
          const rewards = JSON.parse(fileContent);
          console.log(`✅ Rewards loaded from ${REWARDS_FILE_PATH} (${rewards.length} rewards)`);
          return rewards;
        } else {
          console.log(`ℹ️ Rewards file not found at ${REWARDS_FILE_PATH}, returning empty array`);
          return [];
        }
      } catch (fileError) {
        console.error('Error reading from file system:', fileError);
        // Fallback to localStorage
        if (isWeb) {
          const stored = localStorage.getItem('canny_carrot_rewards');
          if (stored) {
            return JSON.parse(stored);
          }
        }
      }
    } else if (isWeb) {
      // Fallback to localStorage for web
      const stored = localStorage.getItem('canny_carrot_rewards');
      if (stored) {
        const rewards = JSON.parse(stored);
        console.log(`Rewards loaded from localStorage (${rewards.length} rewards)`);
        return rewards;
      }
    }
  } catch (error) {
    console.error('Error loading rewards:', error);
    // Final fallback to localStorage if available
    if (isWeb) {
      try {
        const stored = localStorage.getItem('canny_carrot_rewards');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (localError) {
        console.error('Error loading from localStorage fallback:', localError);
      }
    }
  }
  return [];
};

// Campaigns storage - saves to /tmp/campaigns.json
const CAMPAIGNS_FILE_PATH = '/tmp/campaigns.json';

export interface Campaign {
  id: string;
  name: string;
  count: number; // Current participants
  total: number; // Target participants
  icon: string;
  status: 'active' | 'upcoming' | 'completed' | 'Active' | 'Upcoming' | 'Ended';
  startDate?: string;
  endDate?: string;
  participants?: number; // Alias for count
}

export const saveCampaigns = async (campaigns: Campaign[]): Promise<void> => {
  try {
    const fileSystem = loadFs();
    if (isNode && fileSystem) {
      // Ensure /tmp directory exists
      const tmpDir = '/tmp';
      try {
        if (!fileSystem.existsSync(tmpDir)) {
          fileSystem.mkdirSync(tmpDir, { recursive: true });
        }
        
        // Write campaigns to file
        if (fileSystem.promises && fileSystem.promises.writeFile) {
          await fileSystem.promises.writeFile(
            CAMPAIGNS_FILE_PATH,
            JSON.stringify(campaigns, null, 2),
            'utf8'
          );
        } else {
          fileSystem.writeFileSync(
            CAMPAIGNS_FILE_PATH,
            JSON.stringify(campaigns, null, 2),
            'utf8'
          );
        }
        console.log(`✅ Campaigns saved to ${CAMPAIGNS_FILE_PATH} (${campaigns.length} campaigns)`);
      } catch (fileError) {
        console.error('Error writing campaigns to file system:', fileError);
        // Fallback to localStorage
        if (isWeb) {
          localStorage.setItem('canny_carrot_campaigns', JSON.stringify(campaigns));
          console.log('Campaigns saved to localStorage (fallback)');
        }
      }
    } else if (isWeb) {
      // Fallback to localStorage for web
      localStorage.setItem('canny_carrot_campaigns', JSON.stringify(campaigns));
      console.log('Campaigns saved to localStorage (web environment)');
    }
  } catch (error) {
    console.error('Error saving campaigns:', error);
    // Final fallback to localStorage if available
    if (isWeb) {
      try {
        localStorage.setItem('canny_carrot_campaigns', JSON.stringify(campaigns));
        console.log('Campaigns saved to localStorage (error fallback)');
      } catch (localError) {
        console.error('Error saving campaigns to localStorage fallback:', localError);
      }
    }
  }
};

export const loadCampaigns = async (): Promise<Campaign[]> => {
  try {
    const fileSystem = loadFs();
    if (isNode && fileSystem) {
      // Try to read from /tmp/campaigns.json
      try {
        if (fileSystem.existsSync(CAMPAIGNS_FILE_PATH)) {
          let fileContent: string;
          if (fileSystem.promises && fileSystem.promises.readFile) {
            fileContent = await fileSystem.promises.readFile(CAMPAIGNS_FILE_PATH, 'utf8');
          } else {
            fileContent = fileSystem.readFileSync(CAMPAIGNS_FILE_PATH, 'utf8');
          }
          const campaigns = JSON.parse(fileContent);
          console.log(`✅ Campaigns loaded from ${CAMPAIGNS_FILE_PATH} (${campaigns.length} campaigns)`);
          return campaigns;
        } else {
          console.log(`ℹ️ Campaigns file not found at ${CAMPAIGNS_FILE_PATH}, returning empty array`);
          return [];
        }
      } catch (fileError) {
        console.error('Error reading campaigns from file system:', fileError);
        // Fallback to localStorage
        if (isWeb) {
          const stored = localStorage.getItem('canny_carrot_campaigns');
          if (stored) {
            return JSON.parse(stored);
          }
        }
      }
    } else if (isWeb) {
      // Fallback to localStorage for web
      const stored = localStorage.getItem('canny_carrot_campaigns');
      if (stored) {
        const campaigns = JSON.parse(stored);
        console.log(`Campaigns loaded from localStorage (${campaigns.length} campaigns)`);
        return campaigns;
      }
    }
  } catch (error) {
    console.error('Error loading campaigns:', error);
    // Final fallback to localStorage if available
    if (isWeb) {
      try {
        const stored = localStorage.getItem('canny_carrot_campaigns');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (localError) {
        console.error('Error loading campaigns from localStorage fallback:', localError);
      }
    }
  }
  return [];
};
