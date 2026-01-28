/**
 * Online admin console for the WooCommerce plugin.
 * Uses the online homescreen template: top bar, Canny Carrot Online banner, bottom nav.
 * Full admin form as in the plugin: API URL, Business ID, Store URL, keys, Connect/Disconnect.
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../constants/Colors';
import BottomNavigation from './BottomNavigation';
import HelpModal from './HelpModal';
import CompanyMenuModal from './CompanyMenuModal';
import {businessRepository} from '../services/localRepository';
import {getStoredAuth} from '../services/authService';

const PLUGIN_SETTINGS_KEY = 'canny_carrot_woocommerce_settings';

interface PluginSettings {
  api_base_url: string;
  business_id: string;
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  connection_id: string;
  order_status: string;
}

const defaultSettings: PluginSettings = {
  api_base_url: 'https://api.cannycarrot.com',
  business_id: '',
  store_url: '',
  consumer_key: '',
  consumer_secret: '',
  connection_id: '',
  order_status: 'wc-completed',
};

let logoImage: any = null;
let ccIconImage: any = null;
try {
  logoImage = require('../../assets/logo.png');
} catch (_e) {
  logoImage = null;
}
try {
  ccIconImage = require('../../assets/cc-icon-no-background.png');
} catch (_e) {
  ccIconImage = null;
}

let facebookIcon: any = null;
let instagramIcon: any = null;
let tiktokIcon: any = null;
let xIcon: any = null;
let linkedinIcon: any = null;
try {
  facebookIcon = require('../../Images/facebook.png');
  instagramIcon = require('../../Images/instagram.png');
  tiktokIcon = require('../../Images/tiktok.png');
  xIcon = require('../../Images/x.png');
  linkedinIcon = require('../../Images/linkedin.png');
} catch (_e) {
  // ignore
}

interface OnlineAdminPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
}

const OnlineAdminPage: React.FC<OnlineAdminPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  onLogout = () => {},
}) => {
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [companyMenuVisible, setCompanyMenuVisible] = useState(false);
  const [businessName, setBusinessName] = useState('Business');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [settings, setSettings] = useState<PluginSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  const loadBusinessProfile = async () => {
    try {
      const profile = await businessRepository.get();
      if (profile) {
        setBusinessName(profile.name || 'Business');
        setBusinessLogo(profile.logoIcon || profile.logo || null);
      }
      const auth = await getStoredAuth();
      if (auth?.businessId) {
        setSettings(prev => ({...prev, business_id: auth.businessId}));
      }
    } catch (e) {
      console.error('[OnlineAdminPage] loadBusinessProfile:', e);
    }
  };

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem(PLUGIN_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PluginSettings>;
        setSettings(prev => ({...defaultSettings, ...prev, ...parsed}));
      }
    } catch (e) {
      console.error('[OnlineAdminPage] loadSettings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessProfile();
    loadSettings();
  }, []);

  const saveSettings = async (updates: Partial<PluginSettings>) => {
    const next = {...settings, ...updates};
    setSettings(next);
    await AsyncStorage.setItem(PLUGIN_SETTINGS_KEY, JSON.stringify(next));
  };

  const handleConnect = async () => {
    const {api_base_url, business_id, store_url, consumer_key, consumer_secret, order_status} = settings;
    if (!api_base_url?.trim() || !business_id?.trim() || !store_url?.trim() || !consumer_key?.trim() || !consumer_secret?.trim()) {
      setMessage({type: 'error', text: 'API URL, Business ID, Store URL, Consumer Key, and Consumer Secret are required.'});
      return;
    }
    setConnecting(true);
    setMessage(null);
    try {
      const base = api_base_url.replace(/\/+$/, '');
      const url = `${base}/api/v1/integrations/woocommerce/connect`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business_id.trim(),
          storeUrl: store_url.trim().replace(/\/+$/, ''),
          consumerKey: consumer_key.trim(),
          consumerSecret: consumer_secret.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.data?.connectionId || data.connectionId)) {
        const connectionId = data.data?.connectionId || data.connectionId;
        await saveSettings({ connection_id: connectionId, order_status: order_status || 'wc-completed' });
        setMessage({type: 'success', text: 'Connected. Orders will be sent when they reach the chosen status.'});
      } else {
        setMessage({type: 'error', text: (data.error || data.message || res.statusText) || 'Connection failed.'});
      }
    } catch (e: any) {
      setMessage({type: 'error', text: e?.message || 'Network error.'});
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.confirm('Disconnect this store from Canny Carrot?')) {
      return;
    }
    const doDisconnect = async () => {
      await saveSettings({ connection_id: '' });
      setMessage({type: 'success', text: 'Disconnected from Canny Carrot.'});
    };
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Disconnect',
        'Disconnect this store from Canny Carrot?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: doDisconnect },
        ]
      );
    } else {
      doDisconnect();
    }
  };

  const connected = !!settings.connection_id?.trim();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header - same as online homescreen */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => setCompanyMenuVisible(true)}
            activeOpacity={0.7}>
            {businessLogo ? (
              <Image source={{uri: businessLogo}} style={[styles.logo, styles.businessLogo]} resizeMode="cover" />
            ) : logoImage ? (
              <Image source={logoImage} style={styles.logo} resizeMode="contain" />
            ) : (
              <Text style={styles.logoText}>CC</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.businessName} numberOfLines={1}>{businessName}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={[styles.iconButton, {marginRight: 12}]} onPress={() => setHelpModalVisible(true)}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>i</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, styles.modeButtonActive]}
              onPress={() => onNavigate('Home')}
              activeOpacity={0.7}>
              <Text style={[styles.modeButtonText, styles.modeButtonTextActive]}>In-store</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Canny Carrot Online banner - same as online homescreen */}
      <View style={styles.bannerSectionWrapper}>
        <View style={styles.bannerSection}>
          <View style={styles.bannerOnline}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitleOnline}>Canny Carrot</Text>
                <Text style={styles.bannerSubtitleOnline}>Online</Text>
                <View style={styles.socialIconsContainer}>
                  {facebookIcon && (
                    <TouchableOpacity style={[styles.socialIcon, {marginRight: 7}]} onPress={() => Linking.openURL('https://www.facebook.com/CannyCarrotRewards')}>
                      <Image source={facebookIcon} style={styles.socialIconImage} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                  {instagramIcon && (
                    <TouchableOpacity style={[styles.socialIcon, {marginRight: 7}]} onPress={() => Linking.openURL('https://www.instagram.com/cannycarrotrewards')}>
                      <Image source={instagramIcon} style={styles.socialIconImage} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                  {tiktokIcon && (
                    <TouchableOpacity style={[styles.socialIcon, {marginRight: 7}]} onPress={() => Linking.openURL('https://www.tiktok.com/@cannycarrotrewards')}>
                      <Image source={tiktokIcon} style={styles.socialIconImage} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                  {xIcon && (
                    <TouchableOpacity style={[styles.socialIcon, {marginRight: 7}]} onPress={() => Linking.openURL('https://twitter.com/CannyCarrotRew')}>
                      <Image source={xIcon} style={styles.socialIconImage} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                  {linkedinIcon && (
                    <TouchableOpacity style={styles.socialIcon} onPress={() => Linking.openURL('https://www.linkedin.com/company/canny-carrot-rewards')}>
                      <Image source={linkedinIcon} style={styles.socialIconImage} resizeMode="contain" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.bannerLogoContainer}>
                {ccIconImage ? (
                  <Image source={ccIconImage} style={styles.bannerLogoImage} resizeMode="contain" />
                ) : (
                  <View style={styles.bannerLogoPlaceholder}>
                    <Text style={styles.bannerLogoText}>Logo</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Canny Carrot</Text>
        <Text style={styles.pageSubtitle}>Connect your WooCommerce store to the Canny Carrot loyalty ecosystem.</Text>

        {message && (
          <View style={[styles.messageBox, message.type === 'error' ? styles.messageError : styles.messageSuccess]}>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        )}

        {!connected && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Are you already registered with Canny Carrot?</Text>
            <Text style={styles.noticeText}>Yes — Enter your API URL, Business ID, and WooCommerce keys below. Your online store will be linked to your Canny Carrot business.</Text>
            <Text style={styles.noticeText}>No — Register your business first (e.g. in the Business App or at cannycarrot.com), then return here and connect this store.</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://cannycarrot.com')}>
              <Text style={styles.noticeLink}>cannycarrot.com</Text>
            </TouchableOpacity>
          </View>
        )}

        {connected && (
          <View style={styles.connectedBox}>
            <Text style={styles.connectedLabel}>Status:</Text>
            <Text style={styles.connectedValue}>Connected ({settings.connection_id})</Text>
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>API Base URL</Text>
          <TextInput
            style={styles.input}
            value={settings.api_base_url}
            onChangeText={t => saveSettings({api_base_url: t})}
            placeholder="https://api.cannycarrot.com"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Business ID</Text>
          <TextInput
            style={styles.input}
            value={settings.business_id}
            onChangeText={t => saveSettings({business_id: t})}
            placeholder="Your Canny Carrot business ID"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Store URL</Text>
          <TextInput
            style={styles.input}
            value={settings.store_url}
            onChangeText={t => saveSettings({store_url: t})}
            placeholder="https://yourstore.com"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>Your WooCommerce store URL (used when connecting).</Text>

          <Text style={styles.label}>WooCommerce Consumer Key</Text>
          <TextInput
            style={styles.input}
            value={settings.consumer_key}
            onChangeText={t => saveSettings({consumer_key: t})}
            placeholder="ck_..."
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.hint}>WooCommerce → Settings → Advanced → REST API. Create a key with Read/Write.</Text>

          <Text style={styles.label}>WooCommerce Consumer Secret</Text>
          <TextInput
            style={styles.input}
            value={settings.consumer_secret}
            onChangeText={t => saveSettings({consumer_secret: t})}
            placeholder="cs_..."
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <Text style={styles.label}>Send order when status</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity
              style={[styles.radio, settings.order_status === 'wc-processing' && styles.radioActive]}
              onPress={() => saveSettings({order_status: 'wc-processing'})}>
              <Text style={[styles.radioText, settings.order_status === 'wc-processing' && styles.radioTextActive]}>Processing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radio, settings.order_status === 'wc-completed' && styles.radioActive]}
              onPress={() => saveSettings({order_status: 'wc-completed'})}>
              <Text style={[styles.radioText, settings.order_status === 'wc-completed' && styles.radioTextActive]}>Completed</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Orders are sent to Canny Carrot when they reach this status (configure in the plugin on your store).</Text>

          <TouchableOpacity
            style={[styles.primaryButton, connecting && styles.primaryButtonDisabled]}
            onPress={handleConnect}
            disabled={connecting}>
            {connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save & Connect</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNavigation currentScreen={currentScreen} onNavigate={onNavigate} />
      <HelpModal visible={helpModalVisible} onClose={() => setHelpModalVisible(false)} />
      <CompanyMenuModal
        visible={companyMenuVisible}
        onClose={() => setCompanyMenuVisible(false)}
        onNavigate={onNavigate}
        onLogout={onLogout}
        businessName={businessName}
        businessLogo={businessLogo}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.background },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  logoContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 50, height: 50 },
  businessLogo: { borderRadius: 25 },
  logoText: { fontSize: 18, fontWeight: 'bold', color: Colors.background },
  businessName: { fontSize: 18, fontWeight: '600', color: Colors.primary, flex: 1, textAlign: 'center', marginHorizontal: 12 },
  headerIcons: { flexDirection: 'row' },
  iconButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  modeButton: { width: 56, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: Colors.neutral[200] },
  modeButtonActive: { backgroundColor: Colors.primary },
  modeButtonText: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  modeButtonTextActive: { color: Colors.background },
  bannerSectionWrapper: { width: '100%', marginBottom: 0 },
  bannerSection: { marginBottom: 0, width: '100%', position: 'relative' },
  bannerOnline: { backgroundColor: '#6B7280', paddingHorizontal: 20, paddingVertical: 17, minHeight: 128, justifyContent: 'center', width: '100%' },
  bannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTextContainer: { flex: 1 },
  bannerTitleOnline: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  bannerSubtitleOnline: { fontSize: 21, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  socialIconsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  socialIcon: { width: 28, height: 28 },
  socialIconImage: { width: 28, height: 28 },
  bannerLogoContainer: { marginLeft: 16 },
  bannerLogoImage: { width: 48, height: 48 },
  bannerLogoPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerLogoText: { color: '#fff', fontSize: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingHorizontal: 16, paddingTop: 16 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: Colors.text.secondary, marginBottom: 16 },
  messageBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  messageSuccess: { backgroundColor: '#d4edda' },
  messageError: { backgroundColor: '#f8d7da' },
  messageText: { fontSize: 14, color: '#333' },
  noticeBox: { backgroundColor: '#e7f3ff', padding: 16, borderRadius: 8, marginBottom: 16 },
  noticeTitle: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, marginBottom: 8 },
  noticeText: { fontSize: 13, color: Colors.text.secondary, marginBottom: 6 },
  noticeLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  connectedBox: { backgroundColor: Colors.neutral[100], padding: 16, borderRadius: 8, marginBottom: 16 },
  connectedLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary, marginBottom: 4 },
  connectedValue: { fontSize: 14, color: Colors.text.primary, marginBottom: 12 },
  disconnectButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.neutral[300], borderRadius: 8 },
  disconnectButtonText: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  form: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  hint: { fontSize: 12, color: Colors.text.secondary, marginBottom: 12 },
  radioRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  radio: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: Colors.neutral[300] },
  radioActive: { borderColor: Colors.primary, backgroundColor: 'rgba(14,124,134,0.1)' },
  radioText: { fontSize: 14, color: Colors.text.secondary },
  radioTextActive: { color: Colors.primary, fontWeight: '600' },
  primaryButton: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: Colors.background },
});

export default OnlineAdminPage;
