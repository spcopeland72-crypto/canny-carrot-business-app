import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import {Colors} from '../constants/Colors';

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
  const handlePrint = async () => {
    try {
      // Generate QR code as base64 image
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
              @media print {
                body {
                  margin: 0;
                  padding: 20px;
                }
              }
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                text-align: center;
              }
              h1 {
                margin-bottom: 30px;
                text-align: center;
                font-size: 24px;
                color: #333;
              }
              .qr-container {
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 20px 0;
                padding: 20px;
                border: 2px solid #333;
                border-radius: 8px;
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div class="qr-container">
              <div id="qrcode"></div>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
              QRCode.toCanvas(document.getElementById('qrcode'), '${qrValue}', {
                width: 300,
                margin: 2
              }, function (error) {
                if (error) console.error(error);
              });
            </script>
          </body>
        </html>
      `;

      await Print.printAsync({
        html,
        base64: false,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to print QR code. Please try again.');
      console.error('Print error:', error);
    }
  };

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
              />
            ) : (
              <Text style={styles.errorText}>Unable to generate QR code</Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.printButton]}
              onPress={handlePrint}>
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
  errorText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default QRCodeModal;

