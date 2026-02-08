import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {Colors} from '../constants/Colors';
import {businessRepository} from '../services/localRepository';
import {logoutBusiness, getStoredAuth} from '../services/authService';
import {performUnifiedSync} from '../services/unifiedSyncService';
import {useRefresh} from '../contexts/RefreshContext';

// Load CC logo image (same as customer app header)
let ccLogoImage: any = null;
try {
  ccLogoImage = require('../../assets/logo.png');
  console.log('[CompanyMenuModal] Logo loaded from assets');
} catch (e) {
  console.log('[CompanyMenuModal] Logo not found in assets:', e);
  ccLogoImage = null;
}

interface CompanyMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  businessName: string;
  businessLogo: string | null;
}

const CompanyMenuModal: React.FC<CompanyMenuModalProps> = ({
  visible,
  onClose,
  onNavigate,
  onLogout,
  businessName,
  businessLogo,
}) => {
  const {refreshAfterSync} = useRefresh();
  const [businessEmail, setBusinessEmail] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // TODO: Implement theme system

  useEffect(() => {
    const loadBusinessEmail = async () => {
      try {
        const profile = await businessRepository.get();
        if (profile?.email) {
          setBusinessEmail(profile.email);
        } else {
          // Fallback to stored auth email
          const auth = await getStoredAuth();
          if (auth?.email) {
            setBusinessEmail(auth.email);
          }
        }
      } catch (error) {
        console.error('Error loading business email:', error);
      }
    };
    if (visible) {
      loadBusinessEmail();
    }
  }, [visible]);

  // Use case 1 of 3: Sync only on Sync click, login, logout. 1 rule: newest overwrites oldest.
  const handleSync = async () => {
    try {
      onClose();
      const auth = await getStoredAuth();
      if (auth?.businessId) {
        console.log('🔄 [SYNC] Sync click — 1 rule: newest overwrites oldest');
        const syncResult = await performUnifiedSync(auth.businessId);
        if (syncResult.success) {
          console.log(`✅ [SYNC] Unified sync completed successfully (${syncResult.direction})`);
          console.log('   Synced:', syncResult.synced);
          await refreshAfterSync();
        } else {
          console.warn('⚠️ [SYNC] Sync failed:', syncResult.errors);
          const message = syncResult.errors?.length
            ? syncResult.errors.join('\n')
            : 'Sync failed. Last known good state preserved. Try again.';
          Alert.alert('Sync failed', message, [{ text: 'OK' }]);
        }
      } else {
        console.error('No business ID found for sync');
      }
    } catch (error) {
      console.error('Error syncing:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutBusiness();
      console.log('✅ Logged out successfully');
      onClose();
      // Call onLogout callback to trigger App.tsx to show login screen
      if (onLogout) {
        console.log('[CompanyMenuModal] Calling onLogout callback');
        onLogout();
      } else {
        console.error('[CompanyMenuModal] onLogout callback is missing!');
      }
    } catch (error) {
      console.error('Error logging out:', error);
      // Still call onLogout even if logoutBusiness fails
      if (onLogout) {
        onLogout();
      }
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === 'logout') {
      handleLogout();
    } else if (action === 'sync') {
      handleSync();
    } else if (action === 'theme') {
      // Toggle theme
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      // TODO: Implement theme system
      console.log('Theme changed to:', newTheme);
      onClose();
    } else {
      onClose();
      onNavigate(action);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Company Logo */}
            <View style={styles.logoSection}>
              {businessLogo ? (
                <Image
                  source={{uri: businessLogo}}
                  style={styles.modalLogo}
                  resizeMode="cover"
                />
              ) : ccLogoImage ? (
                <Image
                  source={ccLogoImage}
                  style={styles.modalLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>CC</Text>
                </View>
              )}
            </View>

            {/* Company Name */}
            <Text style={styles.companyName} numberOfLines={1}>
              {businessName}
            </Text>

            {/* Email Address */}
            <Text style={styles.emailText} numberOfLines={1}>
              {businessEmail || 'No email'}
            </Text>

            <View style={styles.divider} />

            {/* Menu Items */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('Home')}>
              <Text style={styles.menuItemText}>Dashboard</Text>
              <Text style={styles.menuItemIcon}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('Business')}>
              <Text style={styles.menuItemText}>View Account</Text>
              <Text style={styles.menuItemIcon}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('sync')}>
              <Text style={styles.menuItemText}>Sync</Text>
              <Text style={styles.menuItemIcon}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('create-team')}>
              <Text style={styles.menuItemText}>Create Team</Text>
              <Text style={styles.menuItemIcon}>→</Text>
            </TouchableOpacity>

            {/* Theme Toggle */}
            <View style={styles.menuItem}>
              <Text style={styles.menuItemText}>Theme</Text>
              <View style={styles.themeToggle}>
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    theme === 'light' && styles.themeButtonActive,
                  ]}
                  onPress={() => {
                    setTheme('light');
                    // TODO: Implement theme change
                  }}>
                  <Text style={[
                    styles.themeIcon,
                    theme === 'light' && styles.themeIconActive,
                  ]}>☀️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    theme === 'dark' && styles.themeButtonActive,
                  ]}
                  onPress={() => {
                    setTheme('dark');
                    // TODO: Implement theme change
                  }}>
                  <Text style={[
                    styles.themeIcon,
                    theme === 'dark' && styles.themeIconActive,
                  ]}>🌙</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('Home')}>
              <Text style={styles.menuItemText}>Homepage</Text>
              <Text style={styles.menuItemIcon}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('logout')}>
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
              <Text style={styles.menuItemIcon}>→</Text>
            </TouchableOpacity>

            {/* Upgrade Button */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                // TODO: Implement upgrade flow
                console.log('Upgrade clicked');
              }}>
              <Text style={styles.upgradeButtonText}>Upgrade now!</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingLeft: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  modalContainer: {
    width: 280,
    maxHeight: '90%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  content: {
    padding: 10,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  modalLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutral[200],
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 12,
    color: Colors.neutral[600],
    textAlign: 'center',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral[200],
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  menuItemText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  logoutText: {
    color: '#dc3545',
  },
  menuItemIcon: {
    fontSize: 16,
    color: Colors.neutral[400],
  },
  themeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtonActive: {
    backgroundColor: Colors.secondary,
  },
  themeIcon: {
    fontSize: 16,
  },
  themeIconActive: {
    // No special styling needed, just for consistency
  },
  upgradeButton: {
    marginTop: 12,
    backgroundColor: Colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default CompanyMenuModal;

