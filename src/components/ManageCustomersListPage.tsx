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

/** Customer record from API (Redis): has rewards[] with businessId per item */
interface ApiCustomer {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  rewards?: Array<{ id: string; name?: string; businessId?: string }>;
}

interface CustomerEntry {
  id: string;
  name: string;
  rewardNames: string[];
  campaignNames: string[];
}

interface ManageCustomersListPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const ManageCustomersListPage: React.FC<ManageCustomersListPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [list, setList] = useState<CustomerEntry[]>([]);
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
          setList([]);
          return;
        }
        const res = await fetch(
          `${API_BASE_URL}/api/v1/businesses/${businessId}/customers?limit=200`
        );
        if (!res.ok) {
          setError(`Failed to load customers (${res.status})`);
          setList([]);
          return;
        }
        const json = await res.json();
        const customers: ApiCustomer[] = json.data ?? [];
        const businessIdNorm = businessId.trim();
        const entries: CustomerEntry[] = customers
          .filter((c): c is ApiCustomer => c != null && c.id)
          .map((c) => {
            const name =
              [c.firstName, c.lastName].filter(Boolean).join(' ') ||
              (c.name && c.name.trim()) ||
              c.email ||
              'Customer';
            const rewards = c.rewards ?? [];
            const forBusiness = rewards.filter(
              (r) => (r.businessId ?? '').trim() === businessIdNorm
            );
            const rewardNames: string[] = [];
            const campaignNames: string[] = [];
            for (const r of forBusiness) {
              const displayName = (r.name ?? '').trim() || r.id;
              if ((r.id ?? '').startsWith('campaign-')) {
                campaignNames.push(displayName);
              } else {
                rewardNames.push(displayName);
              }
            }
            return {
              id: c.id,
              name: name.trim() || 'Customer',
              rewardNames,
              campaignNames,
            };
          });
        if (!cancelled) {
          setList(entries);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setList([]);
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
            <Text style={styles.loadingText}>Loading customers…</Text>
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
            {list.length === 0 ? (
              <Text style={styles.emptyText}>No customers yet</Text>
            ) : (
              list.map((entry) => (
                <View key={entry.id} style={styles.card}>
                  <Text style={styles.customerName}>{entry.name}</Text>
                  {entry.rewardNames.length > 0 && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Rewards: </Text>
                      <Text style={styles.value}>
                        {entry.rewardNames.join(', ')}
                      </Text>
                    </View>
                  )}
                  {entry.campaignNames.length > 0 && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Campaigns: </Text>
                      <Text style={styles.value}>
                        {entry.campaignNames.join(', ')}
                      </Text>
                    </View>
                  )}
                  {entry.rewardNames.length === 0 &&
                    entry.campaignNames.length === 0 && (
                      <Text style={styles.noData}>
                        No rewards or campaigns for this business
                      </Text>
                    )}
                </View>
              ))
            )}
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
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  value: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  noData: {
    fontSize: 14,
    color: Colors.text.light,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default ManageCustomersListPage;
