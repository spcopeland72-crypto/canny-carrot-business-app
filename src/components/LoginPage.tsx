/**
 * Login Page for Business App
 * Structured like screenshot_20260104-221637
 * Authenticates against Canny Carrot Redis database
 */

import React, { useState } from 'react';
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
  Image,
  Linking,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { loginBusiness } from '../services/authService';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Debug: Log component mount
  React.useEffect(() => {
    console.log('[LoginPage] Component mounted');
    console.log('[LoginPage] onLoginSuccess prop:', typeof onLoginSuccess);
    return () => {
      console.log('[LoginPage] Component unmounting');
    };
  }, [onLoginSuccess]);

  const handleLogin = async () => {
    console.log('[LoginPage] handleLogin called');
    console.log('[LoginPage] Email:', email);
    console.log('[LoginPage] Password length:', password?.length || 0);
    
    if (!email || !email.includes('@')) {
      console.log('[LoginPage] Email validation failed');
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password || password.length < 8) {
      console.log('[LoginPage] Password validation failed');
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    console.log('[LoginPage] Starting login process...');
    setIsLoading(true);
    try {
      console.log('[LoginPage] Calling loginBusiness...');
      const auth = await loginBusiness(email, password);
      console.log('[LoginPage] loginBusiness returned:', { 
        hasAuth: !!auth, 
        isAuthenticated: auth?.isAuthenticated 
      });
      if (auth && auth.isAuthenticated) {
        console.log('[LoginPage] Login successful, calling onLoginSuccess');
        onLoginSuccess();
      } else {
        console.log('[LoginPage] Login failed - invalid credentials');
        Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
      }
    } catch (error: any) {
      console.error('[LoginPage] Login error:', error);
      console.error('[LoginPage] Error message:', error?.message);
      console.error('[LoginPage] Error stack:', error?.stack);
      Alert.alert('Login Failed', error.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('[LoginPage] Login process completed');
    }
  };

  const handleForgotPassword = () => {
    // Link to website forgot password page
    Linking.openURL('https://cannycarrot.com/forgot-password').catch(err =>
      console.error('Failed to open forgot password page:', err)
    );
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://cannycarrot.com/terms').catch(err =>
      console.error('Failed to open terms page:', err)
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://cannycarrot.com/privacy').catch(err =>
      console.error('Failed to open privacy page:', err)
    );
  };

  const handleCustomerSupport = () => {
    Linking.openURL('https://cannycarrot.com/contact').catch(err =>
      console.error('Failed to open support page:', err)
    );
  };

  const handleCreateAccount = () => {
    // Link to business registration on website
    Linking.openURL('https://cannycarrot.com/register').catch(err =>
      console.error('Failed to open registration page:', err)
    );
  };

  // Try to load logo - fallback to text if image not found
  let logoImage = null;
  try {
    logoImage = require('../../assets/canny-carrot-logo.png');
  } catch (e) {
    // Logo not found - will use text fallback
  }

  try {
    logoImage = require('../../assets/login-icon.png');
  } catch (e) {
    // Fallback handled
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            {logoImage ? (
              <Image source={logoImage} style={styles.logo} resizeMode="contain" />
            ) : (
              <Text style={styles.logoText}>Canny Carrot</Text>
            )}
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Sign in to your business account</Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                  placeholderTextColor={Colors.text.secondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.text.secondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
              disabled={isLoading}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={(e) => {
                console.log('[LoginPage] Login button pressed', e);
                e?.preventDefault?.();
                handleLogin();
              }}
              onPressIn={() => console.log('[LoginPage] Login button press started')}
              disabled={isLoading}
              activeOpacity={0.7}
              testID="login-button">
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>

            {/* Create Account Link */}
            <View style={styles.createAccountContainer}>
              <Text style={styles.createAccountText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleCreateAccount} disabled={isLoading}>
                <Text style={styles.createAccountLink}>Create one</Text>
              </TouchableOpacity>
            </View>

            {/* Links Footer */}
            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={handleTermsOfService} disabled={isLoading}>
                <Text style={styles.linkText}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={styles.linkSeparator}>•</Text>
              <TouchableOpacity onPress={handlePrivacyPolicy} disabled={isLoading}>
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.linkSeparator}>•</Text>
              <TouchableOpacity onPress={handleCustomerSupport} disabled={isLoading}>
                <Text style={styles.linkText}>Customer Support</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  showPasswordButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  showPasswordText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  createAccountText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  createAccountLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[300],
  },
  linkText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  linkSeparator: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginHorizontal: 8,
  },
});

export default LoginPage;

