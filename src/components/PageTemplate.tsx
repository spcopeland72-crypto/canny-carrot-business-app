import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import {Colors} from '../constants/Colors';
import BottomNavigation from './BottomNavigation';
import CompanyMenuModal from './CompanyMenuModal';
import {businessRepository} from '../services/localRepository';

interface PageTemplateProps {
  title: string;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  headerRight?: React.ReactNode; // Custom header buttons
  onLogout?: () => void;
}

const PageTemplate: React.FC<PageTemplateProps> = ({
  title,
  currentScreen,
  onNavigate,
  children,
  showBackButton = true,
  onBack,
  headerRight,
  onLogout = () => {},
}) => {
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Business');
  const [companyMenuVisible, setCompanyMenuVisible] = useState(false);

  // Load business logo and name
  useEffect(() => {
    const loadBusinessProfile = async () => {
      try {
        const profile = await businessRepository.get();
        if (profile) {
          setBusinessName(profile.name || 'Business');
          if (profile.logoIcon) {
            setBusinessLogo(profile.logoIcon);
          } else if (profile.logo) {
            setBusinessLogo(profile.logo);
          }
        }
      } catch (error) {
        console.error('[PageTemplate] Error loading business profile:', error);
      }
    };
    loadBusinessProfile();
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onNavigate('Home');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header Banner - Sticky */}
      <View style={styles.headerBanner}>
        {/* Account Logo - Top Left */}
        <TouchableOpacity
          style={styles.logoButton}
          onPress={() => setCompanyMenuVisible(true)}
          activeOpacity={0.7}>
          {businessLogo ? (
            <Image
              source={{uri: businessLogo}}
              style={styles.accountLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.accountLogoPlaceholder}>
              <Text style={styles.accountLogoText}>{businessName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Back Button - Next to Logo */}
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}

        {/* Title - Centered */}
        <Text style={styles.headerTitle}>{title}</Text>

        {/* Header Right */}
        {headerRight ? (
          <View style={styles.headerRight}>
            {headerRight}
          </View>
        ) : showBackButton ? (
          <View style={styles.backButtonSpacer} />
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={onNavigate}
      />

      {/* Company Menu Modal */}
      <CompanyMenuModal
        visible={companyMenuVisible}
        onClose={() => setCompanyMenuVisible(false)}
        onNavigate={onNavigate}
        onLogout={onLogout}
        businessName={businessName}
        businessLogo={businessLogo}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBanner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: Colors.primary,
    ...Platform.select({
      web: {
        position: 'sticky' as const,
        top: 0,
        zIndex: 100,
      },
      default: {},
    }),
  },
  logoButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  accountLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  accountLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  accountLogoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.background,
  },
  backButton: {
    position: 'absolute',
    left: 70, // Position after logo (40px logo + 10px gap + 20px left padding)
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backArrow: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.background,
  },
  backButtonSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.background,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
});

export default PageTemplate;





