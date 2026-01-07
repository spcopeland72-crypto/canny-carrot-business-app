import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
import QRCodeModal from './QRCodeModal';
import {generateCompanyQRCode} from '../utils/qrCodeUtils';
import {businessRepository} from '../services/localRepository';
import {generateCircularIcon} from '../utils/logoUtils';
import type {BusinessProfile} from '../types';

interface BusinessProfilePageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const BusinessProfilePage: React.FC<BusinessProfilePageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [businessName, setBusinessName] = useState('Blackwells Butchers');
  const [email, setEmail] = useState('info@blackwells.com');
  const [phone, setPhone] = useState('+44 20 1234 5678');
  const [address, setAddress] = useState('123 High Street, London');
  const [logo, setLogo] = useState<string | null>(null); // Base64 or URI
  const [logoIcon, setLogoIcon] = useState<string | null>(null); // Circular icon version
  const [logoLoading, setLogoLoading] = useState(false);
  const [file1, setFile1] = useState<any>(null);
  const [file2, setFile2] = useState<any>(null);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load business profile on mount
  useEffect(() => {
    const loadBusinessProfile = async () => {
      try {
        const profile = await businessRepository.get();
        if (profile) {
          setBusinessName(profile.name || '');
          setEmail(profile.email || '');
          setPhone(profile.phone || '');
          setAddress(profile.address || profile.addressLine1 || '');
          if (profile.logo) {
            setLogo(profile.logo);
          }
        }
      } catch (error) {
        console.error('Error loading business profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBusinessProfile();
  }, []);
  
  // Generate company QR code using shared utility
  // In production, this would be loaded from the business profile (assigned by admin)
  // For demo: Generate a consistent number based on business ID
  // Admin assigns sequential numbers: 0000001, 0000002, ..., 1000000
  const getBusinessNumber = (businessId: string): number => {
    let businessNumber = 0;
    if (businessId) {
      // Simple hash to convert ID to a consistent number (for demo purposes)
      // In production, this number comes from the admin system
      for (let i = 0; i < businessId.length; i++) {
        businessNumber = ((businessNumber << 5) - businessNumber) + businessId.charCodeAt(i);
        businessNumber = businessNumber & businessNumber; // Convert to 32bit integer
      }
      businessNumber = Math.abs(businessNumber) % 1000000 + 1; // 1-1000000
    } else {
      // Default to 1 if no ID
      businessNumber = 1;
    }
    return businessNumber;
  };
  
  // Company QR code - assigned when business is created by Canny Carrot admin
  // Format: COMPANY:0000001:BusinessName (supports up to 1,000,000 businesses)
  // In production, this would be loaded from the business profile stored in the database
  const companyQRCode = generateCompanyQRCode(
    getBusinessNumber('blackwells-butchers'),
    businessName
  );

  // Logo upload with validation
  const pickLogo = async () => {
    try {
      setLogoLoading(true);
      
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant camera roll permissions to upload a logo.'
          );
          setLogoLoading(false);
          return;
        }
      }

      // Launch image picker with size constraints
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square logo
        quality: 0.7, // Reduced quality for smaller file size
        base64: true, // Get base64 for storage
        // Resize to max 512x512 pixels to keep QR code data small
        allowsMultipleSelection: false,
      });

      if (result.canceled) {
        setLogoLoading(false);
        return;
      }

      const asset = result.assets[0];
      
      // Validate pixel dimensions (max 512x512 for QR code compatibility)
      const MAX_DIMENSION = 512;
      if (asset.width && asset.height) {
        if (asset.width > MAX_DIMENSION || asset.height > MAX_DIMENSION) {
          Alert.alert(
            'Image Too Large',
            `Logo dimensions must be ${MAX_DIMENSION}x${MAX_DIMENSION} pixels or smaller. Your image is ${asset.width}x${asset.height} pixels. Please resize the image and try again.`
          );
          setLogoLoading(false);
          return;
        }
      }
      
      // Validate file size (max 500KB for QR code compatibility - much smaller than 2MB)
      const maxSizeBytes = 500 * 1024; // 500KB - QR codes have limited data capacity
      if (asset.fileSize && asset.fileSize > maxSizeBytes) {
        Alert.alert(
          'File Too Large',
          `Logo must be less than 500KB for QR code compatibility. Your file is ${(asset.fileSize / 1024).toFixed(0)}KB. Please compress the image and try again.`
        );
        setLogoLoading(false);
        return;
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (asset.mimeType && !allowedTypes.includes(asset.mimeType.toLowerCase())) {
        Alert.alert(
          'Invalid File Type',
          'Logo must be PNG, JPG, or WEBP format.'
        );
        setLogoLoading(false);
        return;
      }

      // Use base64 if available, otherwise use URI
      if (asset.base64) {
        // Store as data URI for easy display
        const base64Uri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        setLogo(base64Uri);
        console.log(`[BusinessProfile] Logo saved: ${asset.width || 'unknown'}x${asset.height || 'unknown'}, file size: ${asset.fileSize ? (asset.fileSize / 1024).toFixed(1) + 'KB' : 'unknown'}`);
        
        // Generate circular icon (64x64, same size as reward icons)
        try {
          const circularIcon = await generateCircularIcon(base64Uri, 64);
          if (circularIcon) {
            setLogoIcon(circularIcon);
            console.log('[BusinessProfile] Circular icon generated successfully');
          } else {
            console.warn('[BusinessProfile] Failed to generate circular icon');
          }
        } catch (iconError) {
          console.error('[BusinessProfile] Error generating circular icon:', iconError);
        }
      } else if (asset.uri) {
        setLogo(asset.uri);
        // For URI-based images, we can't generate circular icon easily, so skip it
        setLogoIcon(null);
      } else {
        Alert.alert('Error', 'Failed to process image. Please try again.');
      }
    } catch (error) {
      console.error('Error picking logo:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setLogoLoading(false);
    }
  };

  const removeLogo = () => {
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove the logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setLogo(null);
            setLogoIcon(null);
          },
        },
      ]
    );
  };

  const pickDocument = async (setter: (doc: any) => void) => {
    // TODO: Implement with expo-document-picker
    Alert.alert('Info', 'Document picker will be implemented with expo-document-picker');
    // try {
    //   const result = await DocumentPicker.getDocumentAsync({
    //     type: '*/*',
    //     copyToCacheDirectory: true,
    //   });
    //   if (!result.canceled) {
    //     setter(result.assets[0]);
    //   }
    // } catch (err) {
    //   Alert.alert('Error', 'Failed to pick document');
    // }
  };

  const handleSave = async () => {
    if (!businessName || !email) {
      Alert.alert('Error', 'Please fill in all required fields (Business Name and Email)');
      return;
    }

    try {
      // Get existing profile or create new one
      const existingProfile = await businessRepository.get();
      const businessId = existingProfile?.id || `business-${Date.now()}`;
      
      // Build updated profile
      const updatedProfile: BusinessProfile = {
        id: businessId,
        name: businessName,
        email: email,
        phone: phone,
        address: address,
        logo: logo || undefined, // Store logo (base64 or URI)
        logoIcon: logoIcon || undefined, // Store circular icon version
        ...existingProfile, // Preserve other fields
        updatedAt: new Date().toISOString(),
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
      };

      // Save to local repository
      await businessRepository.save(updatedProfile);
      
      Alert.alert('Success', 'Business profile updated successfully');
      onBack?.();
    } catch (error) {
      console.error('Error saving business profile:', error);
      Alert.alert('Error', 'Failed to save business profile. Please try again.');
    }
  };

  return (
    <PageTemplate
      title="Business Profile"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Business Name *</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Enter business name"
            placeholderTextColor={Colors.text.light}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
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

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            placeholderTextColor={Colors.text.light}
            multiline
          />

          <Text style={styles.label}>Company QR Code</Text>
          <TouchableOpacity
            style={styles.qrCodeButton}
            onPress={() => setQrCodeModalVisible(true)}>
            <Text style={styles.qrCodeButtonText}>📱 View Company QR Code</Text>
          </TouchableOpacity>
          <Text style={styles.qrCodeHint}>
            This QR code is assigned when your business is created by Canny Carrot admin
          </Text>

          <Text style={styles.label}>Logo</Text>
          <Text style={styles.labelHint}>
            Recommended: Square image, max 512x512 pixels, max 500KB, PNG/JPG/WEBP format
          </Text>
          <TouchableOpacity
            style={[styles.uploadButton, logoLoading && styles.uploadButtonDisabled]}
            onPress={pickLogo}
            disabled={logoLoading}>
            {logoLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.background} />
                <Text style={[styles.uploadButtonText, {marginLeft: 8}]}>
                  Processing...
                </Text>
              </View>
            ) : (
              <Text style={styles.uploadButtonText}>
                {logo ? 'Change Logo' : 'Upload Logo'}
              </Text>
            )}
          </TouchableOpacity>
          {logo && (
            <View style={styles.logoContainer}>
              <View style={styles.logoRow}>
                {/* Full Logo */}
                <View style={styles.logoPreview}>
                  <Text style={styles.logoLabel}>Full Logo</Text>
                  <Image source={{uri: logo}} style={styles.thumbnail} />
                </View>
                {/* Circular Icon */}
                {logoIcon && (
                  <View style={styles.logoPreview}>
                    <Text style={styles.logoLabel}>Circular Icon</Text>
                    <View style={styles.circularIconContainer}>
                      <Image source={{uri: logoIcon}} style={styles.circularIcon} />
                    </View>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeLogoButton}
                onPress={removeLogo}>
                <Text style={styles.removeLogoText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>File 1 (Flyer/Menu/etc)</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickDocument(setFile1)}>
            <Text style={styles.uploadButtonText}>
              {file1 ? 'Change File' : 'Upload File'}
            </Text>
          </TouchableOpacity>
          {file1 && (
            <Text style={styles.fileName}>{file1.name}</Text>
          )}

          <Text style={styles.label}>File 2 (Flyer/Menu/etc)</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickDocument(setFile2)}>
            <Text style={styles.uploadButtonText}>
              {file2 ? 'Change File' : 'Upload File'}
            </Text>
          </TouchableOpacity>
          {file2 && (
            <Text style={styles.fileName}>{file2.name}</Text>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Company QR Code Modal */}
      <QRCodeModal
        visible={qrCodeModalVisible}
        title={`${businessName} - Company QR Code`}
        qrValue={companyQRCode}
        onClose={() => setQrCodeModalVisible(false)}
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
  uploadButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  logoContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  logoPreview: {
    alignItems: 'center',
  },
  logoLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  circularIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularIcon: {
    width: 64,
    height: 64,
  },
  removeLogoButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.neutral[200],
    borderRadius: 6,
  },
  removeLogoText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    color: Colors.text.secondary,
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
  qrCodeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  qrCodeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  qrCodeHint: {
    fontSize: 12,
    color: Colors.text.light,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 8,
  },
});

export default BusinessProfilePage;

