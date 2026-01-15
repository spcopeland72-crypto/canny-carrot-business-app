import React, {useState, useEffect} from 'react';
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
// Products and actions are now stored in business profile, not separate storage
import {generateRewardQRCode} from '../utils/qrCodeUtils';
import {businessRepository, rewardsRepository, campaignsRepository} from '../services/localRepository';
import {getStoredAuth} from '../services/authService';
import type {BusinessProfile, Reward, Campaign} from '../types';

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
    pointsPerPurchase?: number;
    rewardType: 'free_product' | 'discount' | 'other';
    selectedProducts?: string[];
    selectedActions?: string[];
    pinCode?: string;
    qrCode?: string;
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
  const isCampaign = currentScreen.startsWith('CreateCampaign') || currentScreen.startsWith('EditCampaign');
  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'action'>('product');
  const [requirement, setRequirement] = useState('');
  const [pointsPerPurchase, setPointsPerPurchase] = useState('1');
  const [rewardType, setRewardType] = useState<'free_product' | 'discount' | 'other'>('free_product');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [pinCode, setPinCode] = useState('');
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loadedRewardId, setLoadedRewardId] = useState<string | null>(null);
  
  // Product management state
  const [products, setProducts] = useState<string[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [createProductModalVisible, setCreateProductModalVisible] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [createdRewardName, setCreatedRewardName] = useState('');
  const [createdRewardQrCode, setCreatedRewardQrCode] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  // Action management state (for campaigns)
  const [createActionModalVisible, setCreateActionModalVisible] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  // Success modal state (for campaigns and rewards)
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  // Load reward/campaign data and form fields on mount (if editing)
  useEffect(() => {
    const loadRewardData = async () => {
      if (isEdit && rewardId) {
        try {
          if (isCampaign) {
            // Load campaign from repository (DB format)
            const loadedCampaign = await campaignsRepository.getById(rewardId);
            if (loadedCampaign) {
              // Store the loaded campaign ID to prevent duplicate creation
              setLoadedRewardId(loadedCampaign.id);
              
              // Map DB format to UI form fields
              setName(loadedCampaign.name || '');
              
              // Note: startDate and endDate are stored in the campaign but not editable in this form
              // They are preserved when saving
              
              // Load reward data from campaign.conditions.rewardData if it exists
              const rewardData = loadedCampaign.conditions?.rewardData;
              if (rewardData) {
                setRequirement((rewardData.stampsRequired || 10).toString());
                setPointsPerPurchase((rewardData.pointsPerPurchase || 1).toString());
                setRewardType(rewardData.rewardType || 'free_product');
                
                // Determine type based on selectedProducts vs selectedActions
                if (rewardData.selectedProducts && rewardData.selectedProducts.length > 0) {
                  setType('product');
                  setSelectedProducts(rewardData.selectedProducts);
                } else if (rewardData.selectedActions && rewardData.selectedActions.length > 0) {
                  setType('action');
                  setSelectedActions(rewardData.selectedActions);
                } else {
                  setType('product'); // Default
                }
                
                setPinCode(rewardData.pinCode || '');
              } else {
                // No reward data, use defaults
                setRequirement('10');
                setPointsPerPurchase('1');
                setRewardType('free_product');
                setType('product');
                setSelectedProducts([]);
                setSelectedActions([]);
                setPinCode('');
              }
            }
          } else {
            // Load reward from repository (DB format)
            const loadedReward = await rewardsRepository.getById(rewardId);
            if (loadedReward) {
              // Store the loaded reward ID to prevent duplicate creation
              setLoadedRewardId(loadedReward.id);
              
              // Map DB format to UI form fields
              setName(loadedReward.name || '');
              setRequirement((loadedReward.stampsRequired || loadedReward.costStamps || 10).toString());
              setPointsPerPurchase((loadedReward.pointsPerPurchase || 1).toString());
              
              // Map DB type to UI rewardType
              if (loadedReward.type === 'discount') {
                setRewardType('discount');
              } else if (loadedReward.type === 'freebie' || loadedReward.type === 'product') {
                setRewardType('free_product');
              } else {
                setRewardType('other');
              }
              
              // Default to 'product' for UI type (DB doesn't have product/action distinction)
              setType('product');
              
              setSelectedProducts(loadedReward.selectedProducts || []);
              setSelectedActions(loadedReward.selectedActions || []);
              setPinCode(loadedReward.pinCode || '');
            }
          }
        } catch (error) {
          console.error('Error loading reward/campaign data:', error);
        }
      } else if (reward) {
        // Fallback: use reward prop if provided (legacy support)
        setName(reward.name || '');
        setRequirement((reward as any).requirement?.toString() || (reward as any).stampsRequired?.toString() || '10');
        setPointsPerPurchase((reward as any).pointsPerPurchase?.toString() || '1');
        setType((reward as any).type === 'action' ? 'action' : 'product');
        setRewardType((reward as any).rewardType || 'free_product');
        setSelectedProducts((reward as any).selectedProducts || []);
        setSelectedActions((reward as any).selectedActions || []);
        setPinCode((reward as any).pinCode || '');
      }
    };
    loadRewardData();
  }, [isEdit, rewardId, reward]);
  
  // Load products, actions, and business profile on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load business profile (which contains products and actions)
        const profile = await businessRepository.get();
        if (profile) {
          setBusinessProfile(profile);
          
          // Load products from business profile
          if (profile.products && Array.isArray(profile.products)) {
            // Filter out dummy products if they exist
            const filteredProducts = profile.products.filter(p => 
              p !== 'Product 1' && p !== 'Product 2' && p !== 'Product 3'
            );
            setProducts(filteredProducts);
            
            // Update business profile if dummy products were removed
            if (filteredProducts.length !== profile.products.length) {
              const updatedProfile = {
                ...profile,
                products: filteredProducts,
                updatedAt: new Date().toISOString(),
              };
              await businessRepository.save(updatedProfile);
            }
          } else {
            setProducts([]);
          }
          
          // Load actions from business profile (or use defaults if none exist)
          if (profile.actions && Array.isArray(profile.actions) && profile.actions.length > 0) {
            // Actions are stored in business profile
            // Note: We'll use the profile.actions, but for now we'll keep the default list
            // as a fallback until actions are properly managed in the business profile
          }
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        setProducts([]);
      }
    };
    loadInitialData();
  }, []); // Only run on mount
  
  // Default actions list (can be customized per business)
  const defaultActions = [
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
  
  // Use business profile actions if available, otherwise use defaults
  const actions = businessProfile?.actions && businessProfile.actions.length > 0
    ? businessProfile.actions
    : defaultActions;

  const handleSave = async () => {
    try {
      if (!name || !pointsPerPurchase) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      // For rewards (not campaigns), requirement is required
      if (!isCampaign && !requirement) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
      
      // Validate PIN code (must be 4 digits)
      if (!pinCode || pinCode.length !== 4 || !/^\d{4}$/.test(pinCode)) {
        Alert.alert('Error', 'Please enter a valid 4-digit PIN code');
        return;
      }
      
      // Generate QR code value using shared utility with business profile data
      // Use rewardId prop, loadedRewardId, reward prop id, or generate new ID (in that order)
      const rewardIdToSave = rewardId || loadedRewardId || reward?.id || Date.now().toString();
      // For campaigns, use default requirement value (1) since campaigns don't have requirement field
      const requirementValue = isCampaign ? 1 : parseInt(requirement, 10) || 1;
      const pointsValue = parseInt(pointsPerPurchase, 10) || 1;
      
      console.log('[CreateEditReward] Saving reward:', {
        isEdit,
        rewardId,
        loadedRewardId,
        rewardIdToSave,
        name,
        requirementValue,
        rewardType,
        stampsRequired: requirementValue,
      });
      
      let qrCodeValue: string;
      try {
        qrCodeValue = generateRewardQRCode(
          rewardIdToSave,
          name,
          requirementValue,
          rewardType,
          type === 'product' ? selectedProducts : undefined,
          type === 'action' ? selectedActions : undefined,
          pinCode,
          businessProfile ? {
            name: businessProfile.name,
            address: businessProfile.address,
            addressLine1: businessProfile.addressLine1,
            addressLine2: businessProfile.addressLine2,
            city: businessProfile.city,
            postcode: businessProfile.postcode,
            country: businessProfile.country,
            phone: businessProfile.phone,
            email: businessProfile.email,
            website: businessProfile.website,
            // Logo excluded from QR code to prevent data overflow
            // Logo is stored separately in business profile
            socialMedia: businessProfile.socialMedia,
          } : undefined,
          pointsValue // Include points per purchase
        );
        
        // QR code size validation is now handled in generateRewardQRCode
        // If it throws an error, it means the data is too large even after optimization
        const qrCodeSize = qrCodeValue.length;
        console.log(`[CreateEditReward] QR code generated successfully: ${qrCodeSize} bytes`);
      } catch (qrError) {
        console.error('[CreateEditReward] Error generating QR code:', qrError);
        Alert.alert(
          'Error',
          'Failed to generate QR code. Please check your reward details and try again.'
        );
        return;
      }
      
      const now = new Date().toISOString();
      
      // Get business ID for reward
      const auth = await getStoredAuth();
      if (!auth?.businessId) {
        Alert.alert('Error', 'No business ID found - cannot save reward');
        return;
      }
      
      // Map UI fields to DB format
      // UI: type='product'|'action', rewardType='free_product'|'discount'|'other'
      // DB: type='product'|'discount'|'freebie'|'experience'|'voucher'|'upgrade'
      let dbType: 'product' | 'discount' | 'freebie' | 'experience' | 'voucher' | 'upgrade' = 'freebie';
      if (rewardType === 'discount') {
        dbType = 'discount';
      } else if (rewardType === 'free_product') {
        dbType = 'freebie'; // Both product and action map to freebie for free_product
      } else {
        dbType = 'freebie'; // Default to freebie for 'other'
      }
      
      console.log('[CreateEditReward] Type mapping:', {
        rewardType,
        dbType,
        type,
      });
      
      if (isCampaign) {
        // Get existing campaign data if editing to preserve dates and other fields
        let existingCampaign: Campaign | null = null;
        if (isEdit) {
          try {
            existingCampaign = await campaignsRepository.getById(rewardIdToSave);
          } catch (err) {
            console.warn('Could not load existing campaign for edit:', err);
          }
        }
        
        // Save as Campaign with reward data stored in conditions.rewardData
        const campaignToSave: Campaign = {
          id: rewardIdToSave,
          businessId: auth.businessId,
          name,
          description: existingCampaign?.description || '',
          type: existingCampaign?.type || 'bonus_reward',
          startDate: existingCampaign?.startDate || now,
          endDate: existingCampaign?.endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // Default to 1 year from now
          status: existingCampaign?.status || 'active',
          targetAudience: existingCampaign?.targetAudience || 'all',
          conditions: {
            ...existingCampaign?.conditions,
            rewardData: {
              selectedProducts: type === 'product' ? selectedProducts : undefined,
              selectedActions: type === 'action' ? selectedActions : undefined,
              pinCode,
              qrCode: qrCodeValue,
              stampsRequired: requirementValue,
              pointsPerPurchase: pointsValue,
              rewardType,
            },
          },
          createdAt: existingCampaign?.createdAt || now,
          updatedAt: now,
          stats: existingCampaign?.stats || {
            impressions: 0,
            clicks: 0,
            conversions: 0,
          },
        };
        
        console.log('[CreateEditReward] Saving campaign:', campaignToSave);
        
        // Save to campaigns repository (DB format) - this will also write to Redis
        await campaignsRepository.save(campaignToSave);
        
        // Show success modal for both create and edit
        if (!isEdit) {
          setSuccessModalMessage('Campaign successfully created');
        } else {
          setSuccessModalMessage('Changes saved');
        }
        setSuccessModalVisible(true);
      } else {
        // Save as Reward
        const rewardToSave: Reward = {
          id: rewardIdToSave,
          businessId: auth.businessId,
          name,
          description: '', // Can be added later if needed
          stampsRequired: requirementValue,
          costStamps: requirementValue,
          type: dbType,
          isActive: true,
          validFrom: now,
          validTo: undefined,
          expiresAt: undefined,
          createdAt: isEdit ? reward?.createdAt || now : now,
          updatedAt: now,
          currentRedemptions: 0,
          // App-specific fields (stored but not in core DB type)
          pinCode,
          qrCode: qrCodeValue,
          selectedProducts: type === 'product' ? selectedProducts : undefined,
          selectedActions: type === 'action' ? selectedActions : undefined,
          pointsPerPurchase: pointsValue,
        };
        
        // Save to local repository (DB format) - this will also write to Redis
        await rewardsRepository.save(rewardToSave);
      }
      
      // Call onSave callback if provided (for parent component notifications)
      const rewardData = {
        name,
        type,
        requirement: requirementValue,
        pointsPerPurchase: pointsValue,
        rewardType,
        selectedProducts: type === 'product' ? selectedProducts : undefined,
        selectedActions: type === 'action' ? selectedActions : undefined,
        pinCode,
        qrCode: qrCodeValue,
      };
      
      if (onSave) {
        onSave(rewardData);
      }
      
      // For rewards: if creating new, show QR code modal first, then success modal
      // If editing, show success modal directly
      if (!isEdit) {
        // Show QR code modal first for new rewards
        setCreatedRewardName(name);
        setCreatedRewardQrCode(qrCodeValue);
        setQrCodeModalVisible(true);
      } else {
        // Show success modal for edits
        setSuccessModalMessage('Changes saved');
        setSuccessModalVisible(true);
      }
    } catch (error) {
      console.error('[CreateEditReward] Unexpected error in handleSave:', error);
      Alert.alert(
        'Error',
        isCampaign ? 'An unexpected error occurred while saving the campaign. Please try again.' : 'An unexpected error occurred while saving the reward. Please try again.'
      );
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
    
    // Add to products list
    const allProducts = [...products, newProduct];
    
    // Update state first
    setProducts(allProducts);
    // Automatically select the newly created product
    setSelectedProducts([...selectedProducts, newProduct]);
    setNewProductName('');
    setCreateProductModalVisible(false);
    
    // Save all products to business profile
    try {
      const profile = await businessRepository.get();
      if (profile) {
        const updatedProfile = {
          ...profile,
          products: allProducts,
          updatedAt: new Date().toISOString(),
        };
        await businessRepository.save(updatedProfile);
        setBusinessProfile(updatedProfile);
        console.log('Product saved to business profile:', newProduct);
        Alert.alert('Success', 'Product created successfully');
      } else {
        throw new Error('Business profile not found');
      }
    } catch (error) {
      console.error('Error saving product to business profile:', error);
      Alert.alert('Warning', 'Product created but failed to save. It may not persist.');
    }
  };

  const handleCreateAction = async () => {
    if (!newActionName.trim()) {
      Alert.alert('Error', 'Please enter an action name');
      return;
    }
    const newAction = newActionName.trim();
    
    // Check if action already exists in the actions list
    if (actions.includes(newAction)) {
      Alert.alert('Error', 'Action already exists');
      setNewActionName('');
      setCreateActionModalVisible(false);
      return;
    }
    
    // Add to selected actions and update business profile
    const updatedActions = [...actions, newAction];
    setSelectedActions([...selectedActions, newAction]);
    setNewActionName('');
    setCreateActionModalVisible(false);
    
    // Save new action to business profile
    try {
      const profile = await businessRepository.get();
      if (profile) {
        const updatedProfile = {
          ...profile,
          actions: updatedActions,
          updatedAt: new Date().toISOString(),
        };
        await businessRepository.save(updatedProfile);
        setBusinessProfile(updatedProfile);
        console.log('Action saved to business profile:', newAction);
        Alert.alert('Success', 'Action created successfully');
      } else {
        throw new Error('Business profile not found');
      }
    } catch (error) {
      console.error('Error saving action to business profile:', error);
      Alert.alert('Warning', 'Action created but failed to save. It may not persist.');
    }
  };

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    // Clear form
    setName('');
    setType('product');
    setRequirement('');
    setPointsPerPurchase('1');
    setRewardType('free_product');
    setSelectedProducts([]);
    setSelectedActions([]);
    setPinCode('');
    // Navigate back to home
    onNavigate('Home');
  };

  const handleSelectProduct = (product: string) => {
    if (selectedProducts.includes(product)) {
      setSelectedProducts(selectedProducts.filter(p => p !== product));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
    setDropdownVisible(false);
  };

  // Copy reward - duplicates current reward but clears name
  const handleCopyReward = () => {
    if (!isEdit || !reward) {
      Alert.alert('Info', isCampaign ? 'No campaign to copy. Create a campaign first.' : 'No reward to copy. Create a reward first.');
      return;
    }
    
    // Copy all fields except name (which will be cleared)
    setName(''); // Clear name
    setType(reward.type || 'product');
    setRequirement(reward.requirement?.toString() || '');
    setPointsPerPurchase(reward.pointsPerPurchase?.toString() || '1');
    setRewardType(reward.rewardType || 'free_product');
    setSelectedProducts(reward.selectedProducts || []);
    setSelectedActions(reward.selectedActions || []);
    setPinCode(''); // Clear PIN code (user needs to enter new one)
    
    Alert.alert('Copied', isCampaign ? 'Campaign details copied. Please enter a new name and PIN code.' : 'Reward details copied. Please enter a new name and PIN code.');
  };

  // Delete reward with confirmation
  const handleDeleteReward = () => {
    if (!isEdit || !rewardId) {
      Alert.alert('Info', isCampaign ? 'No campaign to delete.' : 'No reward to delete.');
      return;
    }
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteReward = async () => {
    if (!isEdit || !rewardId) return;
    
    try {
      await rewardsRepository.delete(rewardId);
      Alert.alert('Success', isCampaign ? 'Campaign deleted successfully' : 'Reward deleted successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to Home to trigger reload of rewards
            onNavigate('Home');
          },
        },
      ]);
    } catch (error) {
      console.error('Error deleting reward:', error);
      Alert.alert('Error', isCampaign ? 'Failed to delete campaign. Please try again.' : 'Failed to delete reward. Please try again.');
    }
    setDeleteConfirmVisible(false);
  };

  const handleDeleteProduct = async (product: string) => {
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
            
            // Save updated list to business profile
            try {
              const profile = await businessRepository.get();
              if (profile) {
                const updatedProfile = {
                  ...profile,
                  products: updatedProducts,
                  updatedAt: new Date().toISOString(),
                };
                await businessRepository.save(updatedProfile);
                setBusinessProfile(updatedProfile);
                console.log('Product deleted from business profile:', product);
              } else {
                throw new Error('Business profile not found');
              }
            } catch (error) {
              console.error('Error deleting product from business profile:', error);
              Alert.alert('Error', 'Failed to delete product from business profile.');
            }
          },
        },
      ]
    );
  };

  // Header buttons (copy and delete) - only show in edit mode
  const headerButtons = isEdit ? (
    <>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleCopyReward}
        activeOpacity={0.7}>
        <Text style={styles.headerButtonText}>📋</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleDeleteReward}
        activeOpacity={0.7}>
        <Text style={styles.headerButtonText}>🗑️</Text>
      </TouchableOpacity>
    </>
  ) : null;

  return (
    <PageTemplate
      title={isEdit ? (isCampaign ? 'Edit Campaign' : 'Edit Reward') : (isCampaign ? 'Create Campaign' : 'Create Reward')}
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}
      headerRight={headerButtons}>
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>{isCampaign ? 'Campaign Name *' : 'Reward Name *'}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={isCampaign ? "Enter Campaign name" : "Enter reward name"}
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
                          <TouchableOpacity
                            style={styles.deleteProductButton}
                            onPress={() => handleDeleteProduct(product)}>
                            <Text style={styles.deleteProductButtonText}>🗑️</Text>
                          </TouchableOpacity>
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
              {isCampaign && (
                <TouchableOpacity
                  style={styles.createProductButton}
                  onPress={() => setCreateActionModalVisible(true)}>
                  <Text style={styles.createProductButtonText}>+ Create New Action</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {!isCampaign && (
            <>
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
            </>
          )}

          <Text style={styles.label}>
            Number of Points per {type === 'product' ? 'Purchase' : 'Action'} *
          </Text>
          <Text style={styles.labelHint}>
            Points allocated to each {type === 'product' ? 'purchase' : 'action'} (default: 1 point per transaction)
          </Text>
          <TextInput
            style={styles.input}
            value={pointsPerPurchase}
            onChangeText={(text) => {
              // Only allow digits
              const digitsOnly = text.replace(/[^0-9]/g, '');
              setPointsPerPurchase(digitsOnly || '1');
            }}
            placeholder="Enter number of points (default: 1)"
            keyboardType="numeric"
            placeholderTextColor={Colors.text.light}
          />

          <Text style={styles.label}>{isCampaign ? 'Campaign Type *' : 'Reward Type *'}</Text>
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

          <Text style={styles.label}>4-Digit PIN Code *</Text>
          <Text style={styles.labelHint}>
            Required for customers to redeem this reward
          </Text>
          <TextInput
            style={styles.input}
            value={pinCode}
            onChangeText={(text) => {
              // Only allow digits and limit to 4 characters
              const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 4);
              setPinCode(digitsOnly);
            }}
            placeholder="Enter 4-digit PIN"
            placeholderTextColor={Colors.text.light}
            keyboardType="numeric"
            maxLength={4}
          />

          {isCampaign && (
            <View style={styles.campaignSummary}>
              <Text style={styles.campaignSummaryTitle}>Campaign Summary</Text>
              
              <View style={styles.summarySection}>
                <Text style={styles.summaryLabel}>Products defined:</Text>
                {selectedProducts.length > 0 ? (
                  <View style={styles.summaryList}>
                    {selectedProducts.map((product, idx) => (
                      <Text key={idx} style={styles.summaryItem}>• {product}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.summaryEmpty}>None</Text>
                )}
              </View>

              <View style={styles.summarySection}>
                <Text style={styles.summaryLabel}>Actions defined:</Text>
                {selectedActions.length > 0 ? (
                  <View style={styles.summaryList}>
                    {selectedActions.map((action, idx) => (
                      <Text key={idx} style={styles.summaryItem}>• {action}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.summaryEmpty}>None</Text>
                )}
              </View>

              <View style={styles.summarySection}>
                <Text style={styles.summaryLabel}>Reward defined:</Text>
                <Text style={styles.summaryItem}>
                  {rewardType === 'free_product' ? 'Free Product' : 
                   rewardType === 'discount' ? 'Discount' : 'Other'}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.note}>
            * Business verification required to award points for actions
          </Text>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {isEdit ? 'Save Changes' : (isCampaign ? 'Create Campaign' : 'Create Reward')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* QR Code Modal with Success Message */}
      <QRCodeModal
        visible={qrCodeModalVisible}
        title={createdRewardName}
        qrValue={createdRewardQrCode || reward?.qrCode || (reward?.id ? (() => {
          // Map DB type to QR code rewardType format
          let qrRewardType: 'free_product' | 'discount' | 'other' = 'free_product';
          if (reward.type === 'discount') {
            qrRewardType = 'discount';
          } else if (reward.type === 'freebie' || reward.type === 'product') {
            qrRewardType = 'free_product';
          } else {
            qrRewardType = 'other';
          }
          return generateRewardQRCode(
            reward.id,
            reward.name,
            reward.stampsRequired || reward.costStamps || 1,
            qrRewardType,
            reward.selectedProducts,
            reward.selectedActions,
            reward.pinCode || ''
          );
        })() : '')}
        showSuccessMessage={!isEdit} // Show "Reward created!" for new rewards
        onClose={() => {
          setQrCodeModalVisible(false);
          // After QR modal closes, show success modal for new rewards
          if (!isEdit) {
            setSuccessModalMessage('Reward successfully created');
            setSuccessModalVisible(true);
          }
        }}
      />
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>{isCampaign ? 'Delete Campaign?' : 'Delete Reward?'}</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{reward?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => setDeleteConfirmVisible(false)}>
                <Text style={styles.deleteModalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonDelete]}
                onPress={confirmDeleteReward}>
                <Text style={styles.deleteModalButtonTextDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Action Modal (for campaigns) */}
      <Modal
        visible={createActionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateActionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.createProductModal}>
            <Text style={styles.modalTitle}>Create New Action</Text>
            <Text style={styles.label}>Action Name *</Text>
            <TextInput
              style={styles.input}
              value={newActionName}
              onChangeText={setNewActionName}
              placeholder="Enter action name"
              placeholderTextColor={Colors.text.light}
              autoFocus={true}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCreateActionModalVisible(false);
                  setNewActionName('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateAction}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal (for campaigns and rewards) */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessModalClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Text style={styles.successModalTitle}>{successModalMessage}</Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={handleSuccessModalClose}>
              <Text style={styles.successModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteModalButtonCancel: {
    backgroundColor: Colors.neutral[200],
  },
  deleteModalButtonDelete: {
    backgroundColor: '#FF3B30',
  },
  deleteModalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  deleteModalButtonTextDelete: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    paddingVertical: 16,
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
  labelHint: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: -4,
    marginBottom: 8,
    fontStyle: 'italic',
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
  campaignSummary: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  campaignSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  summaryList: {
    marginLeft: 8,
  },
  summaryItem: {
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  summaryEmpty: {
    fontSize: 14,
    color: Colors.text.light,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  successModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  successModalButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    width: '100%',
    alignItems: 'center',
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});

export default CreateEditRewardPage;

