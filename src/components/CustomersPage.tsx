import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  stampsCollected: number;
  rewardsEarned: number;
}

interface CustomersPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+44 7700 900123',
      stampsCollected: 8,
      rewardsEarned: 2,
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '+44 7700 900456',
      stampsCollected: 5,
      rewardsEarned: 1,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCustomers(customers.filter(c => c.id !== id));
          },
        },
      ],
    );
  };

  const handleAdjustRewards = (id: string) => {
    onNavigate(`AdjustRewards${id}`);
  };

  const filteredCustomers = customers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <PageTemplate
      title="Customers"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <View style={styles.content}>
        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.text.light}
        />

        {/* Add Customer Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onNavigate('AddCustomer')}>
          <Text style={styles.addButtonText}>+ Add New Customer</Text>
        </TouchableOpacity>

        {/* Customers List */}
        <ScrollView style={styles.list}>
          {filteredCustomers.map((customer) => (
            <View key={customer.id} style={styles.customerCard}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerDetail}>{customer.email}</Text>
                <Text style={styles.customerDetail}>{customer.phone}</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.stat}>
                    Stamps: {customer.stampsCollected}
                  </Text>
                  <Text style={styles.stat}>
                    Rewards: {customer.rewardsEarned}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => onNavigate(`EditCustomer${customer.id}`)}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() => handleAdjustRewards(customer.id)}>
                  <Text style={styles.adjustButtonText}>Adjust</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(customer.id)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  list: {
    flex: 1,
  },
  customerCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  customerInfo: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  stat: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.background,
    fontWeight: '600',
  },
  adjustButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  adjustButtonText: {
    color: Colors.background,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Colors.background,
    fontWeight: '600',
  },
});

export default CustomersPage;



