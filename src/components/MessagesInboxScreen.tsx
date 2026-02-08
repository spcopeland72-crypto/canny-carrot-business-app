import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { useMessageStore } from '../contexts/MessageStoreContext';
import { getMessagingLogo, useLogoForIdentity } from '../utils/messagingLogos';
import BottomNavigation from './BottomNavigation';

const INBOX_GREEN = '#4CAF50';

interface MessagesInboxScreenProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onOpenChat: (conversationId: string) => void;
  onBack?: () => void;
  onScanPress?: () => void;
}

export default function MessagesInboxScreen({
  currentScreen,
  onNavigate,
  onOpenChat,
  onBack,
  onScanPress,
}: MessagesInboxScreenProps) {
  const { conversations, deleteConversation } = useMessageStore();
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const handleDeletePress = (e: any, id: string) => {
    e?.stopPropagation?.();
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const renderRow = ({ item }: { item: (typeof conversations)[0] }) => {
    if (!item) return null;
    const isRead = item.read;
    const showLogo = useLogoForIdentity(item.identityId);
    const logoSource = showLogo ? getMessagingLogo(item.identityId) : null;
    const isStables = item.identityId === 'the-stables' || item.identityId === 'stables';
    const logoSize = showLogo && isStables ? 56 : 36;
    return (
      <TouchableOpacity
        style={[styles.row, isRead && styles.rowRead]}
        activeOpacity={0.7}
        onPress={() => onOpenChat(item.id)}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, isRead && styles.rowRead, showLogo && isStables && styles.avatarLogoOnly]}>
            {showLogo && logoSource ? (
              <Image source={logoSource} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
            ) : (
              <Text style={[styles.avatarEmoji, isRead && styles.rowRead]}>{item.avatarEmoji}</Text>
            )}
          </View>
          {item.online && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, isRead && styles.rowRead]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.preview, isRead && styles.rowRead]} numberOfLines={2}>
            {item.lastMessage}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.timestamp, isRead && styles.rowRead]}>{item.lastTimestamp}</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={(e) => handleDeletePress(e, item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLogoTouch}
          onPress={() => (onBack ? onBack() : onNavigate('More'))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {getMessagingLogo(null) ? (
            <Image source={getMessagingLogo(null)!} style={styles.headerLogo} resizeMode="contain" />
          ) : (
            <Text style={styles.headerLogoPlaceholder}>←</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.infoButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <Modal
        visible={deleteConfirmId != null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}>
        <TouchableOpacity
          style={styles.deleteOverlay}
          activeOpacity={1}
          onPress={() => setDeleteConfirmId(null)}>
          <View style={styles.deleteModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.deleteModalTitle}>Delete conversation?</Text>
            <Text style={styles.deleteModalSubtitle}>This cannot be undone.</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity style={styles.deleteModalCancel} onPress={() => setDeleteConfirmId(null)}>
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteModalConfirm} onPress={handleConfirmDelete}>
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        onScanPress={onScanPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    position: 'relative',
  },
  headerLogoTouch: {
    padding: 4,
    zIndex: 1,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerLogoPlaceholder: {
    fontSize: 24,
    color: '#1a1a1a',
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  infoButton: {
    padding: 4,
    zIndex: 1,
  },
  infoIcon: {
    fontSize: 22,
    color: '#2196F3',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rowRead: {
    opacity: 0.5,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLogoOnly: {
    backgroundColor: 'transparent',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: INBOX_GREEN,
    borderWidth: 2,
    borderColor: '#fff',
  },
  body: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  preview: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
  },
  meta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 56,
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 13,
    color: '#9e9e9e',
    marginBottom: 2,
  },
  deleteBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 20,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteModalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deleteModalConfirm: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#d32f2f',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
