import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
import {customersRepository} from '../services/localRepository';
import type {Customer} from '../types';

interface AddEditCustomerPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  customerId?: string;
  onBack?: () => void;
}

const AddEditCustomerPage: React.FC<AddEditCustomerPageProps> = ({
  currentScreen,
  onNavigate,
  customerId,
  onBack,
}) => {
  const isEdit = !!customerId;
  const [name, setName] = useState(isEdit ? 'John Smith' : '');
  const [email, setEmail] = useState(isEdit ? 'john@example.com' : '');
  const [phone, setPhone] = useState(isEdit ? '+44 7700 900123' : '');
  const [stampsCollected, setStampsCollected] = useState(
    isEdit ? '8' : '0',
  );

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      const now = new Date().toISOString();
      const newCustomerId = customerId || `customer-${Date.now()}`;
      const stamps = parseInt(stampsCollected, 10) || 0;
      
      // Get existing customer if editing
      let existingCustomer: Customer | null = null;
      if (isEdit && customerId) {
        existingCustomer = await customersRepository.getById(customerId);
      }
      
      // Create or update customer object
      const customer: Customer = {
        id: newCustomerId,
        name,
        email,
        phone: phone || undefined,
        stamps: stamps, // Note: Customer type uses 'stamps' not 'stampsCollected'
        lastVisit: existingCustomer?.lastVisit, // Preserve last visit on edit
      };
      
      // IMMEDIATELY save to local repository (save method handles create/update)
      console.log(`[AddEditCustomer] Immediately saving customer to local repository: ${newCustomerId}`);
      await customersRepository.save(customer);
      console.log(`✅ [AddEditCustomer] Customer saved to local repository: ${newCustomerId}`);
      
      Alert.alert('Success', `Customer ${isEdit ? 'updated' : 'added'} successfully`);
      onBack?.();
    } catch (error) {
      console.error('[AddEditCustomer] Error saving customer:', error);
      Alert.alert('Error', 'Failed to save customer. Please try again.');
    }
  };

  return (
    <PageTemplate
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter customer name"
            placeholderTextColor={Colors.text.light}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={Colors.text.light}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            placeholderTextColor={Colors.text.light}
          />

          <Text style={styles.label}>Stamps Collected</Text>
          <TextInput
            style={styles.input}
            value={stampsCollected}
            onChangeText={setStampsCollected}
            placeholder="0"
            keyboardType="numeric"
            placeholderTextColor={Colors.text.light}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {isEdit ? 'Update Customer' : 'Add Customer'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    color: Colors.text.primary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});

export default AddEditCustomerPage;





