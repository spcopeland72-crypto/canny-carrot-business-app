import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {Colors} from '../constants/Colors';
import BottomNavigation from './BottomNavigation';

interface HomeScreenProps {
  currentScreen?: string;
  onNavigate?: (screen: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  currentScreen = 'Home',
  onNavigate = () => {},
}) => {
  // Sample data - would come from API/state management
  const [rewardPrograms] = useState([
    {id: '1', name: 'Blackwells Butchers', activeCustomers: 45, totalStamps: 320},
    {id: '2', name: 'Bluecorn Bakers', activeCustomers: 32, totalStamps: 245},
    {id: '3', name: 'The Green Florist', activeCustomers: 28, totalStamps: 198},
  ]);

  const [campaigns] = useState([
    {id: '1', name: 'Christmas Special', status: 'Active', participants: 120},
    {id: '2', name: 'New Year Promotion', status: 'Upcoming', participants: 0},
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business Dashboard</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Reward Programs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>REWARD PROGRAMS</Text>
            <TouchableOpacity onPress={() => onNavigate('AllRewards')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.cardContainer}>
            {rewardPrograms.map((program) => (
              <TouchableOpacity
                key={program.id}
                style={styles.card}
                onPress={() => onNavigate(`RewardDetail${program.id}`)}>
                <Text style={styles.cardTitle}>{program.name}</Text>
                <View style={styles.cardStats}>
                  <Text style={styles.cardStat}>
                    {program.activeCustomers} Active Customers
                  </Text>
                  <Text style={styles.cardStat}>
                    {program.totalStamps} Total Stamps
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onNavigate('CreateReward')}>
            <Text style={styles.addButtonText}>+ Create New Reward Program</Text>
          </TouchableOpacity>
        </View>

        {/* Campaigns Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CAMPAIGNS</Text>
            <TouchableOpacity onPress={() => onNavigate('AllCampaigns')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.cardContainer}>
            {campaigns.map((campaign) => (
              <TouchableOpacity
                key={campaign.id}
                style={styles.card}
                onPress={() => onNavigate(`CampaignDetail${campaign.id}`)}>
                <Text style={styles.cardTitle}>{campaign.name}</Text>
                <View style={styles.cardStats}>
                  <Text style={styles.cardStat}>Status: {campaign.status}</Text>
                  <Text style={styles.cardStat}>
                    {campaign.participants} Participants
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onNavigate('CreateCampaign')}>
            <Text style={styles.addButtonText}>+ Create New Campaign</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigate('Customers')}>
            <Text style={styles.actionButtonText}>Manage Customers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigate('Products')}>
            <Text style={styles.actionButtonText}>Manage Products</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={onNavigate}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  sectionLink: {
    fontSize: 16,
    color: Colors.background,
    fontWeight: 'bold',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardContainer: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardStat: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  actionButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});

export default HomeScreen;

