import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Image,
  FlatList,
} from 'react-native';
import {Colors} from '../constants/Colors';
import BottomNavigation from './BottomNavigation';
import NotificationsModal from './NotificationsModal';
import HelpModal from './HelpModal';
import CircularProgress from './CircularProgress';
import AnimatedLineChart from './AnimatedLineChart';
import AnimatedBarChart from './AnimatedBarChart';
import AnimatedDonutChart from './AnimatedDonutChart';
import AnimatedAreaChart from './AnimatedAreaChart';
import {businessRepository} from '../services/localRepository';

// Logo will use fallback text instead of dynamic requires
const logoImage = null;

const SCREEN_WIDTH = Dimensions.get('window').width || 375;
const CARD_WIDTH = SCREEN_WIDTH * 0.25; // Match customer app width
const BOX_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px padding on each side + 16px gap

interface Reward {
  id: string;
  name: string;
  count: number; // Current progress
  total: number; // Total needed
  icon: string;
  type?: 'product' | 'action';
  requirement?: number;
  rewardType?: 'free_product' | 'discount' | 'other';
  selectedProducts?: string[];
  selectedActions?: string[];
}

interface HomeScreenProps {
  currentScreen?: string;
  onNavigate?: (screen: string) => void;
  onScanPress?: () => void;
  rewards?: Reward[];
  campaigns?: Campaign[];
}

