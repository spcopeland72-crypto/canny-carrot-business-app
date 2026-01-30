import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
import {getStoredAuth} from '../services/authService';
import {fetchManageCustomersData} from '../services/manageCustomersService';

/** Token (reward or campaign) with customers and analytics from API */
interface TokenWithCustomers {
  tokenId: string;
  type: 'reward' | 'campaign';
  name: string;
  customers: Array<{
    customerId: string;
    customerName: string;
    pointsEarned: number;
    pointsRequired: number;
    lastScanAt: string | null;
    scansLast30: number;
    scansLast90: number;
    totalScans: number;
  }>;
}

interface ManageCustomersListPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
}

const ManageCustomersListPage: React.FC<ManageCustomersListPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  onLogout,
}) => {
  const formatLastPurchase = (iso: string | null): string => {
    if (!iso || !iso.trim()) return 'Never';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'Never';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'Never';
    }
  };

  const [tokens, setTokens] = useState<TokenWithCustomers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always fetch latest from index when this screen is shown (no cache, no timestamps)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const auth = await getStoredAuth();
        const businessId = auth?.businessId;
        if (!businessId) {
          if (!cancelled) {
            setError('Not logged in');
            setTokens([]);
          }
          return;
        }
        const list = await fetchManageCustomersData(businessId);
        if (cancelled) return;
        if (list === null) {
          setError('Failed to load');
          setTokens([]);
          return;
        }
        setTokens(list);
        setError(null);
        const rewardCount = list.filter((t) => t.type === 'reward').length;
        const campaignCount = list.filter((t) => t.type === 'campaign').length;
        const campaignWithCustomers = list.filter((t) => t.type === 'campaign' && (t.customers?.length ?? 0) > 0).length;
        console.log('[ManageCustomers] Loaded tokens:', list.length, 'rewards:', rewardCount, 'campaigns:', campaignCount, 'campaigns-with-customers:', campaignWithCustomers);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setTokens([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentScreen]);

  // Customer-centric: one entry per customer with only their active rewards and campaigns + metadata
  type TokenEntry = {
    tokenId: string;
    name: string;
    pointsEarned: number;
    pointsRequired: number;
    lastScanAt: string | null;
    scansLast30: number;
    totalScans: number;
  };
  type CustomerWithTokens = {
    customerId: string;
    customerName: string;
    rewards: TokenEntry[];
    campaigns: TokenEntry[];
  };

  const customersWithTokens: CustomerWithTokens[] = (() => {
    const byCustomer = new Map<string, CustomerWithTokens>();
    for (const token of tokens) {
      for (const c of token.customers) {
        let row = byCustomer.get(c.customerId);
        if (!row) {
          row = { customerId: c.customerId, customerName: c.customerName, rewards: [], campaigns: [] };
          byCustomer.set(c.customerId, row);
        }
        const entry: TokenEntry = {
          tokenId: token.tokenId,
          name: token.name,
          pointsEarned: c.pointsEarned,
          pointsRequired: c.pointsRequired,
          lastScanAt: c.lastScanAt,
          scansLast30: c.scansLast30,
          totalScans: c.totalScans,
        };
        if (token.type === 'reward') row.rewards.push(entry);
        else row.campaigns.push(entry);
      }
    }
    return Array.from(byCustomer.values());
  })();

  const renderTokenLines = (items: TokenEntry[]) =>
    items.map((item) => (
      <View key={item.tokenId} style={styles.tokenLine}>
        <Text style={styles.tokenNameInline}>{item.name}:</Text>
        <Text style={styles.pointsText}>
          {item.pointsEarned}/{item.pointsRequired}
        </Text>
        <Text style={styles.metaLabel}>Last purchase</Text>
        <Text style={styles.metaValue}>{formatLastPurchase(item.lastScanAt)}</Text>
        <Text style={styles.metaLabel}>No. of visits in last 30 days</Text>
        <Text style={styles.metaValue}>{item.scansLast30}</Text>
        <Text style={styles.metaLabel}>Total visits</Text>
        <Text style={styles.metaValue}>{item.totalScans}</Text>
      </View>
    ));

  return (
    <PageTemplate
      title="Manage Customers"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}
      onLogout={onLogout}>
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : customersWithTokens.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptySection}>No customers yet</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}>
            {customersWithTokens.map((cust) => (
              <View key={cust.customerId} style={styles.customerSection}>
                <Text style={styles.customerNameHeading}>{cust.customerName}</Text>
                {cust.rewards.length > 0 && (
                  <View style={styles.subsection}>
                    <Text style={styles.subsectionTitle}>Rewards</Text>
                    {renderTokenLines(cust.rewards)}
                  </View>
                )}
                {cust.campaigns.length > 0 && (
                  <View style={styles.subsection}>
                    <Text style={styles.subsectionTitle}>Campaigns</Text>
                    {renderTokenLines(cust.campaigns)}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  errorText: {
    fontSize: 16,
    color: '#b91c1c',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },
  emptySection: {
    fontSize: 14,
    color: Colors.text.light,
    fontStyle: 'italic',
  },
  customerSection: {
    marginBottom: 24,
  },
  customerNameHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  subsection: {
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 4,
    marginBottom: 6,
  },
  tokenLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: 4,
  },
  tokenNameInline: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: 4,
  },
  pointsText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginLeft: 4,
    marginRight: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.primary,
    marginRight: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: 4,
  },
  lineSeparator: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginRight: 4,
  },
  noCustomers: {
    fontSize: 14,
    color: Colors.text.light,
    fontStyle: 'italic',
    marginLeft: 4,
  },
});

export default ManageCustomersListPage;
