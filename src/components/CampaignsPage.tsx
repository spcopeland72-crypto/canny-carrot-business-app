import React, {useState} from 'react';
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
import { campaignsRepository } from '../services/localRepository';
import { appendDeleteEvent, updateSyncManifestTally } from '../services/eventLogService';

interface Campaign {
  id: string;
  name: string;
  count?: number; // Current participants
  total?: number; // Target participants
  icon?: string;
  status: 'active' | 'upcoming' | 'completed' | 'Active' | 'Upcoming' | 'Ended';
  startDate?: string;
  endDate?: string;
  participants?: number; // Alias for count
}

interface CampaignsPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
  campaigns?: Campaign[];
  onDeleteCampaign?: (id: string) => void;
}

const CampaignsPage: React.FC<CampaignsPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  campaigns: propsCampaigns = [],
  onDeleteCampaign: _onDeleteCampaign,
}) => {
  const campaigns = propsCampaigns.length > 0 ? propsCampaigns : [];
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<{ id: string; name: string } | null>(null);

  // Identical to CreateEditRewardPage dustbin: show modal, then confirmDeleteCampaign
  const handleDeleteReward = (campaign: Campaign) => {
    setCampaignToDelete({ id: campaign.id, name: campaign.name });
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteReward = async () => {
    if (!campaignToDelete) return;
    try {
      await campaignsRepository.delete(campaignToDelete.id);
      await appendDeleteEvent('campaign', campaignToDelete.id, campaignToDelete.name).catch(() => {});
      await updateSyncManifestTally({ campaignDelete: 1 }).catch(() => {});
      console.log(`✅ [CampaignsPage] Campaign ${campaignToDelete.id} deleted from local storage`);
      setDeleteConfirmVisible(false);
      setCampaignToDelete(null);
      onNavigate('Home');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      Alert.alert('Error', 'Failed to delete campaign. Please try again.');
      setDeleteConfirmVisible(false);
      setCampaignToDelete(null);
    }
  };

  return (
    <PageTemplate
      title="Campaigns"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack}
      onLogout={onLogout}>
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
                {campaign.startDate && (
                  <Text style={styles.campaignDetail}>
                    Start: {campaign.startDate}
                  </Text>
                )}
                {campaign.endDate && (
                  <Text style={styles.campaignDetail}>End: {campaign.endDate}</Text>
                )}
                <Text style={styles.campaignDetail}>
                  Participants: {campaign.participants ?? campaign.count ?? 0} / {campaign.total ?? 0}
                </Text>
                <Text
                  style={[
                    styles.status,
                    (campaign.status === 'Active' || campaign.status === 'active') && styles.statusActive,
                    (campaign.status === 'Upcoming' || campaign.status === 'upcoming') && styles.statusUpcoming,
                    (campaign.status === 'Ended' || campaign.status === 'completed') && styles.statusEnded,
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

      {/* Delete Confirmation Modal — identical to CreateEditRewardPage dustbin */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setDeleteConfirmVisible(false); setCampaignToDelete(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Campaign?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => { setDeleteConfirmVisible(false); setCampaignToDelete(null); }}>
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
    fontSize: 18,
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

export default CampaignsPage;

