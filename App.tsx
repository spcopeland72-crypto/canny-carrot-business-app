import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Platform, Linking, Alert} from 'react-native';

// Suppress React Native Web touch responder warnings and runtime errors (harmless but noisy)
if (Platform.OS === 'web' && typeof console !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args: any[]) => {
    // Filter out React Native Web touch responder warnings
    if (args[0] && typeof args[0] === 'string' && args[0].includes('recordTouchEnd')) {
      return; // Suppress this specific warning
    }
    originalWarn.apply(console, args);
  };
  
  console.error = (...args: any[]) => {
    // Filter out React Native runtime internal errors
    const errorMsg = args[0]?.toString() || '';
    if (errorMsg.includes('Continuum assignment failed') || 
        errorMsg.includes('[Background] Continuum')) {
      return; // Suppress React Native internal errors
    }
    originalError.apply(console, args);
  };
}
import HomeScreen from './src/components/HomeScreen';
import CustomersPage from './src/components/CustomersPage';
import AddEditCustomerPage from './src/components/AddEditCustomerPage';
import RewardsManagementPage from './src/components/RewardsManagementPage';
import CreateEditRewardPage from './src/components/CreateEditRewardPage';
import CampaignsPage from './src/components/CampaignsPage';
import BusinessProfilePage from './src/components/BusinessProfilePage';
import SearchPage from './src/components/SearchPage';
import RewardsPage from './src/components/RewardsPage';
import ScanPage from './src/components/ScanPage';
import HelpPage from './src/components/HelpPage';
import MorePage from './src/components/MorePage';
import ChatPage from './src/components/ChatPage';
import ScanModal from './src/components/ScanModal';
import LoginPage from './src/components/LoginPage';
import type {ScreenName} from './src/types';
import {saveRewards, loadRewards, saveCampaigns, loadCampaigns, type Reward, type Campaign} from './src/utils/dataStorage';
import {generateRewardQRCode} from './src/utils/qrCodeUtils';
import {isAuthenticated, getStoredAuth} from './src/services/authService';
import {rewardsRepository, campaignsRepository, customersRepository} from './src/services/localRepository';
// CRITICAL: No automatic daily sync - Redis only accessed on login/logout, create/submit, or manual sync
import {dumpRepository} from './src/utils/dumpRepository';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Home');
  const [previousScreen, setPreviousScreen] = useState<ScreenName | null>(null);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Loading while checking auth
  const [isAuthenticatedState, setIsAuthenticatedState] = useState<boolean | null>(null);
  const [initialInvitationUrl, setInitialInvitationUrl] = useState<string | undefined>(undefined);
  
  // Rewards state management - will be loaded from file or use initial values
  const [rewards, setRewards] = useState<Reward[]>([]);
  
  // Campaigns state management - will be loaded from file or use initial values
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Helper function to generate QR code for a reward using shared utility
  const generateQRCode = (reward: Reward): string => {
    return generateRewardQRCode(
      reward.id,
      reward.name,
      reward.requirement,
      reward.rewardType || 'free_product',
      reward.selectedProducts
    );
  };

  // Helper function to ensure all rewards have QR codes
  const ensureRewardsHaveQRCodes = (rewardsList: Reward[]): Reward[] => {
    return rewardsList.map(reward => ({
      ...reward,
      qrCode: reward.qrCode || generateQRCode(reward),
    }));
  };

  // Initial rewards for fallback - with QR codes generated in full format
  // Format: REWARD:{id}:{name}:{requirement}:{rewardType}:{products}
  const initialRewards: Reward[] = [
    {id: '1', name: 'Buy 10 Get 1 Free', count: 8, total: 10, icon: '🎁', type: 'product', requirement: 10, rewardType: 'free_product', qrCode: 'REWARD:1:Buy 10 Get 1 Free:10:free_product:'},
    {id: '2', name: 'Write Review Reward', count: 7, total: 10, icon: '⭐', type: 'action', requirement: 1, rewardType: 'free_product', qrCode: 'REWARD:2:Write Review Reward:1:free_product:'},
    {id: '3', name: 'Social Share Bonus', count: 9, total: 10, icon: '📱', type: 'action', requirement: 1, rewardType: 'free_product', qrCode: 'REWARD:3:Social Share Bonus:1:free_product:'},
    {id: '4', name: 'Referral Program', count: 5, total: 10, icon: '👥', type: 'action', requirement: 1, rewardType: 'free_product', qrCode: 'REWARD:4:Referral Program:1:free_product:'},
    {id: '5', name: 'Loyalty Points', count: 6, total: 10, icon: '💎', type: 'product', requirement: 10, rewardType: 'free_product', qrCode: 'REWARD:5:Loyalty Points:10:free_product:'},
    {id: '6', name: 'Birthday Bonus', count: 4, total: 10, icon: '🎂', type: 'action', requirement: 1, rewardType: 'free_product', qrCode: 'REWARD:6:Birthday Bonus:1:free_product:'},
  ];

  // Initial campaigns for fallback
  const initialCampaigns: Campaign[] = [
    {id: '1', name: 'Christmas Special', count: 120, total: 200, icon: '🎄', status: 'active'},
    {id: '2', name: 'New Year Promotion', count: 0, total: 150, icon: '🎆', status: 'upcoming'},
    {id: '3', name: 'Valentine\'s Campaign', count: 89, total: 100, icon: '💝', status: 'completed'},
    {id: '4', name: 'Spring Sale', count: 45, total: 100, icon: '🌸', status: 'active'},
  ];

  // Always show login screen on start (for testing different business IDs)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Always start with login screen - clear auth state
        setIsAuthenticatedState(false);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticatedState(false);
        setIsLoading(false);
      }
    };

    checkAuth();

    // Handle deep links for invitation URLs
    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes('invite')) {
        setInitialInvitationUrl(event.url);
      }
    };
    
    // Check initial URL (if app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('invite')) {
        setInitialInvitationUrl(url);
      }
    });
    
    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle successful login - load data from local repository
  const handleLoginSuccess = async () => {
    try {
      const authenticated = await isAuthenticated();
      setIsAuthenticatedState(authenticated);
      
      if (authenticated) {
        const auth = await getStoredAuth();
        if (auth?.businessId) {
          // Small delay to ensure repository write operations from login are complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Load data from local repository (single source of truth)
          try {
            console.log('📥 [App] Loading rewards from repository after login...');
            const loadedRewards = await rewardsRepository.getActive(); // Only load active rewards
            console.log(`📊 [App] Found ${loadedRewards?.length || 0} active rewards in repository`);
            
            if (loadedRewards && loadedRewards.length > 0) {
              // Rewards are already in app format from repository - just ensure QR codes
              const rewardsWithQRCodes = ensureRewardsHaveQRCodes(loadedRewards);
              setRewards(rewardsWithQRCodes);
              console.log(`✅ [App] Loaded ${loadedRewards.length} rewards from repository (already in app format)`);
              console.log('📦 [App] Loaded rewards:', loadedRewards.map(r => ({ id: r.id, name: r.name, total: r.total, count: r.count })));
            } else {
              console.log('ℹ️ [App] No rewards found in local repository');
              console.log('⚠️ [App] DUMPING REPOSITORY TO DEBUG...');
              await dumpRepository();
              setRewards([]);
            }
            
            console.log('📥 [App] Loading campaigns from repository after login...');
            const loadedCampaigns = await campaignsRepository.getAll();
            console.log(`📊 [App] Found ${loadedCampaigns?.length || 0} campaigns in repository`);
            
            if (loadedCampaigns && loadedCampaigns.length > 0) {
              setCampaigns(loadedCampaigns);
              console.log(`✅ [App] Loaded ${loadedCampaigns.length} campaigns from local repository`);
            } else {
              console.log('ℹ️ [App] No campaigns found in local repository');
              setCampaigns([]);
            }
          } catch (repoError) {
            console.error('❌ [App] Error loading data from repository:', repoError);
            setRewards([]);
            setCampaigns([]);
          }
          
          // CRITICAL: Do NOT start automatic daily sync
          // Redis should only be accessed on login/logout, create/submit, or manual sync
          // No automatic sync intervals allowed
        }
      }
    } catch (error) {
      console.error('❌ [App] Error after login:', error);
      setIsAuthenticatedState(false);
    }
  };

  // Data is now loaded from localRepository after login (in handleLoginSuccess)

  // LOGIN SUCCESS HANDLER ARCHIVED - Login functionality disabled
  // const handleLoginSuccess = async () => {
  //   // Function archived - login functionality disabled
  // };

  const handleAddReward = async (rewardData: {
    name: string;
    type: 'product' | 'action';
    requirement: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
    pinCode?: string;
    qrCode?: string;
  }) => {
    const icons = ['🎁', '⭐', '📱', '👥', '💎', '🎂', '🎉', '🏆', '🎯', '🎊'];
    const rewardId = Date.now().toString();
    // Use QR code from rewardData if provided, otherwise generate one with the actual reward ID
    let qrCode = rewardData.qrCode;
    if (!qrCode) {
      // Generate QR code using shared utility
      qrCode = generateRewardQRCode(
        rewardId,
        rewardData.name,
        rewardData.requirement,
        rewardData.rewardType,
        rewardData.selectedProducts
      );
    } else {
      // Update ID in existing QR code if needed
      const parts = qrCode.split(':');
      if (parts.length >= 2 && parts[0] === 'REWARD') {
        parts[1] = rewardId; // Update ID
        qrCode = parts.join(':');
      }
    }
    
    const newReward: Reward = {
      id: rewardId,
      name: rewardData.name,
      count: 0,
      total: rewardData.requirement,
      icon: icons[Math.floor(Math.random() * icons.length)],
      type: rewardData.type,
      requirement: rewardData.requirement,
      rewardType: rewardData.rewardType,
      selectedProducts: rewardData.selectedProducts,
      selectedActions: rewardData.selectedActions,
      pinCode: rewardData.pinCode, // Save PIN code in reward record
      qrCode: qrCode, // Save QR code in reward record
    };
    const updatedRewards = [...rewards, newReward];
    setRewards(updatedRewards);
    
    // Save to local repository (source of truth) - this marks as dirty
    console.log(`💾 [App] Saving new reward "${newReward.name}" to local repository...`);
    await rewardsRepository.save(newReward);
    
    // Mark repository as having unsynced changes
    const { updateSyncMetadata } = await import('./src/services/localRepository');
    await updateSyncMetadata({ hasUnsyncedChanges: true });
    console.log(`✅ [App] Reward saved to local repository and marked as dirty`);
    
    // IMPORTANT: Immediately sync to Redis so it's available on other devices
    try {
      const auth = await getStoredAuth();
      if (auth?.businessId) {
        console.log(`🔄 [App] Immediately syncing reward to Redis...`);
        const { performDailySync } = await import('./src/services/dailySyncService');
        await performDailySync(auth.businessId);
        console.log(`✅ [App] Reward synced to Redis - should now appear on other devices`);
      }
    } catch (syncError) {
      console.error('❌ [App] Failed to immediately sync reward to Redis:', syncError);
      // Don't fail reward creation if sync fails - it will retry on daily sync
    }
    
    // Also save to legacy storage for backward compatibility
    saveRewards(updatedRewards);
  };

  const handleUpdateReward = async (rewardId: string, rewardData: {
    name: string;
    type: 'product' | 'action';
    requirement: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
    pinCode?: string;
    qrCode?: string;
  }) => {
    const updatedRewards = rewards.map(r => 
      r.id === rewardId 
        ? {...r, ...rewardData, total: rewardData.requirement, qrCode: rewardData.qrCode || r.qrCode}
        : r
    );
    setRewards(updatedRewards);
    saveRewards(updatedRewards);
  };

  const handleDeleteReward = async (rewardId: string) => {
    const updatedRewards = rewards.filter(r => r.id !== rewardId);
    setRewards(updatedRewards);
    // Delete from local repository (source of truth)
    await rewardsRepository.delete(rewardId);
    // Also save to legacy storage for backward compatibility
    saveRewards(updatedRewards);
  };

  const handleAddCampaign = async (campaignData: {
    name: string;
    type: 'product' | 'action';
    requirement: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
  }) => {
    const icons = ['🎄', '🎆', '💝', '🌸', '🎃', '🎁', '🎉', '🏆', '🎯', '🎊', '🌟', '⭐'];
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: campaignData.name,
      count: 0,
      total: campaignData.requirement,
      icon: icons[Math.floor(Math.random() * icons.length)],
      status: 'upcoming',
    };
    const updatedCampaigns = [...campaigns, newCampaign];
    setCampaigns(updatedCampaigns);
    // Save to local repository (source of truth)
    await campaignsRepository.save(newCampaign);
    // Also save to legacy storage for backward compatibility
    saveCampaigns(updatedCampaigns);
  };

  const handleUpdateCampaign = async (campaignId: string, campaignData: {
    name: string;
    type: 'product' | 'action';
    requirement: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
  }) => {
    const updatedCampaigns = campaigns.map(c => 
      c.id === campaignId 
        ? {...c, name: campaignData.name, total: campaignData.requirement}
        : c
    );
    setCampaigns(updatedCampaigns);
    // Save to local repository (source of truth)
    const updatedCampaign = updatedCampaigns.find(c => c.id === campaignId);
    if (updatedCampaign) {
      await campaignsRepository.save(updatedCampaign);
    }
    // Also save to legacy storage for backward compatibility
    saveCampaigns(updatedCampaigns);
  };

  // Campaign delete - REUSED from rewards delete code (identical data elements)
  const handleDeleteCampaign = async (campaignId: string) => {
    const updatedCampaigns = campaigns.filter(c => c.id !== campaignId);
    setCampaigns(updatedCampaigns);
    // Delete from local repository (source of truth)
    await campaignsRepository.delete(campaignId);
    // Also save to legacy storage for backward compatibility
    saveCampaigns(updatedCampaigns);
  };

  // Reload rewards from repository
  const reloadRewards = async () => {
    try {
      const loadedRewards = await rewardsRepository.getActive(); // Only load active rewards
      if (loadedRewards && loadedRewards.length > 0) {
        // Rewards are already in app format - just ensure QR codes
        const rewardsWithQRCodes = ensureRewardsHaveQRCodes(loadedRewards);
        setRewards(rewardsWithQRCodes);
        console.log(`✅ [App] Reloaded ${loadedRewards.length} rewards from repository`);
      } else {
        setRewards([]);
        console.log('ℹ️ [App] No rewards in repository');
      }
    } catch (error) {
      console.error('❌ [App] Error reloading rewards:', error);
    }
  };

  const handleNavigate = async (screen: ScreenName) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
    
    // Reload rewards when navigating to Home to ensure carousel is up-to-date
    if (screen === 'Home') {
      console.log('🏠 [App] Navigating to Home - reloading rewards from repository...');
      await reloadRewards();
      
      // Also reload campaigns
      try {
        const loadedCampaigns = await campaignsRepository.getAll();
        if (loadedCampaigns && loadedCampaigns.length > 0) {
          setCampaigns(loadedCampaigns);
          console.log(`✅ [App] Reloaded ${loadedCampaigns.length} campaigns for Home screen`);
        } else {
          setCampaigns([]);
          console.log('ℹ️ [App] No campaigns found in repository');
        }
      } catch (error) {
        console.error('❌ [App] Error reloading campaigns:', error);
      }
    }
  };

  const handleBack = () => {
    if (previousScreen) {
      setCurrentScreen(previousScreen);
      setPreviousScreen(null);
    } else {
      setCurrentScreen('Home');
    }
  };

  const handleScanPress = () => {
    setScanModalVisible(true);
  };

  const handleLogout = async () => {
    try {
      const { logoutBusiness } = await import('./src/services/authService');
      await logoutBusiness();
      console.log('✅ Logged out - returning to login screen');
    } catch (error) {
      console.error('Error logging out:', error);
      // Continue with logout even if logoutBusiness fails
    } finally {
      // Always update state to show login screen, even if logoutBusiness fails
      setIsAuthenticatedState(false);
      setCurrentScreen('Home');
    }
  };

  const handleBarcodeScanned = (data: string, type: string) => {
    console.log('QR Code Scanned:', data, type);
    setScanModalVisible(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show login page if not authenticated
  if (isAuthenticatedState === null || isAuthenticatedState === false) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        console.log('[App] Rendering HomeScreen with rewards:', {
          rewardsCount: rewards.length,
          rewards: rewards.map(r => ({ id: r.id, name: r.name })),
          campaignsCount: campaigns.length,
        });
        return (
          <HomeScreen
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onScanPress={handleScanPress}
            onLogout={handleLogout}
            rewards={rewards}
            campaigns={campaigns}
          />
        );
      case 'Search':
        return (
          <SearchPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'Rewards':
        return (
          <RewardsPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
            rewards={rewards}
            onDeleteReward={handleDeleteReward}
          />
        );
      case 'Scan':
        return (
          <ScanPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'Help':
        return (
          <HelpPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'More':
        return (
          <MorePage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'Chat':
        return (
          <ChatPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'Customers':
        return (
          <CustomersPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'AddCustomer':
        return (
          <AddEditCustomerPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'Business':
        return (
          <BusinessProfilePage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'AllRewards':
        return (
          <RewardsManagementPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'CreateReward':
        return (
          <CreateEditRewardPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
            onSave={handleAddReward}
          />
        );
      case 'AllCampaigns':
        return (
          <CampaignsPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
            campaigns={campaigns}
            onDeleteCampaign={handleDeleteCampaign}
          />
        );
      case 'CreateCampaign':
        return (
          <CreateEditRewardPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
            onSave={handleAddCampaign}
          />
        );
      case 'Settings':
      case 'Analytics':
      case 'Products':
      case 'Reports':
      case 'About':
        return (
          <MorePage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      case 'HelpGettingStarted':
      case 'HelpCustomers':
      case 'HelpRewards':
      case 'HelpCampaigns':
      case 'HelpAnalytics':
      case 'HelpContact':
        return (
          <HelpPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
          />
        );
      default:
        if (currentScreen.startsWith('EditCustomer')) {
          return (
            <AddEditCustomerPage
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              customerId={currentScreen.replace('EditCustomer', '')}
              onBack={handleBack}
            />
          );
        }
        if (currentScreen.startsWith('EditReward')) {
          const rewardId = currentScreen.replace('EditReward', '');
          const reward = rewards.find(r => r.id === rewardId);
          return (
            <CreateEditRewardPage
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              rewardId={rewardId}
              reward={reward}
              onBack={handleBack}
              onSave={(data) => handleUpdateReward(rewardId, data)}
            />
          );
        }
        if (currentScreen.startsWith('EditCampaign')) {
          const campaignId = currentScreen.replace('EditCampaign', '');
          return (
            <CreateEditRewardPage
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              rewardId={campaignId}
              onBack={handleBack}
              onSave={(data) => handleUpdateCampaign(campaignId, data)}
            />
          );
        }
        if (currentScreen.startsWith('RewardDetail')) {
          return (
            <RewardsPage
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              onBack={handleBack}
            />
          );
        }
        if (currentScreen.startsWith('CampaignDetail')) {
          return (
            <CampaignsPage
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              onBack={handleBack}
            />
          );
        }
        if (currentScreen.startsWith('AdjustRewards')) {
          return (
            <AddEditCustomerPage
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              customerId={currentScreen.replace('AdjustRewards', '')}
              onBack={handleBack}
            />
          );
        }
        return (
          <HomeScreen
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onScanPress={handleScanPress}
            rewards={rewards}
            campaigns={campaigns}
          />
        );
    }
  };

  return (
    <>
      {renderScreen()}
      <ScanModal
        visible={scanModalVisible}
        onBarcodeScanned={handleBarcodeScanned}
        onClose={() => setScanModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 18,
    color: '#0E7C86',
  },
});

export default App;


