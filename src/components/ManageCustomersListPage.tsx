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
    totalScans: number;
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
        list.map((token) =>
          token.customers.length === 0 ? (
            <View key={token.tokenId} style={styles.tokenLine}>
              <Text style={styles.tokenNameInline}>{token.name}:</Text>
              <Text style={styles.noCustomers}>No customers active</Text>
            </View>
          ) : (
            token.customers.map((c) => (
              <View key={`${token.tokenId}-${c.customerId}`} style={styles.tokenLine}>
                <Text style={styles.customerName}>{c.customerName}</Text>
                <Text style={styles.lineSeparator}>—</Text>
                <Text style={styles.tokenNameInline}>{token.name}:</Text>
                <Text style={styles.pointsText}>
                  {c.pointsEarned}/{c.pointsRequired}
                </Text>
                <Text style={styles.metaLabel}>Last purchase</Text>
                <Text style={styles.metaValue}>{formatLastPurchase(c.lastScanAt)}</Text>
                <Text style={styles.metaLabel}>No. of visits in last 30 days</Text>
                <Text style={styles.metaValue}>{c.scansLast30}</Text>
                <Text style={styles.metaLabel}>Total visits</Text>
                <Text style={styles.metaValue}>{c.totalScans}</Text>
              </View>
            ))
          )
        )
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
