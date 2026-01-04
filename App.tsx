import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Platform, Linking} from 'react-native';

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

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated();
        setIsAuthenticatedState(authenticated);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticatedState(false);
      } finally {
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

  // Handle successful login
  const handleLoginSuccess = async () => {
    try {
      const authenticated = await isAuthenticated();
      setIsAuthenticatedState(authenticated);
    } catch (error) {
      console.error('Error after login:', error);
      setIsAuthenticatedState(false);
    }
  };

  // Load rewards and campaigns on mount
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const loadedRewards = await loadRewards();
        if (mounted && loadedRewards && Array.isArray(loadedRewards) && loadedRewards.length > 0) {
          // Ensure all loaded rewards have QR codes (generate for any that don't)
          const rewardsWithQRCodes = ensureRewardsHaveQRCodes(loadedRewards);
          setRewards(rewardsWithQRCodes);
          // Save updated rewards back to file if any QR codes were generated
          const needsUpdate = loadedRewards.some(r => !r.qrCode);
          if (needsUpdate) {
            await saveRewards(rewardsWithQRCodes);
            console.log('✅ Generated QR codes for existing rewards');
          }
        } else if (mounted && (!loadedRewards || loadedRewards.length === 0)) {
          // If no rewards file exists, save initial rewards to file
          // This ensures all rewards in carousel have a record in the file
          const rewardsWithQRCodes = ensureRewardsHaveQRCodes(initialRewards);
          setRewards(rewardsWithQRCodes);
          await saveRewards(rewardsWithQRCodes);
        }
        
        const loadedCampaigns = await loadCampaigns();
        if (mounted && loadedCampaigns && Array.isArray(loadedCampaigns) && loadedCampaigns.length > 0) {
          setCampaigns(loadedCampaigns);
        } else if (mounted && (!loadedCampaigns || loadedCampaigns.length === 0)) {
          // If no campaigns file exists, save initial campaigns to file
          // This ensures all campaigns in carousel have a record in the file
          setCampaigns(initialCampaigns);
          await saveCampaigns(initialCampaigns);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // On error, use initial rewards and campaigns and save them
        if (mounted) {
          const rewardsWithQRCodes = ensureRewardsHaveQRCodes(initialRewards);
          setRewards(rewardsWithQRCodes);
          await saveRewards(rewardsWithQRCodes);
          setCampaigns(initialCampaigns);
          await saveCampaigns(initialCampaigns);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    const timer = setTimeout(() => {
      loadData();
    }, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []); // Removed isAuthenticatedState dependency - load data immediately

  // LOGIN SUCCESS HANDLER ARCHIVED - Login functionality disabled
  // const handleLoginSuccess = async () => {
  //   // Function archived - login functionality disabled
  // };

  const handleAddReward = (rewardData: {
    name: string;
    type: 'product' | 'action';
    requirement: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
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
      qrCode: qrCode, // Save QR code in reward record
    };
    const updatedRewards = [...rewards, newReward];
    setRewards(updatedRewards);
    saveRewards(updatedRewards);
  };

  const handleUpdateReward = (rewardId: string, rewardData: {
    name: string;
    type: 'product' | 'action';
    requirement: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
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

  const handleDeleteReward = (rewardId: string) => {
    const updatedRewards = rewards.filter(r => r.id !== rewardId);
    setRewards(updatedRewards);
    saveRewards(updatedRewards);
  };

  const handleAddCampaign = (campaignData: {
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
    saveCampaigns(updatedCampaigns);
  };

  const handleUpdateCampaign = (campaignId: string, campaignData: {
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
    saveCampaigns(updatedCampaigns);
  };

  const handleDeleteCampaign = (campaignId: string) => {
    const updatedCampaigns = campaigns.filter(c => c.id !== campaignId);
    setCampaigns(updatedCampaigns);
    saveCampaigns(updatedCampaigns);
  };

  const handleNavigate = (screen: ScreenName) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
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
        return (
          <HomeScreen
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onScanPress={handleScanPress}
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
          return (
            <CreateEditRewardPage
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              rewardId={currentScreen.replace('EditCampaign', '')}
              onBack={handleBack}
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

  // LOGIN PAGE DISABLED - Login functionality archived
  // App now shows HomeScreen directly without authentication check

  // Show loading screen only if actually loading data
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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


