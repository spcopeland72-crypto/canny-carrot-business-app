import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Colors} from '../constants/Colors';
import {businessApi, rewardApi} from '../services/api';

interface OnboardingFlowProps {
  onComplete: (businessId: string) => void;
  onSkip?: () => void;
}

type Step = 'welcome' | 'business-info' | 'address' | 'first-reward' | 'complete';

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({onComplete, onSkip}) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string>('');
  
  // Business Info
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('cafe');
  const [description, setDescription] = useState('');
  
  // Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Middlesbrough');
  const [postcode, setPostcode] = useState('');
  
  // First Reward
  const [rewardName, setRewardName] = useState('Buy 10 Get 1 Free');
  const [rewardDescription, setRewardDescription] = useState('Collect 10 stamps and get your next item free!');
  const [stampsRequired, setStampsRequired] = useState('10');
  
  const categories = [
    {id: 'cafe', label: '☕ Cafe', icon: '☕'},
    {id: 'restaurant', label: '🍽️ Restaurant', icon: '🍽️'},
    {id: 'beauty-salon', label: '💅 Beauty Salon', icon: '💅'},
    {id: 'barber', label: '💈 Barber', icon: '💈'},
    {id: 'retail', label: '🛍️ Retail', icon: '🛍️'},
    {id: 'pub', label: '🍺 Pub', icon: '🍺'},
    {id: 'takeaway', label: '🥡 Takeaway', icon: '🥡'},
    {id: 'gym', label: '💪 Gym', icon: '💪'},
    {id: 'other', label: '📦 Other', icon: '📦'},
  ];
  
  const cities = [
    'Middlesbrough',
    'Stockton-on-Tees',
    'Darlington',
    'Hartlepool',
    'Redcar',
    'Thornaby',
    'Billingham',
    'Yarm',
    'Norton',
    'Eaglescliffe',
  ];
  
  const handleRegisterBusiness = async () => {
    if (!businessName || !email || !addressLine1 || !city || !postcode) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await businessApi.register({
        name: businessName,
        email,
        phone,
        address: {
          line1: addressLine1,
          line2: addressLine2,
          city,
          postcode,
        },
        category,
        description,
      });
      
      if (result.success && result.data) {
        setBusinessId(result.data.id);
        setCurrentStep('first-reward');
      } else {
        Alert.alert('Error', result.error || 'Failed to register business');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateReward = async () => {
    if (!rewardName || !stampsRequired) {
      Alert.alert('Missing Information', 'Please fill in the reward details');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await rewardApi.create({
        businessId,
        name: rewardName,
        description: rewardDescription,
        stampsRequired: parseInt(stampsRequired),
        type: 'freebie',
      });
      
      if (result.success) {
        setCurrentStep('complete');
      } else {
        Alert.alert('Error', result.error || 'Failed to create reward');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.welcomeEmoji}>🥕</Text>
      <Text style={styles.title}>Welcome to Canny Carrot!</Text>
      <Text style={styles.subtitle}>
        The loyalty platform powering Tees Valley's local businesses
      </Text>
      
      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>📱</Text>
          <View style={styles.benefitText}>
            <Text style={styles.benefitTitle}>Digital Stamp Cards</Text>
            <Text style={styles.benefitDesc}>Replace paper cards with QR-powered stamps</Text>
          </View>
        </View>
        
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>👥</Text>
          <View style={styles.benefitText}>
            <Text style={styles.benefitTitle}>Customer Insights</Text>
            <Text style={styles.benefitDesc}>Know your customers and what they love</Text>
          </View>
        </View>
        
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>📊</Text>
          <View style={styles.benefitText}>
            <Text style={styles.benefitTitle}>Analytics Dashboard</Text>
            <Text style={styles.benefitDesc}>Track engagement and measure ROI</Text>
          </View>
        </View>
        
        <View style={styles.benefitItem}>
          <Text style={styles.benefitIcon}>🏆</Text>
          <View style={styles.benefitText}>
            <Text style={styles.benefitTitle}>Campaigns & Promotions</Text>
            <Text style={styles.benefitDesc}>Run targeted campaigns that work</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setCurrentStep('business-info')}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>
      
      <Text style={styles.bidNote}>
        Supported by Middlesbrough, Stockton & Darlington BIDs
      </Text>
    </View>
  );
  
  const renderBusinessInfo = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Tell us about your business</Text>
      <Text style={styles.stepSubtitle}>Step 1 of 3</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Business Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Cafe Maison"
          value={businessName}
          onChangeText={setBusinessName}
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="hello@yourbusiness.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="01onal 123456"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                category === cat.id && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory(cat.id)}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[
                styles.categoryLabel,
                category === cat.id && styles.categoryLabelActive,
              ]}>
                {cat.label.split(' ')[1]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell customers what makes you special..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setCurrentStep('address')}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setCurrentStep('welcome')}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderAddress = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Where are you located?</Text>
      <Text style={styles.stepSubtitle}>Step 2 of 3</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address Line 1 *</Text>
        <TextInput
          style={styles.input}
          placeholder="123 High Street"
          value={addressLine1}
          onChangeText={setAddressLine1}
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address Line 2</Text>
        <TextInput
          style={styles.input}
          placeholder="Unit 2, Shopping Centre"
          value={addressLine2}
          onChangeText={setAddressLine2}
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>City/Town *</Text>
        <View style={styles.cityPicker}>
          {cities.slice(0, 5).map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.cityButton,
                city === c && styles.cityButtonActive,
              ]}
              onPress={() => setCity(c)}>
              <Text style={[
                styles.cityButtonText,
                city === c && styles.cityButtonTextActive,
              ]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Postcode *</Text>
        <TextInput
          style={styles.input}
          placeholder="TS1 1AA"
          value={postcode}
          onChangeText={setPostcode}
          autoCapitalize="characters"
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleRegisterBusiness}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.primaryButtonText}>Register Business</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setCurrentStep('business-info')}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderFirstReward = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.successEmoji}>✅</Text>
      <Text style={styles.stepTitle}>Business Registered!</Text>
      <Text style={styles.stepSubtitle}>Now let's create your first reward</Text>
      
      <View style={styles.rewardPreview}>
        <View style={styles.rewardCard}>
          <Text style={styles.rewardPreviewIcon}>🎁</Text>
          <Text style={styles.rewardPreviewName}>{rewardName || 'Your Reward'}</Text>
          <Text style={styles.rewardPreviewStamps}>{stampsRequired} stamps</Text>
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reward Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Buy 10 Get 1 Free"
          value={rewardName}
          onChangeText={setRewardName}
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what customers will receive..."
          value={rewardDescription}
          onChangeText={setRewardDescription}
          multiline
          numberOfLines={2}
          placeholderTextColor={Colors.text.light}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Stamps Required</Text>
        <View style={styles.stampPicker}>
          {['5', '8', '10', '12', '15'].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.stampButton,
                stampsRequired === num && styles.stampButtonActive,
              ]}
              onPress={() => setStampsRequired(num)}>
              <Text style={[
                styles.stampButtonText,
                stampsRequired === num && styles.stampButtonTextActive,
              ]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleCreateReward}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.primaryButtonText}>Create Reward</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => setCurrentStep('complete')}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.celebrationEmoji}>🎉</Text>
      <Text style={styles.title}>You're All Set!</Text>
      <Text style={styles.subtitle}>
        Your business is now live on Canny Carrot
      </Text>
      
      <View style={styles.nextStepsList}>
        <Text style={styles.nextStepsTitle}>What's Next?</Text>
        
        <View style={styles.nextStepItem}>
          <Text style={styles.nextStepNumber}>1</Text>
          <Text style={styles.nextStepText}>Print your QR code for the counter</Text>
        </View>
        
        <View style={styles.nextStepItem}>
          <Text style={styles.nextStepNumber}>2</Text>
          <Text style={styles.nextStepText}>Tell customers to download Canny Carrot</Text>
        </View>
        
        <View style={styles.nextStepItem}>
          <Text style={styles.nextStepNumber}>3</Text>
          <Text style={styles.nextStepText}>Scan their QR to give stamps</Text>
        </View>
        
        <View style={styles.nextStepItem}>
          <Text style={styles.nextStepNumber}>4</Text>
          <Text style={styles.nextStepText}>Watch your loyal customer base grow!</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => onComplete(businessId)}>
        <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Progress Bar */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            {width: currentStep === 'business-info' ? '33%' : 
                   currentStep === 'address' ? '66%' : '100%'},
          ]} />
        </View>
      )}
      
      {currentStep === 'welcome' && renderWelcome()}
      {currentStep === 'business-info' && renderBusinessInfo()}
      {currentStep === 'address' && renderAddress()}
      {currentStep === 'first-reward' && renderFirstReward()}
      {currentStep === 'complete' && renderComplete()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.neutral[200],
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    padding: 24,
  },
  welcomeEmoji: {
    fontSize: 80,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  successEmoji: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 16,
  },
  celebrationEmoji: {
    fontSize: 80,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  benefitsList: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryButton: {
    width: '31%',
    margin: '1%',
    backgroundColor: Colors.neutral[50],
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  categoryButtonActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '20',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  categoryLabelActive: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  cityPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cityButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 20,
    margin: 4,
  },
  cityButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cityButtonText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  cityButtonTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
  stampPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stampButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neutral[50],
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  stampButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  stampButtonTextActive: {
    color: Colors.background,
  },
  rewardPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  rewardCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: 200,
  },
  rewardPreviewIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  rewardPreviewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.background,
    textAlign: 'center',
    marginBottom: 4,
  },
  rewardPreviewStamps: {
    fontSize: 14,
    color: Colors.background,
    opacity: 0.9,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: Colors.text.secondary,
    fontSize: 16,
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  bidNote: {
    fontSize: 12,
    color: Colors.text.light,
    textAlign: 'center',
    marginTop: 24,
  },
  nextStepsList: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
  },
  nextStepText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
});

export default OnboardingFlow;




















