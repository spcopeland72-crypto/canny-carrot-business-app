import React, {useState} from 'react';
import HomeScreen from './src/components/HomeScreen';
import CustomersPage from './src/components/CustomersPage';
import AddEditCustomerPage from './src/components/AddEditCustomerPage';
import RewardsManagementPage from './src/components/RewardsManagementPage';
import CreateEditRewardPage from './src/components/CreateEditRewardPage';
import CampaignsPage from './src/components/CampaignsPage';
import BusinessProfilePage from './src/components/BusinessProfilePage';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [previousScreen, setPreviousScreen] = useState<string | null>(null);

  const handleNavigate = (screen: string) => {
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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return (
          <HomeScreen
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
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
      default:
        // Handle dynamic routes like EditCustomer1, EditReward1, etc.
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
          return (
            <CreateEditRewardPage
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              rewardId={currentScreen.replace('EditReward', '')}
              onBack={handleBack}
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
        if (currentScreen.startsWith('AdjustRewards')) {
          // Navigate to adjust rewards page (similar to AddEditCustomer but for rewards adjustment)
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
          />
        );
    }
  };

  return <>{renderScreen()}</>;
}

export default App;

