import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';

interface HelpPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const HelpPage: React.FC<HelpPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const helpTopics = [
    {id: '1', title: 'Getting Started', screen: 'HelpGettingStarted'},
    {id: '2', title: 'Managing Customers', screen: 'HelpCustomers'},
    {id: '3', title: 'Creating Rewards', screen: 'HelpRewards'},
    {id: '4', title: 'Running Campaigns', screen: 'HelpCampaigns'},
    {id: '5', title: 'Analytics Guide', screen: 'HelpAnalytics'},
    {id: '6', title: 'Contact Support', screen: 'HelpContact'},
  ];

  return (
    <PageTemplate
      title="Help & Support"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <View style={styles.content}>
        <ScrollView>
          {helpTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.helpCard}
              onPress={() => onNavigate(topic.screen)}>
              <Text style={styles.helpTitle}>{topic.title}</Text>
              <Text style={styles.helpArrow}>→</Text>
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
  helpCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  helpArrow: {
    fontSize: 20,
    color: Colors.primary,
  },
});

export default HelpPage;



