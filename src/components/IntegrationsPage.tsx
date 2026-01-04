import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import {Colors} from '../constants/Colors';
import BottomNavigation from './BottomNavigation';

interface IntegrationsPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  onScanPress?: () => void;
}

interface Platform {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'coming_soon' | 'manual_only';
  icon: string;
  setupTime: string;
  features: string[];
}

interface Connection {
  id: string;
  platform: string;
  status: 'connected' | 'error' | 'pending';
  platformShopName?: string;
  storeUrl?: string;
  syncStatus?: {
    totalOrdersSynced: number;
    totalStampsIssued: number;
    lastSyncAt?: string;
  };
}

const API_BASE = 'http://localhost:3001/api/v1';
const BUSINESS_ID = 'demo-business-123'; // In production, get from auth context

const IntegrationsPage: React.FC<IntegrationsPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  onScanPress,
}) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [shopifyShop, setShopifyShop] = useState('');
  const [manualOrderModalVisible, setManualOrderModalVisible] = useState(false);
  const [manualOrder, setManualOrder] = useState({
    platform: 'vinted',
    customerEmail: '',
    orderReference: '',
    orderValue: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch platforms
      const platformsRes = await fetch(`${API_BASE}/integrations/platforms`);
      const platformsData = await platformsRes.json();
      if (platformsData.success) {
        setPlatforms(platformsData.data);
      }
      
      // Fetch connections
      const connectionsRes = await fetch(`${API_BASE}/integrations/connections?businessId=${BUSINESS_ID}`);
      const connectionsData = await connectionsRes.json();
      if (connectionsData.success) {
        setConnections(connectionsData.data);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPlatform = (platform: Platform) => {
    if (platform.status === 'coming_soon') {
      Alert.alert('Coming Soon', `${platform.name} integration is coming soon! We'll notify you when it's available.`);
      return;
    }
    
    if (platform.status === 'manual_only') {
      setManualOrderModalVisible(true);
      return;
    }
    
    setSelectedPlatform(platform);
    setConnectModalVisible(true);
  };

  const handleShopifyConnect = async () => {
    if (!shopifyShop.trim()) {
      Alert.alert('Error', 'Please enter your Shopify store URL');
      return;
    }
    
    let shop = shopifyShop.trim();
    // Normalize shop domain
    shop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!shop.includes('.myshopify.com')) {
      shop = `${shop}.myshopify.com`;
    }
    
    // Open OAuth flow in browser
    const authUrl = `${API_BASE}/integrations/shopify/connect?businessId=${BUSINESS_ID}&shop=${shop}`;
    
    try {
      await Linking.openURL(authUrl);
      setConnectModalVisible(false);
      setShopifyShop('');
      
      // Poll for connection status
      setTimeout(fetchData, 5000);
    } catch (error) {
      Alert.alert('Error', 'Failed to open Shopify authorization page');
    }
  };

  const handleManualOrderSubmit = async () => {
    if (!manualOrder.customerEmail || !manualOrder.orderValue) {
      Alert.alert('Error', 'Customer email and order value are required');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/integrations/manual/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: BUSINESS_ID,
          ...manualOrder,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          'Success! 🥕',
          data.data.status === 'completed' 
            ? 'Stamp issued to customer!'
            : 'Customer invited to join Canny Carrot!',
        );
        setManualOrderModalVisible(false);
        setManualOrder({ platform: 'vinted', customerEmail: '', orderReference: '', orderValue: '' });
        fetchData();
      } else {
        Alert.alert('Error', data.error || 'Failed to process order');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit order');
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    Alert.alert(
      'Disconnect Store',
      'Are you sure you want to disconnect this store? You can reconnect later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE}/integrations/shopify/connection/${connectionId}`, {
                method: 'DELETE',
              });
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect store');
            }
          },
        },
      ]
    );
  };

  const getConnectionForPlatform = (platformId: string) => {
    return connections.find(c => c.platform === platformId);
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />
      
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Integrations</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{connections.length}</Text>
            <Text style={styles.statLabel}>Connected</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {connections.reduce((sum, c) => sum + (c.syncStatus?.totalOrdersSynced || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Orders Synced</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {connections.reduce((sum, c) => sum + (c.syncStatus?.totalStampsIssued || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Stamps Issued</Text>
          </View>
        </View>

        {/* Connected Platforms */}
        {connections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONNECTED PLATFORMS</Text>
            {connections.map(connection => (
              <View key={connection.id} style={styles.connectionCard}>
                <View style={styles.connectionHeader}>
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionIcon}>
                      {platforms.find(p => p.id === connection.platform)?.icon || '🔗'}
                    </Text>
                    <View>
                      <Text style={styles.connectionName}>
                        {connection.platformShopName || connection.platform}
                      </Text>
                      <Text style={styles.connectionUrl}>{connection.storeUrl}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    connection.status === 'connected' && styles.statusConnected,
                    connection.status === 'error' && styles.statusError,
                  ]}>
                    <Text style={styles.statusText}>
                      {connection.status === 'connected' ? '● Connected' : '⚠ Error'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.connectionStats}>
                  <View style={styles.connectionStat}>
                    <Text style={styles.connectionStatValue}>
                      {connection.syncStatus?.totalOrdersSynced || 0}
                    </Text>
                    <Text style={styles.connectionStatLabel}>Orders</Text>
                  </View>
                  <View style={styles.connectionStat}>
                    <Text style={styles.connectionStatValue}>
                      {connection.syncStatus?.totalStampsIssued || 0}
                    </Text>
                    <Text style={styles.connectionStatLabel}>Stamps</Text>
                  </View>
                  <View style={styles.connectionStat}>
                    <Text style={styles.connectionStatValue}>
                      {formatLastSync(connection.syncStatus?.lastSyncAt)}
                    </Text>
                    <Text style={styles.connectionStatLabel}>Last Sync</Text>
                  </View>
                </View>
                
                <View style={styles.connectionActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>⚙️ Settings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.disconnectButton]}
                    onPress={() => handleDisconnect(connection.id)}
                  >
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Available Platforms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AVAILABLE INTEGRATIONS</Text>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.secondary} />
          ) : (
            platforms.map(platform => {
              const connection = getConnectionForPlatform(platform.id);
              if (connection) return null; // Already connected, show above
              
              return (
                <TouchableOpacity
                  key={platform.id}
                  style={styles.platformCard}
                  onPress={() => handleConnectPlatform(platform)}
                >
                  <View style={styles.platformHeader}>
                    <Text style={styles.platformIcon}>{platform.icon}</Text>
                    <View style={styles.platformInfo}>
                      <Text style={styles.platformName}>{platform.name}</Text>
                      <Text style={styles.platformDescription}>{platform.description}</Text>
                    </View>
                    {platform.status === 'coming_soon' ? (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                      </View>
                    ) : platform.status === 'manual_only' ? (
                      <View style={styles.manualBadge}>
                        <Text style={styles.manualText}>Manual</Text>
                      </View>
                    ) : (
                      <Text style={styles.connectArrow}>→</Text>
                    )}
                  </View>
                  
                  <View style={styles.platformFeatures}>
                    {platform.features.slice(0, 3).map((feature, index) => (
                      <Text key={index} style={styles.featureItem}>✓ {feature}</Text>
                    ))}
                  </View>
                  
                  <Text style={styles.setupTime}>⏱ Setup: {platform.setupTime}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Manual Order Entry */}
        <TouchableOpacity 
          style={styles.manualEntryCard}
          onPress={() => setManualOrderModalVisible(true)}
        >
          <Text style={styles.manualEntryIcon}>✏️</Text>
          <View>
            <Text style={styles.manualEntryTitle}>Manual Order Entry</Text>
            <Text style={styles.manualEntryDesc}>
              Enter sales from Vinted, markets, or other channels manually
            </Text>
          </View>
          <Text style={styles.connectArrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Connect Modal (Shopify) */}
      <Modal
        visible={connectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setConnectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Connect {selectedPlatform?.name}
              </Text>
              <TouchableOpacity onPress={() => setConnectModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedPlatform?.id === 'shopify' && (
              <View style={styles.modalContent}>
                <Text style={styles.modalLabel}>Your Shopify Store URL</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="yourstore.myshopify.com"
                  value={shopifyShop}
                  onChangeText={setShopifyShop}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.modalHint}>
                  Enter your store name (e.g., "myshop" or "myshop.myshopify.com")
                </Text>
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={handleShopifyConnect}
                >
                  <Text style={styles.modalButtonText}>Connect Shopify</Text>
                </TouchableOpacity>
                
                <Text style={styles.modalNote}>
                  You'll be redirected to Shopify to authorize the connection.
                  We only request read access to orders and customers.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Manual Order Modal */}
      <Modal
        visible={manualOrderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setManualOrderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Online Sale</Text>
              <TouchableOpacity onPress={() => setManualOrderModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Platform</Text>
              <View style={styles.platformPicker}>
                {['vinted', 'amazon', 'ebay', 'etsy', 'other'].map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.platformOption,
                      manualOrder.platform === p && styles.platformOptionSelected,
                    ]}
                    onPress={() => setManualOrder({...manualOrder, platform: p})}
                  >
                    <Text style={[
                      styles.platformOptionText,
                      manualOrder.platform === p && styles.platformOptionTextSelected,
                    ]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.modalLabel}>Customer Email *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="customer@email.com"
                value={manualOrder.customerEmail}
                onChangeText={(v) => setManualOrder({...manualOrder, customerEmail: v})}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <Text style={styles.modalLabel}>Order Reference (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="VINTED-12345"
                value={manualOrder.orderReference}
                onChangeText={(v) => setManualOrder({...manualOrder, orderReference: v})}
              />
              
              <Text style={styles.modalLabel}>Order Value (£) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="25.00"
                value={manualOrder.orderValue}
                onChangeText={(v) => setManualOrder({...manualOrder, orderValue: v})}
                keyboardType="decimal-pad"
              />
              
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleManualOrderSubmit}
              >
                <Text style={styles.modalButtonText}>Issue Stamp</Text>
              </TouchableOpacity>
              
              <Text style={styles.modalNote}>
                If the customer email matches a Canny Carrot member, they'll receive
                a stamp immediately. Otherwise, we'll invite them to join!
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        onScanPress={onScanPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: Colors.background,
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.background,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.secondary + '15',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  connectionCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  connectionUrl: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.neutral[100],
  },
  statusConnected: {
    backgroundColor: '#E8F5E9',
  },
  statusError: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E7D32',
  },
  connectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  connectionStat: {
    alignItems: 'center',
  },
  connectionStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  connectionStatLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  connectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    backgroundColor: Colors.neutral[100],
  },
  actionButtonText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  disconnectButton: {
    backgroundColor: '#FFEBEE',
  },
  disconnectButtonText: {
    fontSize: 14,
    color: '#C62828',
  },
  platformCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  platformDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  connectArrow: {
    fontSize: 24,
    color: Colors.secondary,
  },
  comingSoonBadge: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  manualBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  manualText: {
    fontSize: 11,
    color: '#E65100',
    fontWeight: '500',
  },
  platformFeatures: {
    marginTop: 12,
    marginLeft: 48,
  },
  featureItem: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  setupTime: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 8,
    marginLeft: 48,
  },
  manualEntryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  manualEntryIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  manualEntryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  manualEntryDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
    maxWidth: '80%',
  },
  bottomPadding: {
    height: 100,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  modalClose: {
    fontSize: 24,
    color: Colors.text.secondary,
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  modalHint: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 8,
  },
  modalButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  modalButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  modalNote: {
    fontSize: 12,
    color: Colors.text.light,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  platformPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  platformOptionSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  platformOptionText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  platformOptionTextSelected: {
    color: Colors.background,
    fontWeight: '600',
  },
});

export default IntegrationsPage;

