import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';

interface SearchPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width || 375;

const SearchPage: React.FC<SearchPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Sample search results
  const searchResults = [
    {id: '1', type: 'customer', name: 'John Smith', email: 'john@example.com'},
    {id: '2', type: 'reward', name: 'Buy 10 Get 1 Free', status: 'Active'},
    {id: '3', type: 'campaign', name: 'Christmas Special', status: 'Active'},
  ];

  return (
    <PageTemplate
      title="Search"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers, rewards, campaigns..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.text.light}
        />

        <ScrollView style={styles.results}>
          {searchResults.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={styles.resultCard}
              onPress={() => {
                if (result.type === 'customer') {
                  onNavigate(`EditCustomer${result.id}`);
                } else if (result.type === 'reward') {
                  onNavigate(`EditReward${result.id}`);
                } else if (result.type === 'campaign') {
                  onNavigate(`EditCampaign${result.id}`);
                }
              }}>
              <Text style={styles.resultType}>{result.type.toUpperCase()}</Text>
              <Text style={styles.resultName}>{result.name}</Text>
              {'email' in result && (
                <Text style={styles.resultDetail}>{result.email}</Text>
              )}
              {'status' in result && (
                <Text style={styles.resultDetail}>Status: {result.status}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  results: {
    flex: 1,
  },
  resultCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  resultType: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  resultDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});

export default SearchPage;



