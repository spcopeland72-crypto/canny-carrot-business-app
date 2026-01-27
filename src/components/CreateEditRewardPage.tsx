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
  Platform,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
import QRCodeModal from './QRCodeModal';
// Products and actions are now stored in business profile, not separate storage
import {generateRewardQRCode, generateCampaignItemQRCode} from '../utils/qrCodeUtils';
import {businessRepository, rewardsRepository, campaignsRepository} from '../services/localRepository';
import {getStoredAuth} from '../services/authService';
import type {BusinessProfile, Reward, Campaign, CampaignType} from '../types';

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
  console.log('[CreateEditReward] ===== COMPONENT RENDERING =====', { currentScreen, rewardId, reward: !!reward, onBack: !!onBack, onSave: !!onSave });
  const isEdit = !!rewardId;
  const isCampaign = currentScreen.startsWith('CreateCampaign') || currentScreen.startsWith('EditCampaign');
  console.log('[CreateEditReward] Component initialized:', { currentScreen, isCampaign, isEdit, rewardId });
  console.log('[CreateEditReward] Date picker will render:', isCampaign);
  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'action'>('product');
  const [requirement, setRequirement] = useState('');
  const [pointsPerPurchase, setPointsPerPurchase] = useState('1');
  const [rewardType, setRewardType] = useState<string>('bonus_reward'); // Can be CampaignType or custom string
  const [customTypeText, setCustomTypeText] = useState<string>(''); // For free text entry when "Other" is selected
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [pinCode, setPinCode] = useState('');
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loadedRewardId, setLoadedRewardId] = useState<string | null>(null);
  const [campaignTypeDropdownVisible, setCampaignTypeDropdownVisible] = useState(false);
  // Campaign date state (only for campaigns)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
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
  // Error modal state (for validation failures)
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessages, setErrorModalMessages] = useState<string[]>([]);
  // Date picker modal state
  const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  // Campaign product/action QR codes state
  const [campaignItemQRCodes, setCampaignItemQRCodes] = useState<Map<string, string>>(new Map());
  const [campaignQRModalVisible, setCampaignQRModalVisible] = useState(false);
  const [campaignQRModalTitle, setCampaignQRModalTitle] = useState('');
  const [campaignQRModalValue, setCampaignQRModalValue] = useState('');

  // Load reward/campaign data and form fields on mount (if editing)
  useEffect(() => {
    const loadRewardData = async () => {
      if (isEdit && rewardId) {
        try {
          if (isCampaign) {
            // Load campaign from repository (DB format) - EXACT SAME AS REWARDS
            const loadedCampaign = await campaignsRepository.getById(rewardId);
            console.log('[CreateEditReward] Loaded campaign from repository:', JSON.stringify(loadedCampaign, null, 2));
            console.log('[CreateEditReward] Loaded campaign selectedProducts:', loadedCampaign?.selectedProducts);
            
            if (loadedCampaign) {
              // Store the loaded campaign ID to prevent duplicate creation
              setLoadedRewardId(loadedCampaign.id);
              
              // Map DB format to UI form fields - EXACT SAME AS REWARDS
              setName(loadedCampaign.name || '');
              setRequirement((loadedCampaign.conditions?.rewardData?.stampsRequired || 10).toString());
              setPointsPerPurchase((loadedCampaign.pointsPerPurchase || 1).toString());
              
              // For campaigns, load the campaign.type
              if (loadedCampaign?.type) {
                const standardTypes: CampaignType[] = ['double_stamps', 'bonus_reward', 'flash_sale', 'referral', 'birthday', 'happy_hour', 'loyalty_tier'];
                const legacyRewardTypes = ['free_product', 'discount', 'other'];
                const allStandardTypes = [...standardTypes, ...legacyRewardTypes];
                
                if (allStandardTypes.includes(loadedCampaign.type as any)) {
                  setRewardType(loadedCampaign.type);
                  setCustomTypeText('');
                } else {
                  setRewardType('other');
                  setCustomTypeText(loadedCampaign.type);
                }
              }
              
              // Default to 'product' for UI type (same as rewards)
              setType('product');
              
              // EXACT SAME AS REWARDS - set both products and actions, no if/else
              setSelectedProducts(loadedCampaign.selectedProducts || []);
              setSelectedActions(loadedCampaign.selectedActions || []);
              setPinCode(loadedCampaign.pinCode || '');
              
              // Load campaign dates
              const now = new Date().toISOString();
              const defaultEndDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
              const loadedStartDate = loadedCampaign.startDate ? new Date(loadedCampaign.startDate).toISOString().split('T')[0] : new Date(now).toISOString().split('T')[0];
              const loadedEndDate = loadedCampaign.endDate ? new Date(loadedCampaign.endDate).toISOString().split('T')[0] : new Date(defaultEndDate).toISOString().split('T')[0];
              setStartDate(loadedStartDate);
              setEndDate(loadedEndDate);
              
              // Generate QR codes for loaded campaign products/actions
              const profile = await businessRepository.get();
              const businessName = profile?.name ?? '';
              const loadedQRCodes = new Map<string, string>();
              const prods = loadedCampaign.selectedProducts || [];
              const acts = loadedCampaign.selectedActions || [];
              if (prods.length > 0) {
                prods.forEach((product: string) => {
                  const qrCode = generateCampaignItemQRCode(
                    loadedCampaign.businessId ?? '',
                    businessName,
                    loadedCampaign.name,
                    'product',
                    product,
                    loadedStartDate,
                    loadedEndDate,
                    prods,
                    acts
                  );
                  loadedQRCodes.set(`product:${product}`, qrCode);
                });
              }
              if (acts.length > 0) {
                acts.forEach((action: string) => {
                  const qrCode = generateCampaignItemQRCode(
                    loadedCampaign.businessId ?? '',
                    businessName,
                    loadedCampaign.name,
                    'action',
                    action,
                    loadedStartDate,
                    loadedEndDate,
                    prods,
                    acts
                  );
                  loadedQRCodes.set(`action:${action}`, qrCode);
                });
              }
              setCampaignItemQRCodes(loadedQRCodes);
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
  
  // Helper function to format date as YYYY-MM-DD for input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date Picker Component (defined inside CreateEditRewardPage to access styles)
  const DatePickerComponent: React.FC<{
    initialDate: Date;
    onDateSelect: (year: number, month: number, day: number) => void;
    onCancel: () => void;
  }> = ({ initialDate, onDateSelect, onCancel }) => {
    const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState(initialDate.getDate());

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleConfirm = () => {
      onDateSelect(selectedYear, selectedMonth, selectedDay);
    };

    return (
      <View style={styles.datePickerContainer}>
        <View style={styles.datePickerRow}>
          <View style={styles.datePickerColumn}>
            <Text style={styles.datePickerLabel}>Year</Text>
            <ScrollView style={styles.datePickerScroll}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.datePickerOption,
                    selectedYear === year && styles.datePickerOptionSelected,
                  ]}
                  onPress={() => setSelectedYear(year)}>
                  <Text
                    style={[
                      styles.datePickerOptionText,
                      selectedYear === year && styles.datePickerOptionTextSelected,
                    ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.datePickerColumn}>
            <Text style={styles.datePickerLabel}>Month</Text>
            <ScrollView style={styles.datePickerScroll}>
              {months.map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.datePickerOption,
                    selectedMonth === month && styles.datePickerOptionSelected,
                  ]}
                  onPress={() => setSelectedMonth(month)}>
                  <Text
                    style={[
                      styles.datePickerOptionText,
                      selectedMonth === month && styles.datePickerOptionTextSelected,
                    ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.datePickerColumn}>
            <Text style={styles.datePickerLabel}>Day</Text>
            <ScrollView style={styles.datePickerScroll}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.datePickerOption,
                    selectedDay === day && styles.datePickerOptionSelected,
                  ]}
                  onPress={() => setSelectedDay(day)}>
                  <Text
                    style={[
                      styles.datePickerOptionText,
                      selectedDay === day && styles.datePickerOptionTextSelected,
                    ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        <View style={styles.modalButtonContainer}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.createButton]}
            onPress={handleConfirm}>
            <Text style={styles.createButtonText}>Select</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Helper function to parse date string to Date object
  const parseDateFromInput = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Handle date picker selection
  const handleStartDateSelect = (year: number, month: number, day: number) => {
    const dateStr = formatDateForInput(new Date(year, month - 1, day));
    setStartDate(dateStr);
    setStartDatePickerVisible(false);
  };

  const handleEndDateSelect = (year: number, month: number, day: number) => {
    const dateStr = formatDateForInput(new Date(year, month - 1, day));
    setEndDate(dateStr);
    setEndDatePickerVisible(false);
  };

  // Initialize campaign dates for new campaigns
  useEffect(() => {
    if (isCampaign && !isEdit) {
      const now = new Date();
      const defaultEndDate = new Date(now);
      defaultEndDate.setFullYear(now.getFullYear() + 1);
      setStartDate(formatDateForInput(now));
      setEndDate(formatDateForInput(defaultEndDate));
    }
  }, [isCampaign, isEdit]);

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
    console.log('[CreateEditReward] handleSave called', { isCampaign, isEdit, name, pointsPerPurchase, requirement, pinCode });
    
    // Collect all validation errors
    const missingFields: string[] = [];
    
    if (!name || !name.trim()) {
      missingFields.push('Name');
    }
    
    if (!pointsPerPurchase || !pointsPerPurchase.trim()) {
      missingFields.push('Points per purchase');
    }
    
    // For rewards (not campaigns), requirement is required
    if (!isCampaign && (!requirement || !requirement.trim())) {
      missingFields.push('Requirement');
    }
    
    // Validate PIN code (must be 4 digits)
    if (!pinCode || pinCode.length !== 4 || !/^\d{4}$/.test(pinCode)) {
      missingFields.push('PIN number (must be 4 digits)');
    }
    
    // If there are missing fields, show error modal
    if (missingFields.length > 0) {
      console.log('[CreateEditReward] Validation failed:', missingFields);
      setErrorModalMessages(missingFields);
      setErrorModalVisible(true);
      return;
    }
    
    try {
      console.log('[CreateEditReward] Validation passed, proceeding with save');
      
      // Generate QR code value using shared utility with business profile data
      // Use rewardId prop, loadedRewardId, reward prop id, or generate new unique ID (in that order)
      // For new items, generate a unique ID that includes timestamp and random suffix to prevent duplicates
      let rewardIdToSave = rewardId || loadedRewardId || reward?.id;
      if (!rewardIdToSave) {
        // Generate unique ID: timestamp + random suffix to prevent duplicates even if created in same millisecond
        rewardIdToSave = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      // For campaigns, use default requirement value (1) since campaigns don't have requirement field
      const requirementValue = isCampaign ? 1 : parseInt(requirement, 10) || 1;
      const pointsValue = parseInt(pointsPerPurchase, 10) || 1;
      
      // Get business ID for reward (needed for QR code generation)
      const auth = await getStoredAuth();
      if (!auth?.businessId) {
        Alert.alert('Error', 'No business ID found - cannot save reward');
        return;
      }
      
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
      
      const now = new Date().toISOString();
      
      let qrCodeValue: string;
      try {
        qrCodeValue = generateRewardQRCode(
          rewardIdToSave,
          name,
          requirementValue,
          rewardType,
          // NOTE: type field is only for UI presentation - pass products/actions if they exist
          selectedProducts && selectedProducts.length > 0 ? selectedProducts : undefined,
          selectedActions && selectedActions.length > 0 ? selectedActions : undefined,
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
          pointsValue, // Include points per purchase
          auth.businessId // Include business ID
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
        
        // Save as Campaign - EXACT SAME PATTERN AS REWARDS
        // Use selected rewardType (or customTypeText if "Other") as campaign.type
        const campaignTypeValue = rewardType === 'other' ? customTypeText.trim() : rewardType;
        // EXACT SAME PATTERN AS REWARDS - copy field order exactly
        // Convert date strings to ISO format (add time if not present)
        const startDateISO = startDate ? (startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`) : now;
        const endDateISO = endDate ? (endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
        
        const campaignToSave: Campaign = {
          id: rewardIdToSave,
          businessId: auth.businessId,
          name,
          description: existingCampaign?.description || '',
          type: (campaignTypeValue || 'bonus_reward') as CampaignType,
          startDate: startDateISO,
          endDate: endDateISO,
          status: existingCampaign?.status || 'active',
          targetAudience: existingCampaign?.targetAudience || 'all',
          createdAt: existingCampaign?.createdAt || now,
          updatedAt: now,
          stats: existingCampaign?.stats || {
            impressions: 0,
            clicks: 0,
            conversions: 0,
          },
          conditions: existingCampaign?.conditions,
          // EXACT SAME AS REWARDS - app-specific fields in same order
          pinCode,
          qrCode: qrCodeValue,
          selectedProducts: selectedProducts && selectedProducts.length > 0 ? selectedProducts : undefined,
          selectedActions: selectedActions && selectedActions.length > 0 ? selectedActions : undefined,
          pointsPerPurchase: pointsValue,
        };
        
        console.log('[CreateEditReward] ===== SAVING CAMPAIGN =====');
        console.log('[CreateEditReward] Form state selectedProducts:', selectedProducts);
        console.log('[CreateEditReward] Form state selectedProducts.length:', selectedProducts?.length);
        console.log('[CreateEditReward] Form state selectedProducts check:', selectedProducts && selectedProducts.length > 0);
        console.log('[CreateEditReward] Campaign selectedProducts BEFORE save:', campaignToSave.selectedProducts);
        console.log('[CreateEditReward] Campaign selectedProducts type:', typeof campaignToSave.selectedProducts);
        console.log('[CreateEditReward] Full campaignToSave:', JSON.stringify(campaignToSave, null, 2));
        
        // Save to campaigns repository (DB format)
        // NOTE: For edits, this only saves locally (no immediate Redis write)
        // For new campaigns, this also writes to Redis immediately
        await campaignsRepository.save(campaignToSave);
        
        // Generate QR codes for each selected product and action
        const newQRCodes = new Map<string, string>();
        const businessName = businessProfile?.name ?? '';
        const prods = selectedProducts || [];
        const acts = selectedActions || [];
        if (prods.length > 0) {
          prods.forEach((product) => {
            const qrCode = generateCampaignItemQRCode(
              auth.businessId,
              businessName,
              name,
              'product',
              product,
              startDateISO.split('T')[0],
              endDateISO.split('T')[0],
              prods,
              acts
            );
            newQRCodes.set(`product:${product}`, qrCode);
          });
        }
        if (acts.length > 0) {
          acts.forEach((action) => {
            const qrCode = generateCampaignItemQRCode(
              auth.businessId,
              businessName,
              name,
              'action',
              action,
              startDateISO.split('T')[0],
              endDateISO.split('T')[0],
              prods,
              acts
            );
            newQRCodes.set(`action:${action}`, qrCode);
          });
        }
        setCampaignItemQRCodes(newQRCodes);
        
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
          // NOTE: type field is only for UI presentation (which tab to show), not for data storage
          // Save both selectedProducts and selectedActions if they have values, regardless of type tab
          selectedProducts: selectedProducts && selectedProducts.length > 0 ? selectedProducts : undefined,
          selectedActions: selectedActions && selectedActions.length > 0 ? selectedActions : undefined,
          pointsPerPurchase: pointsValue,
        };
        
        // Save to local repository (DB format) - this will also write to Redis
        await rewardsRepository.save(rewardToSave);
      }
      
      // Call onSave callback if provided (for parent component notifications)
      // EXACT SAME FOR BOTH REWARDS AND CAMPAIGNS
      if (onSave) {
        const data = {
          name,
          type,
          requirement: requirementValue,
          pointsPerPurchase: pointsValue,
          rewardType,
          // NOTE: type field is only for UI presentation - pass products/actions if they exist
          selectedProducts: selectedProducts && selectedProducts.length > 0 ? selectedProducts : undefined,
          selectedActions: selectedActions && selectedActions.length > 0 ? selectedActions : undefined,
          pinCode,
          qrCode: qrCodeValue,
        };
        onSave(data);
      }
      
      // For rewards: if creating new, show QR code modal first, then success modal
      // If editing, show success modal directly
      // NOTE: Campaigns already show success modal above (line 514), so skip this for campaigns
      if (!isCampaign) {
        if (!isEdit) {
          // Show QR code modal first for new rewards
          setCreatedRewardName(name);
          setCreatedRewardQrCode(qrCodeValue);
          setQrCodeModalVisible(true);
        } else {
          // Show success modal for reward edits
          setSuccessModalMessage('Changes saved');
          setSuccessModalVisible(true);
        }
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
    // NOTE: type field is only for UI presentation - don't change it when selecting products
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
      // Simple delete: just delete from local storage
      if (isCampaign) {
        await campaignsRepository.delete(rewardId);
        console.log(`✅ [CreateEditReward] Campaign ${rewardId} deleted from local storage`);
      } else {
        await rewardsRepository.delete(rewardId);
        console.log(`✅ [CreateEditReward] Reward ${rewardId} deleted from local storage`);
      }
      
      // Close modal and navigate to Home to refresh
      setDeleteConfirmVisible(false);
      onNavigate('Home');
    } catch (error) {
      console.error('Error deleting:', error);
      Alert.alert('Error', isCampaign ? 'Failed to delete campaign. Please try again.' : 'Failed to delete reward. Please try again.');
      setDeleteConfirmVisible(false);
    }
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
          
          {isCampaign ? (
            <>
              {/* Campaign Type Dropdown */}
              <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setCampaignTypeDropdownVisible(true)}>
            <Text
              style={[
                styles.dropdownText,
                !rewardType && styles.dropdownPlaceholder,
              ]}
              numberOfLines={1}>
              {rewardType === 'other' 
                ? (customTypeText || 'Other (enter custom type)')
                : rewardType === 'double_stamps' ? 'Double Stamps'
                : rewardType === 'bonus_reward' ? 'Bonus Reward'
                : rewardType === 'flash_sale' ? 'Flash Sale'
                : rewardType === 'referral' ? 'Referral'
                : rewardType === 'birthday' ? 'Birthday'
                : rewardType === 'happy_hour' ? 'Happy Hour'
                : rewardType === 'loyalty_tier' ? 'Loyalty Tier'
                : rewardType === 'free_product' ? 'Free Product'
                : rewardType === 'discount' ? 'Discount'
                : 'Select campaign type'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {/* Custom Type Text Input (shown when "Other" is selected) */}
          {rewardType === 'other' && (
            <TextInput
              style={[styles.input, {marginTop: 8}]}
              value={customTypeText}
              onChangeText={setCustomTypeText}
              placeholder="Enter custom campaign type"
              placeholderTextColor={Colors.text.light}
            />
          )}

          {/* Campaign Type Dropdown Modal */}
          <Modal
            visible={campaignTypeDropdownVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setCampaignTypeDropdownVisible(false)}>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setCampaignTypeDropdownVisible(false)}>
              <View style={styles.dropdownModal}>
                <ScrollView>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'double_stamps' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('double_stamps');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'double_stamps' && styles.dropdownOptionTextSelected,
                      ]}>
                      Double Stamps
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'bonus_reward' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('bonus_reward');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'bonus_reward' && styles.dropdownOptionTextSelected,
                      ]}>
                      Bonus Reward
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'flash_sale' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('flash_sale');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'flash_sale' && styles.dropdownOptionTextSelected,
                      ]}>
                      Flash Sale
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'referral' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('referral');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'referral' && styles.dropdownOptionTextSelected,
                      ]}>
                      Referral
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'birthday' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('birthday');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'birthday' && styles.dropdownOptionTextSelected,
                      ]}>
                      Birthday
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'happy_hour' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('happy_hour');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'happy_hour' && styles.dropdownOptionTextSelected,
                      ]}>
                      Happy Hour
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'loyalty_tier' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('loyalty_tier');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'loyalty_tier' && styles.dropdownOptionTextSelected,
                      ]}>
                      Loyalty Tier
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'free_product' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('free_product');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'free_product' && styles.dropdownOptionTextSelected,
                      ]}>
                      Free Product
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'discount' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('discount');
                      setCustomTypeText('');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'discount' && styles.dropdownOptionTextSelected,
                      ]}>
                      Discount
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      rewardType === 'other' && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setRewardType('other');
                      setCampaignTypeDropdownVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        rewardType === 'other' && styles.dropdownOptionTextSelected,
                      ]}>
                      Other (Custom)
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
            </>
          ) : (
            // For rewards, show radio buttons (free_product, discount, other)
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  rewardType === 'free_product' && styles.radioOptionSelected,
                ]}
                onPress={() => {
                  setRewardType('free_product');
                  setCustomTypeText('');
                }}>
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
                onPress={() => {
                  setRewardType('discount');
                  setCustomTypeText('');
                }}>
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
                onPress={() => {
                  setRewardType('other');
                }}>
                <Text
                  style={[
                    styles.radioText,
                    rewardType === 'other' && styles.radioTextSelected,
                  ]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Custom Type Text Input for Rewards (shown when "Other" is selected) */}
          {!isCampaign && rewardType === 'other' && (
            <TextInput
              style={[styles.input, {marginTop: 8}]}
              value={customTypeText}
              onChangeText={setCustomTypeText}
              placeholder="Enter custom reward type"
              placeholderTextColor={Colors.text.light}
            />
          )}

          {/* Campaign Date Pickers - Hard positioned before PIN Code for visibility and touch */}
          {isCampaign && (
            <>
              <Text style={styles.label}>Campaign Start Date *</Text>
              <TouchableOpacity
                style={[styles.input, {zIndex: 10}]}
                activeOpacity={0.7}
                onPress={() => {
                  console.log('[CreateEditReward] Start date picker opened, current startDate:', startDate);
                  setStartDatePickerVisible(true);
                }}>
                <Text style={[styles.dateInputText, !startDate && styles.dateInputPlaceholder]}>
                  {startDate || 'Select start date (YYYY-MM-DD)'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.label}>End Date *</Text>
              <TouchableOpacity
                style={[styles.input, {zIndex: 10}]}
                activeOpacity={0.7}
                onPress={() => setEndDatePickerVisible(true)}>
                <Text style={[styles.dateInputText, !endDate && styles.dateInputPlaceholder]}>
                  {endDate || 'Select end date (YYYY-MM-DD)'}
                </Text>
              </TouchableOpacity>

              {/* Start Date Picker Modal */}
              <Modal
                visible={startDatePickerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setStartDatePickerVisible(false)}>
                <View style={[styles.modalOverlay, {zIndex: 9999}]}>
                  <View style={styles.datePickerModal}>
                    <Text style={styles.modalTitle}>Select Start Date</Text>
                    <DatePickerComponent
                      initialDate={startDate ? parseDateFromInput(startDate) : new Date()}
                      onDateSelect={handleStartDateSelect}
                      onCancel={() => setStartDatePickerVisible(false)}
                    />
                  </View>
                </View>
              </Modal>

              {/* End Date Picker Modal */}
              <Modal
                visible={endDatePickerVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEndDatePickerVisible(false)}>
                <View style={[styles.modalOverlay, {zIndex: 9999}]}>
                  <View style={styles.datePickerModal}>
                    <Text style={styles.modalTitle}>Select End Date</Text>
                    <DatePickerComponent
                      initialDate={endDate ? parseDateFromInput(endDate) : new Date()}
                      onDateSelect={handleEndDateSelect}
                      onCancel={() => setEndDatePickerVisible(false)}
                    />
                  </View>
                </View>
              </Modal>
            </>
          )}

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
              
              {/* Products Table */}
              {selectedProducts.length > 0 && (
                <View style={styles.summaryTable}>
                  <View style={styles.summaryTableHeader}>
                    <Text style={styles.summaryTableHeaderText}>Products</Text>
                    <Text style={styles.summaryTableHeaderText}>QR Code</Text>
                  </View>
                  {selectedProducts.map((product, idx) => (
                    <View key={`product-${idx}`} style={styles.summaryTableRow}>
                      <Text style={styles.summaryTableCell}>{product}</Text>
                      <TouchableOpacity
                        style={styles.qrCodeButton}
                        onPress={() => {
                          const qrKey = `product:${product}`;
                          const qrValue = campaignItemQRCodes.get(qrKey);
                          if (qrValue) {
                            setCampaignQRModalTitle(`Product: ${product}`);
                            setCampaignQRModalValue(qrValue);
                            setCampaignQRModalVisible(true);
                          }
                        }}>
                        <Text style={styles.qrCodeButtonText}>View QR</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions Table */}
              {selectedActions.length > 0 && (
                <View style={styles.summaryTable}>
                  <View style={styles.summaryTableHeader}>
                    <Text style={styles.summaryTableHeaderText}>Actions</Text>
                    <Text style={styles.summaryTableHeaderText}>QR Code</Text>
                  </View>
                  {selectedActions.map((action, idx) => (
                    <View key={`action-${idx}`} style={styles.summaryTableRow}>
                      <Text style={styles.summaryTableCell}>{action}</Text>
                      <TouchableOpacity
                        style={styles.qrCodeButton}
                        onPress={() => {
                          const qrKey = `action:${action}`;
                          const qrValue = campaignItemQRCodes.get(qrKey);
                          if (qrValue) {
                            setCampaignQRModalTitle(`Action: ${action}`);
                            setCampaignQRModalValue(qrValue);
                            setCampaignQRModalVisible(true);
                          }
                        }}>
                        <Text style={styles.qrCodeButtonText}>View QR</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.summarySection}>
                <Text style={styles.summaryLabel}>Reward defined:</Text>
                <Text style={styles.summaryItem}>
                  {rewardType === 'other' 
                    ? (customTypeText || 'Other')
                    : rewardType === 'double_stamps' ? 'Double Stamps'
                    : rewardType === 'bonus_reward' ? 'Bonus Reward'
                    : rewardType === 'flash_sale' ? 'Flash Sale'
                    : rewardType === 'referral' ? 'Referral'
                    : rewardType === 'birthday' ? 'Birthday'
                    : rewardType === 'happy_hour' ? 'Happy Hour'
                    : rewardType === 'loyalty_tier' ? 'Loyalty Tier'
                    : rewardType === 'free_product' ? 'Free Product'
                    : rewardType === 'discount' ? 'Discount'
                    : 'Not selected'}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.note}>
            * Business verification required to award points for actions
          </Text>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={() => {
              console.log('[CreateEditReward] Save button pressed', { isCampaign, isEdit, currentScreen });
              handleSave();
            }}>
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
            reward.pinCode || '',
            businessProfile ? { name: businessProfile.name } : undefined,
            undefined, // pointsPerPurchase
            reward.businessId // businessId
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
      
      {/* Campaign Product/Action QR Code Modal */}
      <QRCodeModal
        visible={campaignQRModalVisible}
        title={campaignQRModalTitle}
        qrValue={campaignQRModalValue}
        onClose={() => setCampaignQRModalVisible(false)}
        showSuccessMessage={false}
      />
      
      {/* Error Modal for Missing Fields */}
      <Modal
        visible={errorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Create Failed - Missing Data</Text>
            <Text style={styles.deleteModalMessage}>
              Please complete the following required fields:
            </Text>
            <View style={{marginVertical: 12}}>
              {errorModalMessages.map((field, index) => (
                <Text key={index} style={[styles.deleteModalMessage, {marginLeft: 16, marginTop: 4}]}>
                  • {field}
                </Text>
              ))}
            </View>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => setErrorModalVisible(false)}>
                <Text style={styles.deleteModalButtonTextCancel}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  summaryTable: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 8,
    overflow: 'hidden',
  },
  summaryTableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[100],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryTableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  summaryTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  summaryTableCell: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
  qrCodeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  qrCodeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
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
  dateInputText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  dateInputPlaceholder: {
    color: Colors.text.light,
  },
  datePickerModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  datePickerContainer: {
    width: '100%',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    height: 200,
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  datePickerScroll: {
    flex: 1,
  },
  datePickerOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  datePickerOptionSelected: {
    backgroundColor: Colors.primary,
  },
  datePickerOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  datePickerOptionTextSelected: {
    color: Colors.background,
    fontWeight: '600',
  },
});

export default CreateEditRewardPage;

