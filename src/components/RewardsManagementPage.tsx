import React, {useState, useEffect} from 'react';
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
import {rewardsRepository} from '../services/localRepository';
import type {Reward} from '../types';

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
  const [rewards, setRewards] = useState<Reward[]>([]);

  // Load rewards from repository on mount and when screen is focused
  useEffect(() => {
    const loadRewards = async () => {
      try {
        const loadedRewards = await rewardsRepository.getAll();
        setRewards(loadedRewards);
      } catch (error) {
        console.error('Error loading rewards:', error);
      }
    };
    loadRewards();
  }, []);

  // Reload rewards when screen becomes focused (e.g., after returning from edit page)
  useEffect(() => {
    if (currentScreen === 'RewardsManagement') {
      const loadRewards = async () => {
        try {
          const loadedRewards = await rewardsRepository.getAll();
          setRewards(loadedRewards);
        } catch (error) {
          console.error('Error loading rewards:', error);
        }
      };
      loadRewards();
    }
  }, [currentScreen]);

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Reward',
      'Are you sure you want to delete this reward?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await rewardsRepository.delete(id);
              // Reload rewards from repository to update UI
              const loadedRewards = await rewardsRepository.getAll();
              setRewards(loadedRewards);
              Alert.alert('Success', 'Reward deleted successfully');
            } catch (error) {
              console.error('Error deleting reward:', error);
              Alert.alert('Error', 'Failed to delete reward. Please try again.');
            }
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
          {rewards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No rewards yet</Text>
              <Text style={styles.emptyStateSubtext}>Create your first reward to get started</Text>
            </View>
          ) : (
            rewards.map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardName}>{reward.name}</Text>
                  <Text style={styles.rewardDetail}>
                    Requirement: {reward.stampsRequired || reward.costStamps || 0} stamps
                  </Text>
                  <Text style={styles.rewardDetail}>
                    Type: {reward.type}
                  </Text>
                  <Text
                    style={[
                      styles.status,
                      reward.isActive ? styles.statusActive : styles.statusInactive,
                    ]}>
                    {reward.isActive ? 'Active' : 'Inactive'}
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
            ))
          )}
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
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default RewardsManagementPage;





