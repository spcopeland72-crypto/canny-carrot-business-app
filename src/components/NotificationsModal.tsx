import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {Colors} from '../constants/Colors';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (screen: string) => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  onNavigate = () => {},
}) => {
  const notifications = [
    {
      id: '1',
      title: 'New customer joined',
      message: 'John Smith has joined your rewards program',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      title: 'Reward redemption',
      message: 'Sarah Johnson redeemed a reward',
      time: '5 hours ago',
      read: false,
    },
    {
      id: '3',
      title: 'Campaign ending soon',
      message: 'Christmas Special campaign ends in 3 days',
      time: '1 day ago',
      read: true,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.unreadItem,
                ]}
                onPress={() => {
                  // Handle notification tap
                  onClose();
                }}>
                <Text style={styles.notificationTitle}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  closeButton: {
    fontSize: 24,
    color: Colors.text.secondary,
  },
  content: {
    padding: 16,
  },
  notificationItem: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.text.light,
  },
});

export default NotificationsModal;



