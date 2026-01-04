import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import {Colors} from '../constants/Colors';

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onScanPress?: () => void;
}

// Use emoji fallback instead of dynamic image requires
const qrImage = null;

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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 4,
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
    fontSize: 20,
    marginBottom: 4,
  },
  navIconActive: {
    color: Colors.secondary,
  },
  navLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  scanIcon: {
    fontSize: 24,
  },
  scanIconImage: {
    width: 24,
    height: 24,
  },
});

export default BottomNavigation;




