import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Colors} from '../constants/Colors';

interface ScanModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned?: (data: string, type: string) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MODAL_MARGIN = 10;

const ScanModal: React.FC<ScanModalProps> = ({visible, onClose, onBarcodeScanned}) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    // Simulate a scan after 2 seconds
    setTimeout(() => {
      const mockData = `CANNY-CARROT-${Date.now()}`;
      if (onBarcodeScanned) {
        onBarcodeScanned(mockData, 'QR_CODE');
      }
      setIsScanning(false);
    }, 2000);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.content}>
            {/* QR Code Icon */}
            <View style={styles.qrContainer}>
              <Text style={styles.qrIcon}>📱</Text>
              <Text style={styles.qrTitle}>Scan QR Code</Text>
              <Text style={styles.qrSubtitle}>
                {isScanning ? 'Scanning...' : 'Position customer QR code in frame'}
              </Text>
            </View>

            {/* Scanner Preview */}
            <View style={styles.scannerPreview}>
              <View style={styles.scannerFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                {isScanning && (
                  <View style={styles.scanLine} />
                )}
              </View>
            </View>

            {/* SCAN Button */}
            <TouchableOpacity 
              style={[styles.scanButton, isScanning && styles.scanButtonDisabled]} 
              onPress={handleScan}
              disabled={isScanning}>
              <Text style={styles.scanButtonText}>
                {isScanning ? 'SCANNING...' : 'START SCAN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH - MODAL_MARGIN * 2,
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.background,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  scannerPreview: {
    width: 250,
    height: 250,
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  scannerFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.secondary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: Colors.secondary,
    top: '50%',
  },
  scanButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.background,
    letterSpacing: 1,
  },
});

export default ScanModal;

