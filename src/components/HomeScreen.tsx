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
  Linking,
  Animated,
  Easing,
  Platform,
  Modal,
} from 'react-native';
import {Colors} from '../constants/Colors';
import BottomNavigation from './BottomNavigation';
import NotificationsModal from './NotificationsModal';
import HelpModal from './HelpModal';
import CompanyMenuModal from './CompanyMenuModal';
import CircularProgress from './CircularProgress';
import RewardQRCodeModal from './RewardQRCodeModal';
import {generateRewardQRCode} from '../utils/qrCodeUtils';
import AnimatedLineChart from './AnimatedLineChart';
import AnimatedBarChart from './AnimatedBarChart';
import AnimatedDonutChart from './AnimatedDonutChart';
import AnimatedAreaChart from './AnimatedAreaChart';
import {businessRepository, rewardsRepository, campaignsRepository} from '../services/localRepository';
import {getCampaignDisplayFields} from '../utils/rewardUtils';
import type {Reward, Campaign} from '../types';

// Load CC logo image (same as customer app header)
let logoImage: any = null;
try {
  logoImage = require('../../assets/logo.png');
  console.log('[HomeScreen] Logo loaded from assets');
} catch (e) {
  console.log('[HomeScreen] Logo not found in assets:', e);
  logoImage = null;
}

// Banner image disabled - using green background instead
let bannerImage: any = null;

// Load CC icon for banner logo
let ccIconImage: any = null;
try {
  ccIconImage = require('../../assets/cc-icon-no-background.png');
  console.log('[HomeScreen] CC icon loaded from assets');
} catch (e) {
  console.log('[HomeScreen] CC icon not found in assets:', e);
}

// Load social media icons from Images folder
let facebookIcon: any = null;
let instagramIcon: any = null;
let tiktokIcon: any = null;
let xIcon: any = null;
let linkedinIcon: any = null;

try {
  facebookIcon = require('../../Images/facebook.png');
  instagramIcon = require('../../Images/instagram.png');
  tiktokIcon = require('../../Images/tiktok.png');
  xIcon = require('../../Images/x.png');
  linkedinIcon = require('../../Images/linkedin.png');
} catch (e) {
  console.log('[HomeScreen] Social icons not found:', e);
}

const SCREEN_WIDTH = Dimensions.get('window').width || 375;
const CARD_WIDTH = SCREEN_WIDTH * 0.25; // Match customer app width
const BOX_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px padding on each side + 16px gap

// Reward type is imported from types/index.ts (DB format)

