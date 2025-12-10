import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
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
import type {ScreenName} from './src/types';
import {saveRewards, loadRewards, saveCampaigns, loadCampaigns} from './src/utils/dataStorage';

interface Reward {
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
}

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Home');
  const [previousScreen, setPreviousScreen] = useState<ScreenName | null>(null);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Rewards state management
  const [rewards, setRewards] = useState<Reward[]>([
    {id: '1', name: 'Buy 10 Get 1 Free', count: 8, total: 10, icon: '🎁', type: 'product', requirement: 10, rewardType: 'free_product'},
    {id: '2', name: 'Write Review Reward', count: 7, total: 10, icon: '⭐', type: 'action', requirement: 1, rewardType: 'free_product'},
    {id: '3', name: 'Social Share Bonus', count: 9, total: 10, icon: '📱', type: 'action', requirement: 1, rewardType: 'free_product'},
    {id: '4', name: 'Referral Program', count: 5, total: 10, icon: '👥', type: 'action', requirement: 1, rewardType: 'free_product'},
    {id: '5', name: 'Loyalty Points', count: 6, total: 10, icon: '💎', type: 'product', requirement: 10, rewardType: 'free_product'},
    {id: '6', name: 'Birthday Bonus', count: 4, total: 10, icon: '🎂', type: 'action', requirement: 1, rewardType: 'free_product'},
  ]);

  // Load rewards and campaigns on mount
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const loadedRewards = await loadRewards();
        if (mounted && loadedRewards && Array.isArray(loadedRewards) && loadedRewards.length > 0) {
          setRewards(loadedRewards);
        }
        await loadCampaigns();
      } catch (error) {
        console.error('Error loading data:', error);
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
  }, []);

  const handleAddReward = (rewardData: {
    name: string;
    type: 'product' | 'action';
    requirement: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
  }) => {
    const icons = ['🎁', '⭐', '📱', '👥', '💎', '🎂', '🎉', '🏆', '🎯', '🎊'];
    const newReward: Reward = {
      id: Date.now().toString(),
      name: rewardData.name,
      count: 0,
      total: rewardData.requirement,
      icon: icons[Math.floor(Math.random() * icons.length)],
      type: rewardData.type,
      requirement: rewardData.requirement,
      rewardType: rewardData.rewardType,
      selectedProducts: rewardData.selectedProducts,
      selectedActions: rewardData.selectedActions,
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
  }) => {
    const updatedRewards = rewards.map(r => 
      r.id === rewardId 
        ? {...r, ...rewardData, total: rewardData.requirement}
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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return (
          <HomeScreen
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onScanPress={handleScanPress}
            rewards={rewards}
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
          />
        );
      case 'CreateCampaign':
        return (
          <CreateEditRewardPage
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onBack={handleBack}
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
