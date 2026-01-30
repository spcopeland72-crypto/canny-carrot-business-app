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

const API_BASE_URL = 'https://api.cannycarrot.com';

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
  }>;
}

interface ManageCustomersListPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

function formatLastCollected(iso: string | null): string {
  if (!iso || !iso.trim()) return 'Never';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Never';
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Never';
  }
}

const ManageCustomersListPage: React.FC<ManageCustomersListPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [tokens, setTokens] = useState<TokenWithCustomers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const auth = await getStoredAuth();
        const businessId = auth?.businessId;
        if (!businessId) {
          setError('Not logged in');
          setTokens([]);
          return;
        }
        const res = await fetch(
          `${API_BASE_URL}/api/v1/businesses/${businessId}/tokens/with-customers`
        );
        if (!res.ok) {
          setError(`Failed to load (${res.status})`);
          setTokens([]);
          return;
        }
        const json = await res.json();
        const list: TokenWithCustomers[] = json.data?.tokens ?? [];
        if (!cancelled) {
          setTokens(list);
          setError(null);
        }
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
  }, []);

  const rewards = tokens.filter((t) => t.type === 'reward');
  const campaigns = tokens.filter((t) => t.type === 'campaign');

  const renderTokenSection = (title: string, list: TokenWithCustomers[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {list.length === 0 ? (
        <Text style={styles.emptySection}>None yet</Text>
      ) : (
        list.map((token) => (
          <View key={token.tokenId} style={styles.tokenCard}>
            <Text style={styles.tokenName}>{token.name}</Text>
            {token.customers.length === 0 ? (
              <Text style={styles.noCustomers}>No customers active</Text>
            ) : (
              token.customers.map((c) => (
                <View key={c.customerId} style={styles.customerRow}>
                  <Text style={styles.customerName}>{c.customerName}</Text>
                  <Text style={styles.lastCollected}>
                    Last collected: {formatLastCollected(c.lastScanAt)}
                  </Text>
                </View>
              ))
            )}
          </View>
        ))
      )}
    </View>
  );

  return (
    <PageTemplate
      title="Manage Customers"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
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
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}>
            {renderTokenSection('Rewards', rewards)}
            {renderTokenSection('Campaigns', campaigns)}
            {/* Actions: add section when actions are first-class tokens */}
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
  tokenCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  noCustomers: {
    fontSize: 14,
    color: Colors.text.light,
    fontStyle: 'italic',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral[200],
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  lastCollected: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
});

export default ManageCustomersListPage;
