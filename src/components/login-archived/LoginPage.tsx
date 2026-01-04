/**
 * Login Page for Business App
 * Handles invitation-based registration and login
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../constants/Colors';
import {
  verifyInvitationToken,
  createBusinessAccount,
  loginBusiness,
  parseInvitationLink,
  type InvitationData,
} from '../services/authService';

interface LoginPageProps {
  onLoginSuccess: () => void;
  initialInvitationUrl?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, initialInvitationUrl }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState('');
  const [businessId, setBusinessId] = useState('');

  useEffect(() => {
    // Check if there's an initial invitation URL
    if (initialInvitationUrl) {
      handleInvitationUrl(initialInvitationUrl);
    }
  }, [initialInvitationUrl]);

  const handleInvitationUrl = async (url: string) => {
    try {
      const { token, businessId: id } = parseInvitationLink(url);
      if (token && id) {
        setInvitationToken(token);
        setBusinessId(id);
        await verifyInvitation(token, id);
      }
    } catch (error) {
      console.error('Error parsing invitation URL:', error);
    }
  };

  const verifyInvitation = async (token: string, id: string) => {
    setIsLoading(true);
    try {
      const data = await verifyInvitationToken(token, id);
      if (data) {
        setInvitationData(data);
        // Don't pre-fill email - user enters their own email
        setEmail('');
        setIsRegistering(true);
        Alert.alert(
          'Invitation Verified',
          `Welcome! Please create your account for ${data.businessName}. Your business information will be loaded after you create your account and log in.`
        );
      } else {
        Alert.alert('Invalid Invitation', 'This invitation link is invalid or has expired.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify invitation. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!invitationData) {
      Alert.alert('Error', 'Invalid invitation data');
      return;
    }

    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password || password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const auth = await createBusinessAccount(invitationData, email, password, confirmPassword);
      if (auth) {
        Alert.alert('Success', 'Account created successfully! Your business information will now be loaded.');
        onLoginSuccess();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const auth = await loginBusiness(email, password);
      if (auth) {
        onLoginSuccess();
      } else {
        Alert.alert('Error', 'Invalid email or password');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualInvitation = () => {
    if (!invitationToken || !businessId) {
      Alert.alert('Error', 'Please enter both invitation token and business ID');
      return;
    }
    verifyInvitation(invitationToken, businessId);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>🥕</Text>
          <Text style={styles.title}>Canny Carrot Business</Text>
          <Text style={styles.subtitle}>
            {isRegistering ? 'Create Your Account' : 'Login to Your Account'}
          </Text>
        </View>

        {!isRegistering && !invitationData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Have an Invitation Link?</Text>
            <TextInput
              style={styles.input}
              placeholder="Invitation Token"
              value={invitationToken}
              onChangeText={setInvitationToken}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Business ID"
              value={businessId}
              onChangeText={setBusinessId}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleManualInvitation}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Verify Invitation</Text>
            </TouchableOpacity>
          </View>
        )}

        {invitationData && (
          <View style={styles.invitationInfo}>
            <Text style={styles.infoTitle}>Welcome!</Text>
            <Text style={styles.infoText}>
              Business: {invitationData.businessName}
            </Text>
            <Text style={styles.infoSubtext}>
              Please create your account below. Your business information will be loaded from the database after you create your account and log in.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {isRegistering && (
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          )}

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={isRegistering ? handleRegister : handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading
                ? 'Please wait...'
                : isRegistering
                ? 'Create Account'
                : 'Login'}
            </Text>
          </TouchableOpacity>

          {!invitationData && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setIsRegistering(!isRegistering)}
            >
              <Text style={styles.linkText}>
                {isRegistering
                  ? 'Already have an account? Login'
                  : "Don't have an account? Use invitation link"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  invitationInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: Colors.primary + '20',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    padding: 10,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
  },
});

export default LoginPage;

