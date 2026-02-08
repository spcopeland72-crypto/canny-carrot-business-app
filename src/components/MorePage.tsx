import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';

const DITTOFEED_DASHBOARD_URL =
  (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_DITTOFEED_DASHBOARD_URL) ||
  'https://messaging.cannycarrot.com';

interface MorePageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width || 375;
const BUTTON_WIDTH = (SCREEN_WIDTH - 48) / 2;

const MorePage: React.FC<MorePageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const menuItems = [
    {id: '1', title: 'Business Profile', screen: 'Business', icon: '🏢'},
    {id: '2', title: 'Settings', screen: 'Settings', icon: '⚙️'},
    {id: '3', title: 'Analytics', screen: 'Analytics', icon: '📊'},
    {id: '4', title: 'Products', screen: 'Products', icon: '📦'},
    {id: '5', title: 'Reports', screen: 'Reports', icon: '📄'},
    {id: '6', title: 'About', screen: 'About', icon: 'ℹ️'},
    {id: '7', title: 'Event Log', screen: 'EventLog', icon: '📋'},
  ];

  const openMessagingDashboard = () => {
    Linking.openURL(DITTOFEED_DASHBOARD_URL).catch(() => {});
  };

  return (
    <PageTemplate
      title="More"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <View style={styles.content}>
        <ScrollView>
          {/* Top Two Large Buttons */}
          <View style={styles.topButtonsRow}>
            <TouchableOpacity
              style={[styles.largeButton, styles.businessButton, {marginRight: 8}]}
              onPress={() => onNavigate('Business')}>
              <Text style={styles.buttonIcon}>🏢</Text>
              <Text style={styles.buttonText}>Business →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.largeButton, styles.settingsButton, {marginLeft: 8}]}
              onPress={() => onNavigate('Settings')}>
              <Text style={styles.buttonIcon}>⚙️</Text>
              <Text style={styles.buttonText}>Settings →</Text>
            </TouchableOpacity>
          </View>

          {/* Messaging (Dittofeed) - opens dashboard in browser */}
          <TouchableOpacity style={styles.menuItem} onPress={openMessagingDashboard}>
            <Text style={styles.menuIcon}>📬</Text>
            <Text style={styles.menuTitle}>Messaging & campaigns</Text>
            <Text style={styles.menuArrow}>↗</Text>
          </TouchableOpacity>

          {/* Menu Items */}
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => onNavigate(item.screen)}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topButtonsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  largeButton: {
    flex: 1,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  businessButton: {
    backgroundColor: Colors.primary,
  },
  settingsButton: {
    backgroundColor: Colors.secondary,
  },
  buttonIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  menuArrow: {
    fontSize: 20,
    color: Colors.primary,
  },
});

export default MorePage;



