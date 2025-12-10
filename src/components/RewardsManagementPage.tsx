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

interface Reward {
  id: string;
  name: string;
  type: 'product' | 'action';
  requirement: number;
  rewardType: 'free_product' | 'discount' | 'other';
  active: boolean;
}

interface RewardsManagementPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const RewardsManagementPage: React.FC<RewardsManagementPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [rewards, setRewards] = useState<Reward[]>([
    {
      id: '1',
      name: 'Buy 10 Get 1 Free',
      type: 'product',
      requirement: 10,
      rewardType: 'free_product',
      active: true,
    },
    {
      id: '2',
      name: 'Write Review Reward',
      type: 'action',
      requirement: 1,
      rewardType: 'discount',
      active: true,
    },
  ]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Reward',
      'Are you sure you want to delete this reward?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setRewards(rewards.filter(r => r.id !== id));
          },
        },
      ],
    );
  };

  return (
    <PageTemplate
      title="Rewards Management"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onNavigate('CreateReward')}>
          <Text style={styles.addButtonText}>+ Create New Reward</Text>
        </TouchableOpacity>

        <ScrollView style={styles.list}>
          {rewards.map((reward) => (
            <View key={reward.id} style={styles.rewardCard}>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardDetail}>
                  Type: {reward.type === 'product' ? 'Product Purchase' : 'Action'}
                </Text>
                <Text style={styles.rewardDetail}>
                  Requirement: {reward.requirement}{' '}
                  {reward.type === 'product' ? 'purchases' : 'action(s)'}
                </Text>
                <Text style={styles.rewardDetail}>
                  Reward: {reward.rewardType.replace('_', ' ')}
                </Text>
                <Text
                  style={[
                    styles.status,
                    reward.active ? styles.statusActive : styles.statusInactive,
                  ]}>
                  {reward.active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => onNavigate(`EditReward${reward.id}`)}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(reward.id)}>
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
  rewardCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  rewardInfo: {
    marginBottom: 12,
  },
  rewardName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  rewardDetail: {
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
  statusInactive: {
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

export default RewardsManagementPage;



