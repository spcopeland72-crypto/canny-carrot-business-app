import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';

interface ChatPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [message, setMessage] = useState('');
  const [messages] = useState([
    {id: '1', text: 'Hello! How can I help you today?', sender: 'support'},
    {id: '2', text: 'I need help with creating a new reward', sender: 'user'},
    {id: '3', text: 'I can help you with that. Let me guide you...', sender: 'support'},
  ]);

  const handleSend = () => {
    if (message.trim()) {
      // Handle send message
      setMessage('');
    }
  };

  return (
    <PageTemplate
      title="Customer Support"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <View style={styles.container}>
        <ScrollView style={styles.messagesContainer}>
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userMessage : styles.supportMessage,
              ]}>
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            placeholderTextColor={Colors.text.light}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  supportMessage: {
    backgroundColor: Colors.neutral[200],
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: Colors.background,
    fontWeight: '600',
  },
});

export default ChatPage;





















