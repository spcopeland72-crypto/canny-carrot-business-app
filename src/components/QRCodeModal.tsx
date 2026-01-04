import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {Colors} from '../constants/Colors';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeModalProps {
  visible: boolean;
  title: string;
  qrValue: string;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  title,
  qrValue,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          
          <View style={styles.qrContainer}>
            {qrValue ? (
              <QRCode
                value={qrValue}
                size={200}
                color={Colors.text.primary}
                backgroundColor={Colors.background}
                logo={undefined}
                logoSize={30}
                logoBackgroundColor={Colors.background}
                logoMargin={2}
                logoBorderRadius={15}
                quietZone={10}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrIcon}>📱</Text>
                <Text style={styles.qrText}>QR Code</Text>
                <Text style={styles.qrValue} numberOfLines={2}>
                  No QR code value
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.printButton]}
              onPress={() => {
                // Print functionality - using window.print for web
                if (typeof window !== 'undefined') {
                  window.print();
                }
              }}>
              <Text style={styles.printButtonText}>Print</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
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
    marginBottom: 8,
  },
  qrValue: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButton: {
    backgroundColor: Colors.primary,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  closeButton: {
    backgroundColor: Colors.neutral[200],
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});

export default QRCodeModal;
