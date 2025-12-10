import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors} from '../constants/Colors';

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate,
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
        onPress={() => onNavigate('Business')}>
        <Text style={styles.navIcon}>🏢</Text>
        <Text
          style={[
            styles.navLabel,
            currentScreen === 'Business' && styles.navLabelActive,
          ]}>
          Business
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
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default BottomNavigation;