interface HomeScreenProps {
  currentScreen?: string;
  onNavigate?: (screen: string) => void;
  onScanPress?: () => void;
  onLogout?: () => void;
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
  onLogout = () => {},
  rewards: propsRewards = [],
  campaigns: propsCampaigns = [],
}) => {
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [companyMenuVisible, setCompanyMenuVisible] = useState(false);
  const [hasUnreadNotifications] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [businessName, setBusinessName] = useState('Business'); // Default until loaded from repository
  const [businessLogo, setBusinessLogo] = useState<string | null>(null); // Business logo from profile
  const [rewardQRModalVisible, setRewardQRModalVisible] = useState(false);
  const [selectedRewardForQR, setSelectedRewardForQR] = useState<Reward | null>(null);
  const [socialIcons, setSocialIcons] = useState<{
    facebook?: any;
    instagram?: any;
    tiktok?: any;
    x?: any;
    linkedin?: any;
  }>({});

  // Local state for rewards as fallback if props are empty
  const [localRewards, setLocalRewards] = useState<Reward[]>([]);
  
  // Local state for campaigns as fallback if props are empty
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>([]);
  
  // EXACT CodePen - single string with seamless wrap
  // CodePen uses two ticker__item but effect is one continuous string
  const tickerText = "Canny Carrot welcomes our newest Silver Member Powder Butterfly and our latest Gold Member Blackwells Butchers";
  const screenWidth = Dimensions.get('window').width || 375;
  const tickerAnimation = useRef(new Animated.Value(0)).current;
  const [tickerWidth, setTickerWidth] = useState(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  // Continuous scroll - no restart, no reset, just continues infinitely
  useEffect(() => {
    if (tickerWidth > 0 && !animationRef.current) {
      // Create continuous animation that never resets
      const startContinuousAnimation = () => {
        // Cycle 3: 2→0 (reset to 0 after reaching 2)
        const currentValue = tickerAnimation._value || 0;
        let targetValue;
        
        if (currentValue >= 2) {
          // Cycle 3: Reset to 0
          tickerAnimation.setValue(0);
          targetValue = 1;
        } else {
          // Continue incrementing: 0→1, 1→2
          targetValue = currentValue + 1;
        }
        
        animationRef.current = Animated.timing(tickerAnimation, {
          toValue: targetValue,
          duration: 30000, // Speed of animation
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        });
        
        animationRef.current.start((finished) => {
          if (finished) {
            // Continue: 0→1→2→0→1→2...
            animationRef.current = null;
            startContinuousAnimation();
          }
        });
      };
      
      startContinuousAnimation();
    }
  }, [tickerWidth]);

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

  // Set social media icons from module-level variables
  useEffect(() => {
    setSocialIcons({
      facebook: facebookIcon,
      instagram: instagramIcon,
      tiktok: tiktokIcon,
      x: xIcon,
      linkedin: linkedinIcon,
    });
  }, []);

  // Fallback: Load rewards directly from repository if props are empty
  useEffect(() => {
    const loadRewardsFromRepository = async () => {
      // Only load if props are empty
      if (propsRewards.length === 0) {
        try {
          console.log('[HomeScreen] Props rewards empty - loading directly from repository...');
          // Only load active rewards (excludes trashed/inactive)
          const loadedRewards = await rewardsRepository.getActive();
          console.log(`[HomeScreen] Found ${loadedRewards?.length || 0} active rewards in repository`);
          
          if (loadedRewards && loadedRewards.length > 0) {
            // Rewards are in DB format - use directly
            setLocalRewards(loadedRewards);
            console.log(`[HomeScreen] Loaded ${loadedRewards.length} active rewards directly from repository (DB format)`);
            console.log(`[HomeScreen] Reward details:`, loadedRewards.map(r => ({ 
              id: r.id, 
              name: r.name, 
              stampsRequired: r.stampsRequired, 
              isActive: r.isActive,
              type: r.type 
            })));
          } else {
            console.log(`[HomeScreen] ⚠️ No active rewards found in repository`);
          }
        } catch (error) {
          console.error('[HomeScreen] Error loading rewards from repository:', error);
        }
      }
    };
    
    loadRewardsFromRepository();
  }, [propsRewards.length]); // Only run when propsRewards length changes

  // Debug: Log when rewards props change
  useEffect(() => {
    console.log('[HomeScreen] Rewards props updated:', {
      count: propsRewards.length,
      rewards: propsRewards.map(r => ({ id: r.id, name: r.name })),
    });
  }, [propsRewards]);

  // Use rewards from props, fallback to local state, then empty array
  // Filter to only show active rewards (isActive !== false)
  const allRewards = propsRewards.length > 0 ? propsRewards : (localRewards.length > 0 ? localRewards : []);
  const rewards = allRewards.filter(r => r.isActive !== false); // Only show active rewards
  
  // Fallback: Load campaigns directly from repository if props are empty
  useEffect(() => {
    const loadCampaignsFromRepository = async () => {
      // Only load if props are empty
      if (propsCampaigns.length === 0) {
        try {
          console.log('[HomeScreen] Props campaigns empty - loading directly from repository...');
          const loadedCampaigns = await campaignsRepository.getAll();
          console.log(`[HomeScreen] Found ${loadedCampaigns?.length || 0} campaigns in repository`);
          
          if (loadedCampaigns && loadedCampaigns.length > 0) {
            setLocalCampaigns(loadedCampaigns);
            console.log(`[HomeScreen] Loaded ${loadedCampaigns.length} campaigns directly from repository`);
          } else {
            console.log(`[HomeScreen] ⚠️ No campaigns found in repository`);
          }
        } catch (error) {
          console.error('[HomeScreen] Error loading campaigns from repository:', error);
        }
      }
    };
    
    loadCampaignsFromRepository();
  }, [propsCampaigns.length]); // Only run when propsCampaigns length changes
  
  // Use campaigns from props, fallback to local state, then empty array
  const campaigns = propsCampaigns.length > 0 ? propsCampaigns : (localCampaigns.length > 0 ? localCampaigns : []);
  
  // Log current state for debugging
  useEffect(() => {
    console.log('[HomeScreen] Current render state:', {
      rewardsCount: rewards.length,
      campaignsCount: campaigns.length,
      propsRewardsCount: propsRewards.length,
      propsCampaignsCount: propsCampaigns.length,
    });
  }, [rewards, campaigns, propsRewards, propsCampaigns]);

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
          {/* Logo - Make it clickable to open company menu */}
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => setCompanyMenuVisible(true)}
            activeOpacity={0.7}>
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
          </TouchableOpacity>
          
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
        
        {/* Marketing Banner Section - same as customer app */}
        <View style={styles.bannerSection}>
          {bannerImage && !bannerError ? (
            <Image
              source={bannerImage}
              style={styles.bannerImage}
              resizeMode="cover"
              onError={() => {
                console.log('Banner image failed to load');
                setBannerError(true);
              }}
            />
          ) : (
            <View style={styles.banner}>
              <View style={styles.bannerContent}>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>Canny Carrot</Text>
                  <Text style={styles.bannerSubtitle}>Rewards</Text>
                  {/* Social Media Icons */}
                  <View style={styles.socialIconsContainer}>
                    {socialIcons.facebook && (
                      <TouchableOpacity
                        style={[styles.socialIcon, {marginRight: 7}]}
                        onPress={() => Linking.openURL('https://www.facebook.com/CannyCarrotRewards')}>
                        <Image
                          source={socialIcons.facebook}
                          style={styles.socialIconImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                    {socialIcons.instagram && (
                      <TouchableOpacity
                        style={[styles.socialIcon, {marginRight: 7}]}
                        onPress={() => Linking.openURL('https://www.instagram.com/cannycarrotrewards')}>
                        <Image
                          source={socialIcons.instagram}
                          style={styles.socialIconImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                    {socialIcons.tiktok && (
                      <TouchableOpacity
                        style={[styles.socialIcon, {marginRight: 7}]}
                        onPress={() => Linking.openURL('https://www.tiktok.com/@cannycarrotrewards')}>
                        <Image
                          source={socialIcons.tiktok}
                          style={styles.socialIconImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                    {socialIcons.x && (
                      <TouchableOpacity
                        style={[styles.socialIcon, {marginRight: 7}]}
                        onPress={() => Linking.openURL('https://twitter.com/CannyCarrotRew')}>
                        <Image
                          source={socialIcons.x}
                          style={styles.socialIconImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                    {socialIcons.linkedin && (
                      <TouchableOpacity
                        style={styles.socialIcon}
                        onPress={() => Linking.openURL('https://www.linkedin.com/company/canny-carrot-rewards')}>
                        <Image
                          source={socialIcons.linkedin}
                          style={styles.socialIconImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.bannerLogoContainer}>
                  {ccIconImage ? (
                    <Image
                      source={ccIconImage}
                      style={styles.bannerLogoImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.bannerLogoPlaceholder}>
                      <Text style={styles.bannerLogoText}>Logo</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
          {/* Social Media Icons for banner with image */}
          {bannerImage && !bannerError && (
            <View style={styles.bannerSocialIconsOverlay}>
              <View style={styles.socialIconsContainer}>
                {socialIcons.facebook && (
                  <TouchableOpacity
                    style={[styles.socialIcon, {marginRight: 7}]}
                    onPress={() => Linking.openURL('https://www.facebook.com/CannyCarrotRewards')}>
                    <Image
                      source={socialIcons.facebook}
                      style={styles.socialIconImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
                {socialIcons.instagram && (
                  <TouchableOpacity
                    style={[styles.socialIcon, {marginRight: 7}]}
                    onPress={() => Linking.openURL('https://www.instagram.com/cannycarrotrewards')}>
                    <Image
                      source={socialIcons.instagram}
                      style={styles.socialIconImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
                {socialIcons.tiktok && (
                  <TouchableOpacity
                    style={[styles.socialIcon, {marginRight: 7}]}
                    onPress={() => Linking.openURL('https://www.tiktok.com/@cannycarrotrewards')}>
                    <Image
                      source={socialIcons.tiktok}
                      style={styles.socialIconImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
                {socialIcons.x && (
                  <TouchableOpacity
                    style={[styles.socialIcon, {marginRight: 7}]}
                    onPress={() => Linking.openURL('https://twitter.com/CannyCarrotRew')}>
                    <Image
                      source={socialIcons.x}
                      style={styles.socialIconImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
                {socialIcons.linkedin && (
                  <TouchableOpacity
                    style={styles.socialIcon}
                    onPress={() => Linking.openURL('https://www.linkedin.com/company/canny-carrot-rewards')}>
                    <Image
                      source={socialIcons.linkedin}
                      style={styles.socialIconImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
        
        {/* Ticker - Exact CodePen implementation - Below banner */}
        {/* Ticker - EXACT CodePen: one string, seamless wrap */}
        <View style={styles.tickerWrap}>
          <Animated.View
            style={[
              styles.ticker,
              {
                transform: [
                  {
                    translateX: tickerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: tickerWidth > 0 
                        ? [0, -(tickerWidth + screenWidth)] // Move completely off left border
                        : [0, 0],
                      extrapolate: 'extend', // Continue seamlessly beyond inputRange for continuous scroll
                    }),
                  },
                ],
              },
            ]}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              // Width = text1 + text2 + padding-right (100%)
              // When animation moves by -100%, first text scrolls off left, second appears from right = seamless
              if (width > 0 && tickerWidth !== width) {
                setTickerWidth(width);
              }
            }}
          >
            <Text style={styles.tickerItem}>{tickerText}</Text>
            <Text style={styles.tickerItem}>{tickerText}</Text>
          </Animated.View>
        </View>
        
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
          
          {/* Debug: Show rewards count */}
          {rewards.length === 0 && (
            <View style={{ padding: 16, backgroundColor: '#fff3cd', borderRadius: 8, marginBottom: 8 }}>
              <Text style={{ color: '#856404', fontSize: 12 }}>
                ⚠️ DEBUG: No rewards to display. Props: {propsRewards.length}, Local: {localRewards.length}, Total: {rewards.length}
              </Text>
            </View>
          )}
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}>
            {rewards.length > 0 ? (
              rewards.map((reward: Reward) => {
                // Compute UI fields from DB format
                const total = reward.stampsRequired || reward.costStamps || 10;
                const count = 0; // Business app doesn't track customer progress
                const progress = total > 0 ? ((total - count) / total) * 100 : 0;
                const progressColor = Colors.secondary;
                console.log('[HomeScreen] Rendering reward:', { id: reward.id, name: reward.name, stampsRequired: reward.stampsRequired });
                return (
                  <TouchableOpacity
                    key={reward.id}
                    style={styles.rewardCard}
                    onPress={() => {
                      setSelectedRewardForQR(reward);
                      setRewardQRModalVisible(true);
                    }}>
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
                        {businessLogo ? (
                          <Image
                            source={{uri: businessLogo}}
                            style={styles.rewardIconImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.rewardIcon}>🎁</Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.rewardCount}>
                      {count} / {total}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: Colors.text.secondary }}>No rewards available</Text>
              </View>
            )}
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
              // Compute display fields from DB format campaign
              const displayFields = getCampaignDisplayFields(campaign as Campaign);
              const progress = displayFields.total > 0 ? (displayFields.count / displayFields.total) * 100 : 0;
              const progressColor = campaign.status === 'active' 
                ? Colors.accent 
                : campaign.status === 'completed' 
                ? Colors.secondary 
                : Colors.neutral[300];
              
              console.log('[HomeScreen] Rendering campaign:', { id: campaign.id, name: campaign.name, status: campaign.status });
              
              return (
                <TouchableOpacity
                  key={campaign.id}
                  style={styles.rewardCard}
                  onPress={() => onNavigate(`EditCampaign${campaign.id}`)}>
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
                      <Text style={styles.rewardIcon}>{displayFields.icon}</Text>
                    </View>
                  </View>
                  <Text style={styles.rewardCount}>
                    {displayFields.count} / {displayFields.total}
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
      <CompanyMenuModal
        visible={companyMenuVisible}
        onClose={() => setCompanyMenuVisible(false)}
        onNavigate={onNavigate}
        onLogout={onLogout}
        businessName={businessName}
        businessLogo={businessLogo}
      />
      
      {/* Reward QR Code Modal */}
      {selectedRewardForQR && (() => {
        let qrValue = selectedRewardForQR.qrCode;
        if (!qrValue) {
          // Generate QR code if not stored
          try {
            const businessProfile = {
              name: businessName,
              address: '',
              addressLine1: '',
              addressLine2: '',
              city: '',
              postcode: '',
              country: 'UK',
              phone: '',
              email: '',
              website: '',
              socialMedia: {},
            };
            qrValue = generateRewardQRCode(
              selectedRewardForQR.id,
              selectedRewardForQR.name,
              selectedRewardForQR.stampsRequired || selectedRewardForQR.costStamps || 10,
              selectedRewardForQR.type === 'freebie' ? 'free_product' : 
              selectedRewardForQR.type === 'discount' ? 'discount' : 'other',
              selectedRewardForQR.selectedProducts,
              selectedRewardForQR.selectedActions,
              selectedRewardForQR.pinCode,
              businessProfile,
              selectedRewardForQR.pointsPerPurchase
            );
          } catch (error) {
            console.error('[HomeScreen] Error generating QR code:', error);
            qrValue = '';
          }
        }
        
        return (
          <RewardQRCodeModal
            visible={rewardQRModalVisible}
            rewardName={selectedRewardForQR.name}
            qrValue={qrValue}
            rewardId={selectedRewardForQR.id}
            onClose={() => {
              setRewardQRModalVisible(false);
              setSelectedRewardForQR(null);
            }}
            onNavigate={onNavigate}
          />
        );
      })()}
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
  bannerSection: {
    marginBottom: 0,
    width: '100%',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: 171,
  },
  banner: {
    backgroundColor: '#74A71C', // Green background
    paddingHorizontal: 20,
    paddingVertical: 17,
    minHeight: 128,
    justifyContent: 'center',
    width: '100%',
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  // Ticker styles - EXACT CodePen CSS
  tickerWrap: {
    width: '100%',
    overflow: 'hidden',
    height: 45, // Reduced by 30% from 64
    backgroundColor: '#9E8F85', // Changed from black to #9E8F85
    paddingLeft: Dimensions.get('window').width, // CodePen: padding-left: 100%
    marginBottom: 24,
  },
  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 45, // Reduced by 30% from 64
    lineHeight: 45, // Reduced by 30% from 64
    paddingRight: Dimensions.get('window').width, // CodePen: padding-right: 100%
  },
  tickerItem: {
    paddingHorizontal: 32, // CodePen: 0 2rem
    fontSize: 26, // Reduced by 20% from 32
    color: 'white', // CodePen: color: white
    includeFontPadding: false,
    flexShrink: 0,
  },
  bannerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.background,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 21,
    fontWeight: '600',
    color: Colors.background,
    marginBottom: 8,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  socialIcon: {
    width: 27,
    height: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIconImage: {
    width: 27,
    height: 27,
  },
  bannerSocialIconsOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  bannerLogoContainer: {
    width: 103,
    height: 103,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerLogoImage: {
    width: 103,
    height: 103,
    resizeMode: 'contain',
  },
  bannerLogoPlaceholder: {
    width: 103,
    height: 103,
    borderRadius: 51,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.neutral[300],
  },
  bannerLogoText: {
    fontSize: 12,
    color: Colors.text.secondary,
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
  rewardIconImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardModalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  rewardModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  qrIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  qrText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  rewardModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  rewardModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  analyticsButton: {
    backgroundColor: Colors.secondary,
  },
  analyticsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  closeModalButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.neutral[200],
    width: '100%',
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});

export default HomeScreen;




