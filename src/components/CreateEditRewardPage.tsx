import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
import QRCodeModal from './QRCodeModal';
import {saveProducts, loadProducts} from '../utils/dataStorage';

interface Reward {
  id: string;
  name: string;
  count: number;
  total: number;
  icon: string;
  type: 'product' | 'action';
  requirement: number;
  rewardType: 'free_product' | 'discount' | 'other';
  selectedProducts?: string[];
  selectedActions?: string[];
}

interface CreateEditRewardPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  rewardId?: string;
  reward?: Reward;
  onBack?: () => void;
  onSave?: (data: {
    name: string;
    type: 'product' | 'action';
    requirement: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
  }) => void;
}

const CreateEditRewardPage: React.FC<CreateEditRewardPageProps> = ({
  currentScreen,
  onNavigate,
  rewardId,
  reward,
  onBack,
  onSave,
}) => {
  const isEdit = !!rewardId;
  const [name, setName] = useState(reward?.name || '');
  const [type, setType] = useState<'product' | 'action'>(reward?.type || 'product');
  const [requirement, setRequirement] = useState(reward?.requirement?.toString() || '');
  const [rewardType, setRewardType] = useState<
    'free_product' | 'discount' | 'other'
  >(reward?.rewardType || 'free_product');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(reward?.selectedProducts || []);
  const [selectedActions, setSelectedActions] = useState<string[]>(reward?.selectedActions || []);
  
  // Product management state
  const defaultProducts = ['Product 1', 'Product 2', 'Product 3'];
  const [products, setProducts] = useState<string[]>(defaultProducts);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [createProductModalVisible, setCreateProductModalVisible] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [createdRewardName, setCreatedRewardName] = useState('');

  // Load products on mount only
  React.useEffect(() => {
    const loadInitialProducts = async () => {
      try {
        const loadedProducts = await loadProducts();
        if (loadedProducts && Array.isArray(loadedProducts) && loadedProducts.length > 0) {
          // Merge loaded products with defaults, removing duplicates
          const merged = [...new Set([...defaultProducts, ...loadedProducts])];
          setProducts(merged);
        } else {
          // If no saved products, use defaults
          setProducts(defaultProducts);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        // Continue with default products if loading fails
        setProducts(defaultProducts);
      }
    };
    loadInitialProducts();
  }, []); // Only run on mount
  const actions = [
    'Write a Review',
    'Share on Facebook',
    'Share on Instagram',
    'Share on TikTok',
    'Share on X (Twitter)',
    'Share on LinkedIn',
    'Check In',
    'Follow Business',
    'Post Mentioning Business',
  ];

  const handleSave = () => {
    if (!name || !requirement) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    const rewardData = {
      name,
      type,
      requirement: parseInt(requirement, 10),
      rewardType,
      selectedProducts: type === 'product' ? selectedProducts : undefined,
      selectedActions: type === 'action' ? selectedActions : undefined,
    };
    
    // Call onSave callback if provided
    if (onSave) {
      onSave(rewardData);
    }
    
    // If creating new reward, show QR code modal
    if (!isEdit) {
      setCreatedRewardName(name);
      setQrCodeModalVisible(true);
    } else {
      Alert.alert('Success', 'Reward updated successfully');
      onBack?.();
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }
    if (products.includes(newProductName.trim())) {
      Alert.alert('Error', 'Product already exists');
      return;
    }
    const newProduct = newProductName.trim();
    const updatedProducts = [...products, newProduct];
    
    // Update state first
    setProducts(updatedProducts);
    // Automatically select the newly created product
    setSelectedProducts([...selectedProducts, newProduct]);
    setNewProductName('');
    setCreateProductModalVisible(false);
    
    // Save products to file (save all products including defaults)
    try {
      await saveProducts(updatedProducts);
      console.log('Product saved successfully:', newProduct);
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Warning', 'Product created but failed to save. It may not persist.');
    }
    
    Alert.alert('Success', 'Product created successfully');
  };

  const handleSelectProduct = (product: string) => {
    if (selectedProducts.includes(product)) {
      setSelectedProducts(selectedProducts.filter(p => p !== product));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
    setDropdownVisible(false);
  };

  const handleDeleteProduct = async (product: string) => {
    // Don't allow deleting default products
    if (defaultProducts.includes(product)) {
      Alert.alert('Cannot Delete', 'Default products cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Remove from products list
            const updatedProducts = products.filter(p => p !== product);
            setProducts(updatedProducts);
            
            // Remove from selected products if selected
            if (selectedProducts.includes(product)) {
              setSelectedProducts(selectedProducts.filter(p => p !== product));
            }
            
            // Save to file
            try {
              await saveProducts(updatedProducts);
              console.log('Product deleted successfully:', product);
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product from storage.');
            }
          },
        },
      ]
    );
  };

  return (
    <PageTemplate
      title={isEdit ? 'Edit Reward' : 'Create Reward'}
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Reward Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter reward name"
            placeholderTextColor={Colors.text.light}
          />

          <Text style={styles.label}>Type *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioOption,
                type === 'product' && styles.radioOptionSelected,
              ]}
              onPress={() => setType('product')}>
              <Text
                style={[
                  styles.radioText,
                  type === 'product' && styles.radioTextSelected,
                ]}>
                Product Purchase
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioOption,
                type === 'action' && styles.radioOptionSelected,
              ]}
              onPress={() => setType('action')}>
              <Text
                style={[
                  styles.radioText,
                  type === 'action' && styles.radioTextSelected,
                ]}>
                Action
              </Text>
            </TouchableOpacity>
          </View>

          {type === 'product' && (
            <>
              <Text style={styles.label}>Select Products</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setDropdownVisible(true);
                }}>
                <Text
                  style={[
                    styles.dropdownText,
                    selectedProducts.length === 0 && styles.dropdownPlaceholder,
                  ]}
                  numberOfLines={1}>
                  {selectedProducts.length > 0
                    ? selectedProducts.join(', ')
                    : 'Select products'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.createProductButton}
                onPress={() => setCreateProductModalVisible(true)}>
                <Text style={styles.createProductButtonText}>+ Create New Product</Text>
              </TouchableOpacity>

              {selectedProducts.length > 0 && (
                <View style={styles.selectedProductsContainer}>
                  <Text style={styles.selectedProductsLabel}>Selected Products:</Text>
                  {selectedProducts.map((product) => (
                    <View key={product} style={styles.selectedProductTag}>
                      <Text style={styles.selectedProductText}>{product}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedProducts(
                            selectedProducts.filter(p => p !== product),
                          );
                        }}>
                        <Text style={styles.removeProductText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Dropdown Modal */}
              <Modal
                visible={dropdownVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDropdownVisible(false)}>
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setDropdownVisible(false)}>
                  <View style={styles.dropdownModal}>
                    <ScrollView>
                      {products.map((product) => (
                        <View
                          key={product}
                          style={[
                            styles.dropdownOption,
                            selectedProducts.includes(product) &&
                              styles.dropdownOptionSelected,
                          ]}>
                          <TouchableOpacity
                            style={styles.dropdownOptionContent}
                            onPress={() => handleSelectProduct(product)}>
                            <Text
                              style={[
                                styles.dropdownOptionText,
                                selectedProducts.includes(product) &&
                                  styles.dropdownOptionTextSelected,
                              ]}>
                              {selectedProducts.includes(product) ? '✓ ' : ''}
                              {product}
                            </Text>
                          </TouchableOpacity>
                          {!defaultProducts.includes(product) && (
                            <TouchableOpacity
                              style={styles.deleteProductButton}
                              onPress={() => handleDeleteProduct(product)}>
                              <Text style={styles.deleteProductButtonText}>🗑️</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Create Product Modal */}
              <Modal
                visible={createProductModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setCreateProductModalVisible(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.createProductModal}>
                    <Text style={styles.modalTitle}>Create New Product</Text>
                    <Text style={styles.label}>Product Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={newProductName}
                      onChangeText={setNewProductName}
                      placeholder="Enter product name"
                      placeholderTextColor={Colors.text.light}
                      autoFocus={true}
                    />
                    <View style={styles.modalButtonContainer}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => {
                          setCreateProductModalVisible(false);
                          setNewProductName('');
                        }}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.createButton]}
                        onPress={handleCreateProduct}>
                        <Text style={styles.createButtonText}>Create</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          )}

          {type === 'action' && (
            <>
              <Text style={styles.label}>Select Actions</Text>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action}
                  style={styles.checkboxOption}
                  onPress={() => {
                    if (selectedActions.includes(action)) {
                      setSelectedActions(
                        selectedActions.filter(a => a !== action),
                      );
                    } else {
                      setSelectedActions([...selectedActions, action]);
                    }
                  }}>
                  <Text
                    style={[
                      styles.checkboxText,
                      selectedActions.includes(action) &&
                        styles.checkboxTextSelected,
                    ]}>
                    {selectedActions.includes(action) ? '✓ ' : '○ '}
                    {action}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={styles.label}>
            Number of {type === 'product' ? 'Purchases' : 'Actions'} Required *
          </Text>
          <TextInput
            style={styles.input}
            value={requirement}
            onChangeText={setRequirement}
            placeholder="Enter number"
            keyboardType="numeric"
            placeholderTextColor={Colors.text.light}
          />

          <Text style={styles.label}>Reward Type *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioOption,
                rewardType === 'free_product' && styles.radioOptionSelected,
              ]}
              onPress={() => setRewardType('free_product')}>
              <Text
                style={[
                  styles.radioText,
                  rewardType === 'free_product' && styles.radioTextSelected,
                ]}>
                Free Product
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioOption,
                rewardType === 'discount' && styles.radioOptionSelected,
              ]}
              onPress={() => setRewardType('discount')}>
              <Text
                style={[
                  styles.radioText,
                  rewardType === 'discount' && styles.radioTextSelected,
                ]}>
                Discount
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioOption,
                rewardType === 'other' && styles.radioOptionSelected,
              ]}
              onPress={() => setRewardType('other')}>
              <Text
                style={[
                  styles.radioText,
                  rewardType === 'other' && styles.radioTextSelected,
                ]}>
                Other
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>
            * Business verification required to award points for actions
          </Text>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {isEdit ? 'Update Reward' : 'Create Reward'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* QR Code Modal */}
      <QRCodeModal
        visible={qrCodeModalVisible}
        title={createdRewardName}
        qrValue={createdRewardName}
        onClose={() => {
          setQrCodeModalVisible(false);
          Alert.alert('Success', 'Reward created successfully');
          onBack?.();
        }}
      />
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
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  radioOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
  },
  radioOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  radioText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  radioTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  checkboxOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginBottom: 8,
  },
  checkboxText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  checkboxTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: Colors.text.light,
    fontStyle: 'italic',
    marginTop: 8,
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
  dropdown: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: Colors.text.light,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  createProductButton: {
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderStyle: 'dashed',
  },
  createProductButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  selectedProductsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  selectedProductsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  selectedProductTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  selectedProductText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    flex: 1,
  },
  removeProductText: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    padding: 16,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    overflow: 'hidden',
  },
  dropdownOptionContent: {
    flex: 1,
    padding: 12,
  },
  deleteProductButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: Colors.neutral[200],
  },
  deleteProductButtonText: {
    fontSize: 16,
  },
  dropdownOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  dropdownOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  createProductModal: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    width: '85%',
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.neutral[200],
  },
  createButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});

export default CreateEditRewardPage;

