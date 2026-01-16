import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {Colors} from '../constants/Colors';
import QRCode from 'react-native-qrcode-svg';

interface RewardQRCodeModalProps {
  visible: boolean;
  rewardName: string;
  qrValue: string;
  onClose: () => void;
  onNavigate?: (screen: string) => void;
  rewardId?: string;
}

const RewardQRCodeModal: React.FC<RewardQRCodeModalProps> = ({
  visible,
  rewardName,
  qrValue,
  onClose,
  onNavigate,
  rewardId,
}) => {
  const handleEditReward = () => {
    onClose();
    if (onNavigate && rewardId) {
      onNavigate(`EditReward${rewardId}`);
    }
  };

  const handleAnalytics = () => {
    onClose();
    if (onNavigate && rewardId) {
      onNavigate(`Analytics${rewardId}`);
    }
  };

  console.log('[RewardQRCodeModal] Rendering modal, visible:', visible, 'rewardName:', rewardName);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{rewardName || 'Reward'}</Text>
          
          {/* QR Code */}
          <View style={styles.qrCodeContainer}>
            {qrValue ? (
              <QRCode
                value={qrValue}
                size={200}
                color={Colors.text.primary}
                backgroundColor={Colors.background}
                quietZone={10}
                onError={(error) => {
                  console.error('[RewardQRCodeModal] QR code generation error:', error);
                }}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrIcon}>📱</Text>
                <Text style={styles.qrText}>No QR Code</Text>
              </View>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={handleEditReward}>
              <Text style={styles.editButtonText}>Edit Reward</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.analyticsButton]}
              onPress={handleAnalytics}>
              <Text style={styles.analyticsButtonText}>Analytics</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    marginBottom: 24,
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
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  button: {
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
  closeButton: {
    backgroundColor: Colors.neutral[200],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});

export default RewardQRCodeModal;

