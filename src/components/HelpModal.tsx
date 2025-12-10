import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ImageBackground,
} from 'react-native';
import {Colors} from '../constants/Colors';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

const MODAL_MARGIN = 20;

// Use no background image to avoid dynamic require issues
const backgroundImage = null;

const pages = [
  {id: 1, title: 'How it Works'},
  {id: 2, title: 'Getting your Rewards'},
  {id: 3, title: 'Finding More Rewards'},
  {id: 4, title: 'Join our Community'},
  {id: 5, title: 'Refer and Earn'},
];

const HelpModal: React.FC<HelpModalProps> = ({visible, onClose}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const getScreenDimensions = () => {
    try {
      const {width, height} = Dimensions.get('window');
      return {width: width || 375, height: height || 667};
    } catch {
      return {width: 375, height: 667};
    }
  };

  const screenDimensions = getScreenDimensions();
  const SCREEN_WIDTH = screenDimensions.width;
  const SCREEN_HEIGHT = screenDimensions.height;

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / (SCREEN_WIDTH - MODAL_MARGIN * 2));
    if (page !== currentPage && page >= 0 && page < pages.length) {
      setCurrentPage(page);
    }
  };

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / (SCREEN_WIDTH - MODAL_MARGIN * 2));
    setCurrentPage(page);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {
          width: SCREEN_WIDTH - MODAL_MARGIN * 2,
          height: SCREEN_HEIGHT - MODAL_MARGIN * 2,
        }]}>
          {/* Background Image at 5% opacity */}
          {backgroundImage && (
            <ImageBackground
              source={backgroundImage}
              style={styles.backgroundImage}
              resizeMode="cover"
              imageStyle={{opacity: 0.05}}
            />
          )}
          
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {/* Scrollable Pages */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, {width: (SCREEN_WIDTH - MODAL_MARGIN * 2) * pages.length}]}>
            {pages.map((page, index) => (
              <View key={page.id} style={[styles.page, {width: SCREEN_WIDTH - MODAL_MARGIN * 2}]}>
                <Text style={styles.pageTitle}>{page.title}</Text>
                <View style={styles.pageContent}>
                  <Text style={styles.pageText}>
                    Content for {page.title} will appear here.
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Page Indicators */}
          <View style={styles.indicators}>
            {pages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentPage && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.background,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  page: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  pageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pageText: {
    fontSize: 16,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: Colors.background,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000000',
  },
});

export default HelpModal;



