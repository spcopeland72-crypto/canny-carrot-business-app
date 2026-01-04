import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';

interface ScanPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const ScanPage: React.FC<ScanPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  return (
    <PageTemplate
      title="Scan QR Code"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <View style={styles.content}>
        <Text style={styles.description}>
          Scan customer QR codes to verify stamps and rewards
        </Text>
        <View style={styles.scannerPlaceholder}>
          <Text style={styles.scannerIcon}>📷</Text>
          <Text style={styles.scannerText}>Camera Scanner</Text>
          <Text style={styles.scannerSubtext}>Position QR code in frame</Text>
        </View>
      </View>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  scannerPlaceholder: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 100,
  },
  scannerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  scannerText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  scannerSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});

export default ScanPage;





















