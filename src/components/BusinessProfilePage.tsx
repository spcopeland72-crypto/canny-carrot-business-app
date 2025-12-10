import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
// Note: Image picker and document picker would be implemented with actual expo packages
// import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';

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
  const [logo, setLogo] = useState<any>(null);
  const [file1, setFile1] = useState<any>(null);
  const [file2, setFile2] = useState<any>(null);

  const pickImage = async (setter: (image: any) => void) => {
    // TODO: Implement with expo-image-picker
    Alert.alert('Info', 'Image picker will be implemented with expo-image-picker');
    // const result = await ImagePicker.launchImageLibraryAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //   allowsEditing: true,
    //   aspect: [1, 1],
    //   quality: 1,
    // });
    // if (!result.canceled) {
    //   setter(result.assets[0].uri);
    // }
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

  const handleSave = () => {
    Alert.alert('Success', 'Business details updated successfully');
    onBack?.();
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

          <Text style={styles.label}>Logo</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage(setLogo)}>
            <Text style={styles.uploadButtonText}>
              {logo ? 'Change Logo' : 'Upload Logo'}
            </Text>
          </TouchableOpacity>
          {logo && (
            <Image source={{uri: logo}} style={styles.thumbnail} />
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
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 8,
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
});

export default BusinessProfilePage;

