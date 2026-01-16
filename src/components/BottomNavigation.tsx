import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image, Platform} from 'react-native';
import {Colors} from '../constants/Colors';

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onScanPress?: () => void;
}

// Load QR code image for scan button
let qrImage = null;
try {
  qrImage = require('../../Images/qr.png');
} catch (e) {
  // Image not found, will use emoji fallback
  qrImage = null;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
  onScanPress,
}) => {
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('Home')}>
        <Text style={styles.navIcon}>☰</Text>
        <Text
          style={[
            styles.navLabel,
            currentScreen === 'Home' && styles.navLabelActive,
          ]}>
          Home
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('Search')}>
        <Text style={styles.navIcon}>🔍</Text>
        <Text
          style={[
            styles.navLabel,
            currentScreen === 'Search' && styles.navLabelActive,
          ]}>
          Search
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItemCenter}
        onPress={() => {
          if (onScanPress) {
            onScanPress();
          } else {
            onNavigate('Scan');
          }
        }}>
        <View style={styles.scanButton}>
          {qrImage ? (
            <Image
              source={qrImage}
              style={styles.scanIconImage}
              resizeMode="contain"
              onError={() => {
                console.log('QR image failed to load');
              }}
            />
          ) : (
            <Text style={styles.scanIcon}>📷</Text>
          )}
        </View>
        <Text
          style={[
            styles.navLabel,
            currentScreen === 'Scan' && styles.navLabelActive,
          ]}>
          Scan
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('Help')}>
        <Text style={styles.navIcon}>❓</Text>
        <Text
          style={[
            styles.navLabel,
            currentScreen === 'Help' && styles.navLabelActive,
          ]}>
          Help
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('More')}>
        <Text
          style={[
            styles.navIcon,
            currentScreen === 'More' && styles.navIconActive,
          ]}>
          ⋯
        </Text>
        <Text
          style={[
            styles.navLabel,
            currentScreen === 'More' && styles.navLabelActive,
          ]}>
          More
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    ...Platform.select({
      web: {
        position: 'fixed' as const,
        bottom: -11, // Moved lower by 11px (5px + 3px + 2px + 1px) - EXACT customer app
        left: 0,
        right: 0,
        zIndex: 100,
      },
      default: {
        position: 'absolute' as const,
        bottom: -11, // Moved lower by 11px (5px + 3px + 2px + 1px) - EXACT customer app
        left: 0,
        right: 0,
        zIndex: 100,
      },
    }),
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: 8,
    paddingBottom: 14, // Reduced by 6px from 20 - EXACT customer app
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navItemCenter: {
    alignItems: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navIconActive: {
    color: Colors.secondary,
  },
  navLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  scanIcon: {
    fontSize: 28,
  },
  scanIconImage: {
    width: 28,
    height: 28,
    // No tintColor - display QR code in original colors
  },
});

export default BottomNavigation;




