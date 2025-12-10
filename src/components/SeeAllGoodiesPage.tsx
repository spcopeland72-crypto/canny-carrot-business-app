import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
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
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

const goodiesData = [
  {id: 1, title: 'The Stables', icon: '🏠'},
  {id: 2, title: 'Toby Carvery Wolviston', icon: '🍖'},
  {id: 3, title: 'Wynyard Hall', icon: '🏰'},
  {id: 4, title: 'The Coffee Pot', icon: '☕'},
  {id: 5, title: 'The Glass House Restaurant', icon: '🍽️'},
  {id: 6, title: 'OK Diners Ltd', icon: '🍔'},
  {id: 7, title: 'Secret Garden Cafe', icon: '🌿'},
  {id: 8, title: 'Cafe In The Park', icon: '🌳'},
  {id: 9, title: 'UNDERGO', icon: '💇'},
  {id: 10, title: 'Kimbles', icon: '🐕'},
  {id: 11, title: 'The Copper Kettle', icon: '🫖'},
  {id: 12, title: "Kay's Cafe", icon: '🥐'},
  {id: 13, title: 'The Owl', icon: '🦉'},
  {id: 14, title: 'Fika & Co.', icon: '🍵'},
  {id: 15, title: 'Café Bela', icon: '🥪'},
  {id: 16, title: 'Café Maison', icon: '🏡'},
  {id: 17, title: 'The Scruffy Duck', icon: '🦆'},
  {id: 18, title: 'Norton Cafe Restaurant', icon: '🍳'},
  {id: 19, title: 'The Tulip Lounge', icon: '🌷'},
  {id: 20, title: 'Aubergine Cafe', icon: '🍆'},
];

const SeeAllGoodiesPage: React.FC<SeeAllGoodiesPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Heading Banner */}
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
              onPress={() => {}}>
              <View style={styles.goodieImagePlaceholder}>
                <Text style={styles.goodieIcon}>{goodie.icon}</Text>
              </View>
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
    minHeight: 86,
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
  goodieImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  goodieIcon: {
    fontSize: 64,
  },
  goodieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    padding: 12,
  },
});

export default SeeAllGoodiesPage;
