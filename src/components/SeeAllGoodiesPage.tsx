import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {Colors} from '../constants/Colors';
import BottomNavigation from './BottomNavigation';

interface SeeAllGoodiesPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width || 375;
const CARD_WIDTH = SCREEN_WIDTH * 0.7; // Same as More Goodies section cards

// Load random placeholder images from Images folder
const placeholderImages = [
  require('../../Images/google-maps.png'),
  require('../../Images/featured campaigns.png'),
  require('../../Images/shop-online.png'),
  require('../../Images/calvin.png'),
  require('../../Images/review.png'),
  require('../../Images/earn.png'),
  require('../../Images/competition.png'),
  require('../../Images/cosmetics.png'),
  require('../../Images/daisy-chain.png'),
  require('../../Images/online.png'),
];

const goodiesData = [
  {id: 1, title: 'The Stables', image: placeholderImages[0]},
  {id: 2, title: 'Toby Carvery Wolviston', image: placeholderImages[1]},
  {id: 3, title: 'Wynyard Hall', image: placeholderImages[2]},
  {id: 4, title: 'The Coffee Pot', image: placeholderImages[3]},
  {id: 5, title: 'The Glass House Restaurant', image: placeholderImages[4]},
  {id: 6, title: 'OK Diners Ltd', image: placeholderImages[5]},
  {id: 7, title: 'Secret garden cafe', image: placeholderImages[6]},
  {id: 8, title: 'Cafe In The Park', image: placeholderImages[7]},
  {id: 9, title: 'UNDERGO', image: placeholderImages[8]},
  {id: 10, title: 'Kimbles', image: placeholderImages[9]},
  {id: 11, title: 'The Copper Kettle', image: placeholderImages[0]},
  {id: 12, title: 'Kay\'s Cafe', image: placeholderImages[1]},
  {id: 13, title: 'The Owl', image: placeholderImages[2]},
  {id: 14, title: 'Fika & Co.', image: placeholderImages[3]},
  {id: 15, title: 'Café Bela', image: placeholderImages[4]},
  {id: 16, title: 'Café Maison', image: placeholderImages[5]},
  {id: 17, title: 'The Scruffy Duck', image: placeholderImages[6]},
  {id: 18, title: 'Norton Cafe Restaurant', image: placeholderImages[7]},
  {id: 19, title: 'The Tulip Lounge', image: placeholderImages[8]},
  {id: 20, title: 'Aubergine Cafe', image: placeholderImages[9]},
];

const SeeAllGoodiesPage: React.FC<SeeAllGoodiesPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Heading Banner - Half height of home banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>All Goodies</Text>
      </View>
      
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Vertical Stack of Cards */}
        <View style={styles.cardsContainer}>
          {goodiesData.map((goodie) => (
            <TouchableOpacity
              key={goodie.id}
              style={styles.goodieCard}
              onPress={() => {
                // Navigate to specific goodie detail if needed
              }}>
              <Image
                source={goodie.image}
                style={styles.goodieImage}
                resizeMode="cover"
                onError={() => {
                  console.log(`Failed to load image for ${goodie.title}`);
                }}
              />
              <Text style={styles.goodieTitle}>{goodie.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        onScanPress={() => {}}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  banner: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 86, // Half the height of home banner (171 / 2 ≈ 86)
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.background,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'center',
  },
  goodieCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  goodieImage: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.neutral[50],
  },
  goodieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    padding: 12,
  },
});

export default SeeAllGoodiesPage;