interface Campaign {
  id: string;
  name: string;
  count: number; // Current participants
  total: number; // Target participants
  icon: string;
  status: 'active' | 'upcoming' | 'completed';
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  currentScreen = 'Home',
  onNavigate = () => {},
  onScanPress = () => {},
  rewards: propsRewards = [],
  campaigns: propsCampaigns = [],
}) => {
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [hasUnreadNotifications] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [businessName, setBusinessName] = useState('Business'); // Default until loaded from repository
  const [businessLogo, setBusinessLogo] = useState<string | null>(null); // Business logo from profile

  // Load business name and logo from local repository on mount
  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const profile = await businessRepository.get();
        if (profile) {
          if (profile.name) {
            setBusinessName(profile.name);
            console.log('[HomeScreen] Loaded business name from repository:', profile.name);
          }
          // Use logoIcon (circular) if available, otherwise use full logo
          if (profile.logoIcon) {
            setBusinessLogo(profile.logoIcon);
            console.log('[HomeScreen] Loaded business logo icon from repository');
          } else if (profile.logo) {
            setBusinessLogo(profile.logo);
            console.log('[HomeScreen] Loaded business logo from repository');
          }
        } else {
          console.log('[HomeScreen] No business profile found in repository, using default');
        }
      } catch (error) {
        console.error('[HomeScreen] Error loading business data:', error);
      }
    };
    loadBusinessData();
  }, []);

  // Use rewards from props, fallback to empty array
  const rewards = propsRewards.length > 0 ? propsRewards : [];
  
  // Use campaigns from props, fallback to empty array
  const campaigns = propsCampaigns.length > 0 ? propsCampaigns : [];

  // 2x2 Box Elements (matching customer app Features section)
  const boxElements = [
    {
      id: '1',
      title: 'Manage Customers',
      subtitle: 'View all',
      icon: '👥',
      screen: 'Customers',
    },
    {
      id: '2',
      title: 'Manage Products',
      subtitle: 'Get started',
      icon: '📦',
      screen: 'Products',
    },
    {
      id: '3',
      title: 'Analytics',
      subtitle: 'Take a look',
      icon: '📊',
      screen: 'Analytics',
    },
    {
      id: '4',
      title: 'Settings',
      subtitle: 'Nearest shop',
      icon: '⚙️',
      screen: 'Settings',
    },
  ];

  // Analytics boxes (2x2) with chart data
  const analyticsBoxes = [
    {
      id: '1',
      title: 'Total Customers',
      value: '156',
      change: '+12%',
      chartType: 'line',
      chartData: [120, 135, 142, 148, 150, 152, 154, 156],
    },
    {
      id: '2',
      title: 'Active Rewards',
      value: '8',
      change: '+2',
      chartType: 'bar',
      chartData: [5, 6, 7, 7, 8, 8, 8, 8],
    },
    {
      id: '3',
      title: 'Total Stamps',
      value: '1,234',
      change: '+89',
      chartType: 'donut',
      chartData: 75, // percentage
    },
    {
      id: '4',
      title: 'Redemptions',
      value: '45',
      change: '+5',
      chartType: 'area',
      chartData: [30, 35, 38, 40, 42, 43, 44, 45],
    },
  ];

  // Notifications - System inbox with priority messages
  const notifications = [
    {id: '1', message: 'System maintenance scheduled for tonight at 2 AM', priority: 'high', timestamp: '2 hours ago'},
    {id: '2', message: 'New customer registration: Sarah Johnson', priority: 'medium', timestamp: '3 hours ago'},
    {id: '3', message: 'Reward redemption completed: Buy 10 Get 1 Free', priority: 'low', timestamp: '4 hours ago'},
    {id: '4', message: 'Campaign "Christmas Special" ending in 2 days', priority: 'high', timestamp: '5 hours ago'},
    {id: '5', message: 'Payment received: £45.00 from customer #1234', priority: 'low', timestamp: '6 hours ago'},
    {id: '6', message: 'API rate limit warning: 80% of daily limit used', priority: 'high', timestamp: '7 hours ago'},
    {id: '7', message: 'New review submitted: 5 stars from John Smith', priority: 'medium', timestamp: '8 hours ago'},
    {id: '8', message: 'Customer support ticket #456 created', priority: 'medium', timestamp: '9 hours ago'},
    {id: '9', message: 'Weekly analytics report ready for review', priority: 'low', timestamp: '1 day ago'},
    {id: '10', message: 'Backup completed successfully', priority: 'low', timestamp: '1 day ago'},
  ];

  // Chat messages - Inbox of messages
  const chatMessages = [
    {id: '1', from: 'Sarah Johnson', subject: 'Question about rewards program', preview: 'Hi, I have a question about...', timestamp: '5 min ago', unread: true},
    {id: '2', from: 'John Smith', subject: 'Reward redemption issue', preview: 'I tried to redeem my reward but...', timestamp: '15 min ago', unread: true},
    {id: '3', from: 'Emma Wilson', subject: 'Thank you!', preview: 'Thanks for the great service...', timestamp: '1 hour ago', unread: false},
    {id: '4', from: 'Michael Brown', subject: 'Campaign inquiry', preview: 'I saw your Christmas campaign...', timestamp: '2 hours ago', unread: true},
    {id: '5', from: 'Lisa Anderson', subject: 'Account question', preview: 'Can you help me with my account?', timestamp: '3 hours ago', unread: false},
    {id: '6', from: 'David Lee', subject: 'Feedback on app', preview: 'I love the new features!', timestamp: '5 hours ago', unread: false},
    {id: '7', from: 'Rachel Green', subject: 'Reward clarification', preview: 'How do I earn more stamps?', timestamp: '6 hours ago', unread: true},
    {id: '8', from: 'Tom Harris', subject: 'Technical issue', preview: 'The app is not loading properly...', timestamp: '1 day ago', unread: false},
    {id: '9', from: 'Olivia Martinez', subject: 'Partnership inquiry', preview: 'I would like to discuss...', timestamp: '1 day ago', unread: true},
    {id: '10', from: 'James Taylor', subject: 'Compliment', preview: 'Great job on the new update!', timestamp: '2 days ago', unread: false},
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Logo - Use business logo if available, otherwise use default CC logo */}
          <View style={styles.logoContainer}>
            {businessLogo ? (
              <Image
                source={{uri: businessLogo}}
                style={[styles.logo, styles.businessLogo]}
                resizeMode="cover"
                onError={() => {
                  console.log('Business logo failed to load, using default');
                  setBusinessLogo(null);
                }}
              />
            ) : logoImage && !logoError ? (
              <Image
                source={logoImage}
                style={styles.logo}
                resizeMode="contain"
                onError={() => {
                  console.log('Logo image failed to load');
                  setLogoError(true);
                }}
              />
            ) : (
              <Text style={styles.logoText}>CC</Text>
            )}
          </View>
          
          {/* Business Name */}
          <Text style={styles.businessName} numberOfLines={1}>
            {businessName}
          </Text>
          
          {/* Right icons */}
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={[styles.iconButton, {marginRight: 12}]}
              onPress={() => setHelpModalVisible(true)}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>i</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setNotificationsModalVisible(true)}>
              <View style={styles.bellIconContainer}>
                {/* Bell handle/loop at top */}
                <View style={styles.bellHandle} />
                {/* Bell body - rounded shape, wider at bottom */}
                <View style={styles.bellBody}>
                  {/* Bottom horizontal band */}
                  <View style={styles.bellBottomBand} />
                </View>
                {/* Clapper/opening at very bottom */}
                <View style={styles.bellClapper} />
                {/* Red dot indicator for unread notifications */}
                {hasUnreadNotifications && (
                  <View style={styles.notificationDot} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Rewards Carousel - Round Elements (matching customer app) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>REWARDS</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity 
                onPress={() => onNavigate('CreateReward')}
                style={styles.createButton}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onNavigate('Rewards')}>
                <Text style={styles.sectionLink}>View all</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}>
            {rewards.map((reward) => {
              const progress = ((reward.total - reward.count) / reward.total) * 100;
              const progressColor = Colors.secondary;
              return (
                <TouchableOpacity
                  key={reward.id}
                  style={styles.rewardCard}
                  onPress={() => onNavigate(`EditReward${reward.id}`)}>
                  <View style={styles.rewardTitleContainer}>
                    <Text style={styles.rewardTitle}>{reward.name}</Text>
                  </View>
                  <View style={styles.rewardProgressContainer}>
                    <CircularProgress
                      key={`progress-${reward.id}`}
                      size={80}
                      strokeWidth={6}
                      progress={progress}
                      color={progressColor}
                      backgroundColor={Colors.neutral[200]}
                    />
                    <View style={styles.rewardIconOverlay}>
                      <Text style={styles.rewardIcon}>{reward.icon}</Text>
                    </View>
                  </View>
                  <Text style={styles.rewardCount}>
                    {reward.count} / {reward.total}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Campaigns Carousel - Round Elements (matching customer app) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CAMPAIGNS</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity 
                onPress={() => onNavigate('CreateCampaign')}
                style={styles.createButton}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onNavigate('AllCampaigns')}>
                <Text style={styles.sectionLink}>View all</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}>
            {campaigns.map((campaign) => {
              const progress = (campaign.count / campaign.total) * 100;
              const progressColor = campaign.status === 'active' 
                ? Colors.accent 
                : campaign.status === 'completed' 
                ? Colors.secondary 
                : Colors.neutral[300];
              return (
                <TouchableOpacity
                  key={campaign.id}
                  style={styles.rewardCard}
                  onPress={() => onNavigate(`CampaignDetail${campaign.id}`)}>
                  <View style={styles.rewardTitleContainer}>
                    <Text style={styles.rewardTitle}>{campaign.name}</Text>
                  </View>
                  <View style={styles.rewardProgressContainer}>
                    <CircularProgress
                      key={`progress-${campaign.id}`}
                      size={80}
                      strokeWidth={6}
                      progress={progress}
                      color={progressColor}
                      backgroundColor={Colors.neutral[200]}
                    />
                    <View style={styles.rewardIconOverlay}>
                      <Text style={styles.rewardIcon}>{campaign.icon}</Text>
                    </View>
                  </View>
                  <Text style={styles.rewardCount}>
                    {campaign.count} / {campaign.total}
                  </Text>
                  <Text style={styles.campaignStatus}>
                    {campaign.status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 2x2 Box Elements Section (matching customer app Features) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.featuresGrid}>
            {boxElements.map((box) => (
              <TouchableOpacity
                key={box.id}
                style={styles.featureCard}
                onPress={() => onNavigate(box.screen)}>
                <View style={styles.featureCardTopBorder} />
                <View style={styles.featureCardContent}>
                  <View style={styles.featureCardTop}>
                    <View style={styles.featureIconContainer}>
                      <Text style={styles.featureIcon}>{box.icon}</Text>
                    </View>
                  </View>
                  <View style={styles.featureCardBottom}>
                    <Text style={styles.featureTitle}>{box.title}</Text>
                    <View style={styles.featureNavButton}>
                      <Text style={styles.featureNavButtonText}>{box.subtitle}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications - System Inbox with Priority Messages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
            <TouchableOpacity onPress={() => setNotificationsModalVisible(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.notificationsCard}>
            <ScrollView 
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              style={styles.notificationsScrollView}>
              {notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItemContainer}>
                  <View style={styles.notificationLeft}>
                    <View style={[
                      styles.trafficLight,
                      notification.priority === 'high' && styles.trafficLightRed,
                      notification.priority === 'medium' && styles.trafficLightYellow,
                      notification.priority === 'low' && styles.trafficLightGreen,
                    ]} />
                    <View style={styles.notificationContent}>
                      <Text 
                        style={styles.notificationMessage}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTimestamp}>{notification.timestamp}</Text>
                    </View>
                  </View>
                  <View style={styles.notificationActions}>
                    <TouchableOpacity
                      style={styles.notificationActionButton}
                      onPress={() => {/* Open notification */}}>
                      <Text style={styles.notificationActionIcon}>👁️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notificationActionButton}
                      onPress={() => {/* Archive notification */}}>
                      <Text style={styles.notificationActionIcon}>📦</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Chat - Inbox of Messages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CHAT</Text>
            <TouchableOpacity onPress={() => onNavigate('Chat')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chatCard}>
            <ScrollView 
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              style={styles.chatScrollView}>
              {chatMessages.map((message) => (
                <View key={message.id} style={styles.chatMessageItem}>
                  <View style={styles.chatMessageContent}>
                    <View style={styles.chatMessageHeader}>
                      <Text style={[
                        styles.chatMessageFrom,
                        message.unread && styles.chatMessageUnread
                      ]}>
                        {message.from}
                      </Text>
                      <Text style={styles.chatMessageTimestamp}>{message.timestamp}</Text>
                    </View>
                    <Text style={styles.chatMessageSubject}>{message.subject}</Text>
                    <Text style={styles.chatMessagePreview} numberOfLines={1}>
                      {message.preview}
                    </Text>
                  </View>
                  <View style={styles.chatMessageActions}>
                    <TouchableOpacity
                      style={styles.chatActionButton}
                      onPress={() => onNavigate('Chat')}>
                      <Text style={styles.chatActionIcon}>👁️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.chatActionButton}
                      onPress={() => {/* Reply */}}>
                      <Text style={styles.chatActionIcon}>↩️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.chatActionButton}
                      onPress={() => {/* Delete */}}>
                      <Text style={styles.chatActionIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* 2x2 Analytics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ANALYTICS</Text>
          <View style={styles.featuresGrid}>
            {analyticsBoxes.map((box) => (
              <View
                key={box.id}
                style={styles.analyticsBox}>
                <Text style={styles.analyticsTitle}>{box.title}</Text>
                <Text style={styles.analyticsValue}>{box.value}</Text>
                <Text style={styles.analyticsChange}>{box.change}</Text>
                <View style={styles.analyticsChart}>
                  {box.chartType === 'line' && (
                    <AnimatedLineChart
                      data={box.chartData as number[]}
                      color={Colors.background}
                      width={120}
                      height={50}
                    />
                  )}
                  {box.chartType === 'bar' && (
                    <AnimatedBarChart
                      data={box.chartData as number[]}
                      color={Colors.background}
                      width={120}
                      height={50}
                    />
                  )}
                  {box.chartType === 'donut' && (
                    <AnimatedDonutChart
                      percentage={box.chartData as number}
                      color={Colors.background}
                      size={50}
                      strokeWidth={6}
                    />
                  )}
                  {box.chartType === 'area' && (
                    <AnimatedAreaChart
                      data={box.chartData as number[]}
                      color={Colors.background}
                      width={120}
                      height={50}
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigate('CreateReward')}>
            <Text style={styles.actionButtonText}>+ Create New Reward</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        onScanPress={onScanPress}
      />

      {/* Modals */}
      <HelpModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
      />
      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
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
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 50,
    height: 50,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.background,
  },
  businessLogo: {
    borderRadius: 25, // Make it circular
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  bellIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 2,
  },
  bellHandle: {
    width: 8,
    height: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: -1,
  },
  bellBody: {
    width: 20,
    height: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomWidth: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  bellBottomBand: {
    position: 'absolute',
    bottom: -2,
    width: 24,
    height: 3,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 2,
    backgroundColor: Colors.background,
  },
  bellClapper: {
    width: 6,
    height: 4,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginTop: -1,
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF0000',
    borderWidth: 1.5,
    borderColor: Colors.background,
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
    marginBottom: 16,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  createButtonText: {
    fontSize: 16,
    color: Colors.background,
    fontWeight: 'bold',
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
    marginLeft: 8,
  },
  viewAllText: {
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: '600',
  },
  carouselContent: {
    paddingRight: 16,
  },
  rewardCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
    marginRight: 12,
  },
  rewardTitleContainer: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  rewardProgressContainer: {
    position: 'relative',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardIconOverlay: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardIcon: {
    fontSize: 32,
  },
  rewardCount: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  campaignStatus: {
    fontSize: 10,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginHorizontal: -6,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    aspectRatio: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    overflow: 'hidden',
    margin: 6,
  },
  featureCardTopBorder: {
    height: 4,
    backgroundColor: Colors.secondary,
    width: '100%',
  },
  featureCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  featureCardTop: {
    alignItems: 'flex-end',
  },
  featureCardBottom: {
    alignItems: 'flex-start',
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  featureNavButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  featureNavButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.background,
  },
  notificationsCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    maxHeight: 400,
    overflow: 'hidden',
  },
  notificationsScrollView: {
    maxHeight: 400,
    padding: 12,
  },
  notificationItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trafficLight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  trafficLightRed: {
    backgroundColor: '#FF0000',
  },
  trafficLightYellow: {
    backgroundColor: '#FFA500',
  },
  trafficLightGreen: {
    backgroundColor: '#00FF00',
  },
  notificationContent: {
    flex: 1,
    minWidth: 0, // Allows text to shrink properly
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  notificationActionButton: {
    padding: 6,
    marginLeft: 4,
  },
  notificationActionIcon: {
    fontSize: 18,
  },
  chatCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    maxHeight: 400,
    overflow: 'hidden',
  },
  chatScrollView: {
    maxHeight: 400,
    padding: 12,
  },
  chatMessageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  chatMessageContent: {
    flex: 1,
    marginRight: 8,
  },
  chatMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatMessageFrom: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  chatMessageUnread: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  chatMessageTimestamp: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  chatMessageSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  chatMessagePreview: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  chatMessageActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatActionButton: {
    padding: 6,
    marginLeft: 4,
  },
  chatActionIcon: {
    fontSize: 18,
  },
  analyticsBox: {
    width: (SCREEN_WIDTH - 44) / 2,
    aspectRatio: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
    margin: 6,
  },
  analyticsChart: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  analyticsTitle: {
    fontSize: 12,
    color: Colors.background,
    marginBottom: 8,
    opacity: 0.9,
  },
  analyticsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.background,
    marginBottom: 4,
  },
  analyticsChange: {
    fontSize: 12,
    color: Colors.background,
    opacity: 0.8,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});

export default HomeScreen;




