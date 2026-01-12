import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
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
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);

  // Load rewards from repository on mount and when screen is focused
  useEffect(() => {
    const loadRewards = async () => {
      try {
        // Only load active rewards (excludes trashed/inactive)
        const loadedRewards = await rewardsRepository.getActive();
        setRewards(loadedRewards);
        console.log(`[RewardsManagement] Loaded ${loadedRewards.length} active rewards`);
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
          // Only load active rewards (excludes trashed/inactive)
          const loadedRewards = await rewardsRepository.getActive();
          setRewards(loadedRewards);
          console.log(`[RewardsManagement] Reloaded ${loadedRewards.length} active rewards`);
        } catch (error) {
          console.error('Error loading rewards:', error);
        }
      };
      loadRewards();
    }
  }, [currentScreen]);

  const handleDelete = (reward: Reward) => {
    console.log(`[RewardsManagement] Delete button clicked for reward: ${reward.id} - ${reward.name}`);
    setRewardToDelete(reward);
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteReward = async () => {
    if (!rewardToDelete) return;
    
    try {
      console.log(`[RewardsManagement] Confirming deletion of reward: ${rewardToDelete.id}`);
      await rewardsRepository.delete(rewardToDelete.id);
      
      // Reload active rewards from repository to update UI
      const loadedRewards = await rewardsRepository.getActive();
      setRewards(loadedRewards);
      console.log(`[RewardsManagement] Reward deleted, ${loadedRewards.length} active rewards remaining`);
      
      setDeleteConfirmVisible(false);
      setRewardToDelete(null);
    } catch (error) {
      console.error('[RewardsManagement] Error deleting reward:', error);
      Alert.alert('Error', 'Failed to delete reward. Please try again.');
      setDeleteConfirmVisible(false);
      setRewardToDelete(null);
    }
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

        <View style={styles.list}>
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
                    activeOpacity={0.7}
                    onPress={() => {
                      console.log('[RewardsManagement] Delete button TOUCHED');
                      console.log(`[RewardsManagement] Delete button pressed for: ${reward.name} (ID: ${reward.id})`);
                      handleDelete(reward);
                    }}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Delete Confirmation Modal - same as CreateEditRewardPage */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Reward?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{rewardToDelete?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  setRewardToDelete(null);
                }}>
                <Text style={styles.deleteModalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonDelete]}
                onPress={confirmDeleteReward}>
                <Text style={styles.deleteModalButtonTextDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteModalButtonCancel: {
    backgroundColor: Colors.neutral[200],
  },
  deleteModalButtonDelete: {
    backgroundColor: '#FF3B30',
  },
  deleteModalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  deleteModalButtonTextDelete: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});

export default RewardsManagementPage;





