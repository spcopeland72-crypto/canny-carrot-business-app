import React, {useState, useEffect, useRef} from 'react';
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
  Modal,
  PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
import QRCodeModal from './QRCodeModal';
import {generateCompanyQRCode} from '../utils/qrCodeUtils';
import {businessRepository} from '../services/localRepository';
import {appendEditEvent} from '../services/eventLogService';
import {generateCircularIcon, resizeToBanner, cropBannerRegion, BANNER_HEIGHT, BANNER_WIDTH} from '../utils/logoUtils';
import type {BusinessProfile} from '../types';

const AVATAR_SIZE = 128; // Optimal for customer and business apps

interface BusinessProfilePageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
}

const BusinessProfilePage: React.FC<BusinessProfilePageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  onLogout,
}) => {
  const [businessName, setBusinessName] = useState('Blackwells Butchers');
  const [email, setEmail] = useState('info@blackwells.com');
  const [phone, setPhone] = useState('+44 20 1234 5678');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('United Kingdom');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoIcon, setLogoIcon] = useState<string | null>(null); // Round avatar (128px)
  const [logoLoading, setLogoLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [file1, setFile1] = useState<any>(null);
  const [file2, setFile2] = useState<any>(null);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Remove confirmation (works on web where Alert.alert has only one button)
  const [confirmRemove, setConfirmRemove] = useState<'logo' | 'banner' | null>(null);
  // Banner crop modal: user moves selection vertically/horizontally then confirms
  const [bannerCropUri, setBannerCropUri] = useState<string | null>(null);
  const [bannerCropOffsetX, setBannerCropOffsetX] = useState(0.5);
  const [bannerCropOffsetY, setBannerCropOffsetY] = useState(0.5);
  const [bannerImageSize, setBannerImageSize] = useState<{ width: number; height: number } | null>(null);
  const [bannerLayoutSize, setBannerLayoutSize] = useState<{ width: number; height: number } | null>(null);
  const bannerCropBoxSize = useRef<{ width: number; height: number } | null>(null);
  const bannerCropDispSize = useRef<{ width: number; height: number } | null>(null);

  // Load business profile on mount
  useEffect(() => {
    const loadBusinessProfile = async () => {
      try {
        const profile = await businessRepository.get();
        if (profile) {
          setBusinessName(profile.name || '');
          setEmail(profile.email || '');
          setPhone(profile.phone || '');
          setAddressLine1(profile.addressLine1 ?? '');
          setAddressLine2(profile.addressLine2 ?? '');
          setCity(profile.city ?? '');
          setPostcode(profile.postcode ?? '');
          setRegion(profile.region ?? '');
          setCountry(profile.country ?? 'United Kingdom');
          if (profile.logo) setLogo(profile.logo);
          if (profile.logoIcon) setLogoIcon(profile.logoIcon);
          if (profile.banner) setBanner(profile.banner);
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
        
        // Generate round avatar (128x128, optimal for customer and business apps)
        try {
          const circularIcon = await generateCircularIcon(base64Uri, AVATAR_SIZE);
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

  const removeLogo = () => setConfirmRemove('logo');
  const doRemoveLogo = () => {
    setLogo(null);
    setLogoIcon(null);
    setConfirmRemove(null);
  };

  const pickBanner = async () => {
    try {
      setBannerLoading(true);
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a banner.');
          setBannerLoading(false);
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
        base64: true,
        allowsMultipleSelection: false,
      });
      if (result.canceled) {
        setBannerLoading(false);
        return;
      }
      const asset = result.assets[0];
      const uriOrBase64 = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;
      if (!uriOrBase64) {
        setBannerLoading(false);
        return;
      }
      setBannerCropUri(uriOrBase64);
      setBannerCropOffsetX(0.5);
      setBannerCropOffsetY(0.5);
      setBannerImageSize(asset.width && asset.height ? { width: asset.width, height: asset.height } : null);
      setBannerLayoutSize(null);
      bannerCropBoxSize.current = null;
    } catch (error) {
      console.error('Error picking banner:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setBannerLoading(false);
    }
  };

  const onBannerImageLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    setBannerLayoutSize({ width, height });
  };

  const onBannerImageLoad = (e: { nativeEvent?: { source?: { width?: number; height?: number } } }) => {
    const source = e?.nativeEvent?.source;
    if (source?.width != null && source?.height != null) {
      setBannerImageSize({ width: source.width, height: source.height });
      return;
    }
    if (bannerCropUri && !bannerImageSize) {
      Image.getSize(
        bannerCropUri,
        (width, height) => setBannerImageSize({ width, height }),
        () => {}
      );
    }
  };

  const getBannerCropBox = () => {
    const img = bannerImageSize;
    const layout = bannerLayoutSize;
    if (!img || !layout) return null;
    const scale = Math.min(layout.width / img.width, layout.height / img.height);
    const dispW = img.width * scale;
    const dispH = img.height * scale;
    const offsetX = (layout.width - dispW) / 2;
    const offsetY = (layout.height - dispH) / 2;
    const aspect = BANNER_WIDTH / BANNER_HEIGHT;
    const cropW = Math.min(img.width, img.height * aspect);
    const cropH = cropW / aspect;
    const boxW = cropW * scale;
    const boxH = cropH * scale;
    const maxX = Math.max(0, dispW - boxW);
    const maxY = Math.max(0, dispH - boxH);
    const left = offsetX + bannerCropOffsetX * maxX;
    const top = offsetY + bannerCropOffsetY * maxY;
    bannerCropBoxSize.current = { width: boxW, height: boxH };
    bannerCropDispSize.current = { width: dispW, height: dispH };
    return { left, top, width: boxW, height: boxH, originX: bannerCropOffsetX * (img.width - cropW), originY: bannerCropOffsetY * (img.height - cropH), cropW, cropH };
  };

  const bannerCropOffsetsRef = useRef({ x: 0.5, y: 0.5 });
  const bannerCropStartOffsets = useRef({ x: 0.5, y: 0.5 });
  bannerCropOffsetsRef.current = { x: bannerCropOffsetX, y: bannerCropOffsetY };
  const bannerCropPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        bannerCropStartOffsets.current = { ...bannerCropOffsetsRef.current };
      },
      onPanResponderMove: (_, g) => {
        const disp = bannerCropDispSize.current;
        const box = bannerCropBoxSize.current;
        if (!disp || !box) return;
        const maxX = Math.max(0, disp.width - box.width);
        const maxY = Math.max(0, disp.height - box.height);
        const start = bannerCropStartOffsets.current;
        if (maxY > 0) setBannerCropOffsetY(Math.max(0, Math.min(1, start.y + g.dy / maxY)));
        if (maxX > 0) setBannerCropOffsetX(Math.max(0, Math.min(1, start.x + g.dx / maxX)));
      },
    })
  ).current;

  const confirmBannerCrop = async () => {
    if (!bannerCropUri || !bannerImageSize) return;
    const box = getBannerCropBox();
    if (!box) return;
    setBannerLoading(true);
    try {
      const out = await cropBannerRegion(bannerCropUri, box.originX, box.originY, box.cropW, box.cropH);
      if (out) {
        setBanner(out);
        console.log(`[BusinessProfile] Banner saved: ${BANNER_WIDTH}x${BANNER_HEIGHT}px`);
      }
    } finally {
      setBannerCropUri(null);
      setBannerImageSize(null);
      setBannerLayoutSize(null);
      setBannerLoading(false);
    }
  };

  const cancelBannerCrop = () => {
    setBannerCropUri(null);
    setBannerImageSize(null);
    setBannerLayoutSize(null);
  };

  const removeBanner = () => setConfirmRemove('banner');
  const doRemoveBanner = () => {
    setBanner(null);
    setConfirmRemove(null);
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
      
      // Build updated profile: spread existing first. Only overwrite address/banner/images when form has a value,
      // so we never wipe Redis with undefined when user saves without editing those fields (e.g. after incomplete load).
      const updatedProfile: BusinessProfile = {
        ...existingProfile,
        id: businessId,
        name: businessName,
        email: email,
        phone: phone,
        address: [addressLine1, addressLine2, city, postcode].filter(Boolean).join(', ') || existingProfile?.address,
        addressLine1: (addressLine1?.trim() || undefined) ?? existingProfile?.addressLine1,
        addressLine2: (addressLine2?.trim() || undefined) ?? existingProfile?.addressLine2,
        city: (city?.trim() || undefined) ?? existingProfile?.city,
        postcode: (postcode?.trim() || undefined) ?? existingProfile?.postcode,
        region: (region?.trim() || undefined) ?? existingProfile?.region,
        country: (country?.trim() || undefined) ?? existingProfile?.country,
        logo: logo ?? existingProfile?.logo,
        logoIcon: logoIcon ?? existingProfile?.logoIcon,
        banner: banner ?? existingProfile?.banner,
        updatedAt: new Date().toISOString(),
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
      };

      // Proof (dev console): what is saved from Business Profile page
      console.log('[PROFILE SAVE PROOF] Saved to local repo:', {
        keys: Object.keys(updatedProfile),
        addressLine1: updatedProfile.addressLine1,
        addressLine2: updatedProfile.addressLine2,
        city: updatedProfile.city,
        postcode: updatedProfile.postcode,
        region: updatedProfile.region,
        country: updatedProfile.country,
        hasLogo: !!updatedProfile.logo,
        hasLogoIcon: !!updatedProfile.logoIcon,
        hasBanner: !!updatedProfile.banner,
        logoLen: updatedProfile.logo?.length ?? 0,
        logoIconLen: updatedProfile.logoIcon?.length ?? 0,
        bannerLen: updatedProfile.banner?.length ?? 0,
      });

      // Save to local repository
      await businessRepository.save(updatedProfile);
      await appendEditEvent('business_profile', businessId, businessName).catch(() => {});

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
      onBack={onBack}
      onLogout={onLogout}>
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

          <Text style={styles.label}>Address (UK)</Text>
          <TextInput
            style={styles.input}
            value={addressLine1}
            onChangeText={setAddressLine1}
            placeholder="Address line 1"
            placeholderTextColor={Colors.text.light}
          />
          <TextInput
            style={styles.input}
            value={addressLine2}
            onChangeText={setAddressLine2}
            placeholder="Address line 2 (optional)"
            placeholderTextColor={Colors.text.light}
          />
          <View style={styles.addressRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={Colors.text.light}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={postcode}
              onChangeText={setPostcode}
              placeholder="Postcode"
              placeholderTextColor={Colors.text.light}
              autoCapitalize="characters"
            />
          </View>
          <TextInput
            style={styles.input}
            value={region}
            onChangeText={setRegion}
            placeholder="Region / County (optional)"
            placeholderTextColor={Colors.text.light}
          />
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={setCountry}
            placeholder="Country"
            placeholderTextColor={Colors.text.light}
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

          <Text style={styles.label}>Logo / Avatar</Text>
          <Text style={styles.labelHint}>
            Upload an image; crop to a square, then we create a round avatar at {AVATAR_SIZE}×{AVATAR_SIZE}px for customer and business apps. Max 512×512, 500KB, PNG/JPG/WEBP.
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
                {logo ? 'Change Logo / Avatar' : 'Upload Logo / Avatar'}
              </Text>
            )}
          </TouchableOpacity>
          {logo && (
            <View style={styles.logoContainer}>
              <View style={styles.logoRow}>
                <View style={styles.logoPreview}>
                  <Text style={styles.logoLabel}>Full Logo</Text>
                  <Image source={{uri: logo}} style={styles.thumbnail} />
                </View>
                {logoIcon && (
                  <View style={styles.logoPreview}>
                    <Text style={styles.logoLabel}>Round Avatar ({AVATAR_SIZE}px)</Text>
                    <View style={[styles.circularIconContainer, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
                      <Image source={{uri: logoIcon}} style={[styles.circularIcon, { width: AVATAR_SIZE, height: AVATAR_SIZE }]} />
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

          <Text style={styles.label}>Banner image</Text>
          <Text style={styles.labelHint}>
            {BANNER_WIDTH}×{BANNER_HEIGHT}px for use in customer and business app headers. Crop/resize applied on upload.
          </Text>
          <TouchableOpacity
            style={[styles.uploadButton, bannerLoading && styles.uploadButtonDisabled]}
            onPress={pickBanner}
            disabled={bannerLoading}>
            {bannerLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.background} />
                <Text style={[styles.uploadButtonText, {marginLeft: 8}]}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.uploadButtonText}>
                {banner ? 'Change Banner' : 'Upload Banner'}
              </Text>
            )}
          </TouchableOpacity>
          {banner && (
            <View style={styles.bannerContainer}>
              <Image source={{uri: banner}} style={styles.bannerPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.removeLogoButton} onPress={removeBanner}>
                <Text style={styles.removeLogoText}>✕ Remove banner</Text>
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

      {/* Remove confirmation modal (works on web) */}
      <Modal visible={confirmRemove !== null} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>
              {confirmRemove === 'logo' ? 'Remove Logo/Avatar?' : 'Remove Banner?'}
            </Text>
            <Text style={styles.confirmMessage}>
              {confirmRemove === 'logo'
                ? 'Are you sure you want to remove the logo and avatar?'
                : 'Are you sure you want to remove the banner image?'}
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmButtonCancel} onPress={() => setConfirmRemove(null)}>
                <Text style={styles.confirmButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButtonRemove}
                onPress={confirmRemove === 'logo' ? doRemoveLogo : doRemoveBanner}>
                <Text style={styles.confirmButtonRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Banner crop modal: drag selection then confirm */}
      <Modal visible={!!bannerCropUri} transparent animationType="slide">
        <View style={styles.cropModalRoot}>
          <View style={styles.cropModalContent}>
            <Text style={styles.cropModalTitle}>Select banner area</Text>
            <Text style={styles.cropModalHint}>Drag the frame to move the selection vertically (or horizontally), then confirm.</Text>
            {bannerCropUri && (
              <View
                style={styles.cropImageWrap}
                onLayout={onBannerImageLayout}
                {...bannerCropPan.panHandlers}>
                <Image
                  source={{ uri: bannerCropUri }}
                  style={styles.cropImage}
                  resizeMode="contain"
                  onLoad={onBannerImageLoad}
                />
                {bannerLayoutSize && bannerImageSize && (() => {
                  const box = getBannerCropBox();
                  if (!box) return null;
                  return (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <View style={[styles.cropMask, { height: box.top }]} />
                      <View style={[styles.cropMaskRow, { height: box.height }]}>
                        <View style={[styles.cropMask, { width: box.left }]} />
                        <View style={[styles.cropSelection, { width: box.width, height: box.height }]} />
                        <View style={[styles.cropMask, { flex: 1 }]} />
                      </View>
                      <View style={[styles.cropMask, { flex: 1 }]} />
                    </View>
                  );
                })()}
              </View>
            )}
            <View style={styles.cropModalButtons}>
              <TouchableOpacity style={styles.confirmButtonCancel} onPress={cancelBannerCrop}>
                <Text style={styles.confirmButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cropConfirmButton} onPress={confirmBannerCrop}>
                <Text style={styles.confirmButtonRemoveText}>Use this area</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
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
  bannerContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  bannerPreview: {
    width: '100%',
    maxWidth: 320,
    height: 96,
    borderRadius: 8,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 15,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmButtonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.neutral[200],
  },
  confirmButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmButtonRemove: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#dc3545',
  },
  confirmButtonRemoveText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.background,
  },
  cropModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cropModalContent: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    maxWidth: '100%',
    maxHeight: '90%',
  },
  cropModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  cropModalHint: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  cropImageWrap: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: Colors.neutral[100],
    borderRadius: 8,
    overflow: 'hidden',
  },
  cropImage: {
    width: '100%',
    height: '100%',
  },
  cropMask: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cropMaskRow: {
    flexDirection: 'row',
  },
  cropSelection: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  cropModalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cropConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
});

export default BusinessProfilePage;

