import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';

interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Upcoming' | 'Ended';
  participants: number;
}

interface CampaignsPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const CampaignsPage: React.FC<CampaignsPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'Christmas Special',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      status: 'Active',
      participants: 120,
    },
    {
      id: '2',
      name: 'New Year Promotion',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      status: 'Upcoming',
      participants: 0,
    },
  ]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Campaign',
      'Are you sure you want to delete this campaign?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCampaigns(campaigns.filter(c => c.id !== id));
          },
        },
      ],
    );
  };

  return (
    <PageTemplate
      title="Campaigns"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onNavigate('CreateCampaign')}>
          <Text style={styles.addButtonText}>+ Create New Campaign</Text>
        </TouchableOpacity>

        <ScrollView style={styles.list}>
          {campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.campaignCard}>
              <View style={styles.campaignInfo}>
                <Text style={styles.campaignName}>{campaign.name}</Text>
                <Text style={styles.campaignDetail}>
                  Start: {campaign.startDate}
                </Text>
                <Text style={styles.campaignDetail}>End: {campaign.endDate}</Text>
                <Text style={styles.campaignDetail}>
                  Participants: {campaign.participants}
                </Text>
                <Text
                  style={[
                    styles.status,
                    campaign.status === 'Active' && styles.statusActive,
                    campaign.status === 'Upcoming' && styles.statusUpcoming,
                    campaign.status === 'Ended' && styles.statusEnded,
                  ]}>
                  {campaign.status}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => onNavigate(`EditCampaign${campaign.id}`)}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(campaign.id)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  list: {
    flex: 1,
  },
  campaignCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  campaignInfo: {
    marginBottom: 12,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  campaignDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  statusActive: {
    color: Colors.accent,
  },
  statusUpcoming: {
    color: Colors.secondary,
  },
  statusEnded: {
    color: Colors.text.light,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.background,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Colors.background,
    fontWeight: '600',
  },
});

export default CampaignsPage;



