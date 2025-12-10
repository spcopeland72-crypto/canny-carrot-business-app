import * as FileSystem from 'expo-file-system';

const getDataDir = () => {
  if (!FileSystem.documentDirectory) {
    console.warn('FileSystem.documentDirectory is not available');
    return null;
  }
  return `${FileSystem.documentDirectory}tmp/`;
};

const getProductsFile = () => {
  const dir = getDataDir();
  return dir ? `${dir}products.json` : null;
};

const getRewardsFile = () => {
  const dir = getDataDir();
  return dir ? `${dir}rewards.json` : null;
};

const getCampaignsFile = () => {
  const dir = getDataDir();
  return dir ? `${dir}campaigns.json` : null;
};

// Ensure data directory exists
const ensureDataDir = async () => {
  try {
    const dir = getDataDir();
    if (!dir) return false;
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, {intermediates: true});
    }
    return true;
  } catch (error) {
    console.error('Error ensuring data directory:', error);
    return false;
  }
};

// Products storage
export const saveProducts = async (products: string[]) => {
  try {
    const canWrite = await ensureDataDir();
    if (!canWrite) return;
    const file = getProductsFile();
    if (!file) return;
    await FileSystem.writeAsStringAsync(
      file,
      JSON.stringify(products, null, 2),
    );
  } catch (error) {
    console.error('Error saving products:', error);
  }
};

export const loadProducts = async (): Promise<string[]> => {
  try {
    const canRead = await ensureDataDir();
    if (!canRead) return [];
    const file = getProductsFile();
    if (!file) return [];
    const fileInfo = await FileSystem.getInfoAsync(file);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(file);
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
  return [];
};

// Rewards storage
export const saveRewards = async (rewards: any[]) => {
  try {
    const canWrite = await ensureDataDir();
    if (!canWrite) return;
    const file = getRewardsFile();
    if (!file) return;
    await FileSystem.writeAsStringAsync(
      file,
      JSON.stringify(rewards, null, 2),
    );
  } catch (error) {
    console.error('Error saving rewards:', error);
  }
};

export const loadRewards = async (): Promise<any[]> => {
  try {
    const canRead = await ensureDataDir();
    if (!canRead) return [];
    const file = getRewardsFile();
    if (!file) return [];
    const fileInfo = await FileSystem.getInfoAsync(file);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(file);
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading rewards:', error);
  }
  return [];
};

// Campaigns storage
export const saveCampaigns = async (campaigns: any[]) => {
  try {
    const canWrite = await ensureDataDir();
    if (!canWrite) return;
    const file = getCampaignsFile();
    if (!file) return;
    await FileSystem.writeAsStringAsync(
      file,
      JSON.stringify(campaigns, null, 2),
    );
  } catch (error) {
    console.error('Error saving campaigns:', error);
  }
};

export const loadCampaigns = async (): Promise<any[]> => {
  try {
    const canRead = await ensureDataDir();
    if (!canRead) return [];
    const file = getCampaignsFile();
    if (!file) return [];
    const fileInfo = await FileSystem.getInfoAsync(file);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(file);
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading campaigns:', error);
  }
  return [];
};

