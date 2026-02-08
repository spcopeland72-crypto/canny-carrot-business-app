import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useMessageStore, type ChatMessage } from '../contexts/MessageStoreContext';
import { getMessagingLogo, useLogoForIdentity } from '../utils/messagingLogos';
import BottomNavigation from './BottomNavigation';

const CHAT_BLUE = '#2196F3';

interface MessageChatScreenProps {
  conversationId: string;
  currentScreen: string;
  onBack: () => void;
  onNavigate: (screen: string) => void;
  onScanPress?: () => void;
}

export default function MessageChatScreen({
  conversationId,
  currentScreen,
  onBack,
  onNavigate,
  onScanPress,
}: MessageChatScreenProps) {
  const { getConversation, addMessage, markConversationRead } = useMessageStore();
  const conv = getConversation(conversationId);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    if (conv) markConversationRead(conv.id);
  }, [conversationId, conv?.id, markConversationRead]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || !conv) return;
    addMessage(conv.id, t, 'me');
    setInput('');
  };

  if (!conv) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversation not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        {useLogoForIdentity(conv.identityId) && getMessagingLogo(conv.identityId) ? (
          <Image
            source={getMessagingLogo(conv.identityId)!}
            style={[styles.headerLogo, (conv.identityId === 'the-stables' || conv.identityId === 'stables') && styles.headerLogoStables]}
            resizeMode="contain"
          />
        ) : null}
        <Text style={styles.headerTitle} numberOfLines={1}>{conv.name}</Text>
        <TouchableOpacity style={styles.infoBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.infoIcon}>ⓘ</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>Today</Text>
          </View>
          {(Array.isArray(conv.messages) ? conv.messages : []).map((msg) => (
            <MessageBubble key={msg?.id ?? String(Math.random())} message={msg} />
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachBtn}>
            <Text style={styles.attachIcon}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#9e9e9e"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.emojiBtn} onPress={handleSend}>
            <Text style={styles.emojiIcon}>😊</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        onScanPress={onScanPress}
      />
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (!message) return null;
  const isMe = message.sender === 'me';
  if (message.type === 'voice') {
    return (
      <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapRight]}>
        <View style={[styles.bubble, styles.voiceBubble, isMe && styles.bubbleRight]}>
          <View style={styles.waveform}>
            {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.5, 0.7].map((h, i) => (
              <View key={i} style={[styles.waveBar, { height: `${h * 100}%` }]} />
            ))}
          </View>
          <Text style={styles.voiceDuration}>{message.voiceDuration || '02:30'}</Text>
          <TouchableOpacity style={styles.playBtn}>
            <Text style={styles.playIcon}>▶</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.time, isMe && styles.timeRight]}>{message.timestamp}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapRight]}>
      <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextRight]}>{message.text}</Text>
      </View>
      <Text style={[styles.time, isMe && styles.timeRight]}>{message.timestamp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  headerLogo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  headerLogoStables: {
    width: 34,
    height: 34,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  infoBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  datePill: {
    alignSelf: 'center',
    backgroundColor: '#e0e0e0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  datePillText: {
    fontSize: 13,
    color: '#616161',
    fontWeight: '500',
  },
  bubbleWrap: {
    marginBottom: 16,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  bubbleWrapRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: '100%',
  },
  bubbleLeft: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: CHAT_BLUE,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  bubbleTextRight: {
    color: '#fff',
  },
  time: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 4,
    marginLeft: 4,
  },
  timeRight: {
    marginLeft: 0,
    marginRight: 4,
    textAlign: 'right',
  },
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 180,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    marginRight: 10,
    gap: 3,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#9e9e9e',
    borderRadius: 2,
    minHeight: 4,
  },
  voiceDuration: {
    fontSize: 14,
    color: '#616161',
    marginRight: 10,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CHAT_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  playIcon: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5e5',
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CHAT_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 4,
  },
  attachIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  emojiBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  emojiIcon: {
    fontSize: 24,
  },
});
