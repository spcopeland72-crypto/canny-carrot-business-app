import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
import QRCodeModal from './QRCodeModal';

interface Reward {
  id: string;
  name: string;
  type: 'product' | 'action';
  requirement: number;
  active?: boolean;
  count?: number;
  total?: number;
  icon?: string;
  rewardType?: 'free_product' | 'discount' | 'other';
  selectedProducts?: string[];
  selectedActions?: string[];
}

interface RewardsPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  rewards?: Reward[];
  onDeleteReward?: (rewardId: string) => void;
}

const RewardsPage: React.FC<RewardsPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  rewards: propsRewards = [],
  onDeleteReward,
}) => {
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const handleDeleteReward = (reward: Reward) => {
    Alert.alert(
      'Delete Reward',
      `Are you sure you want to delete "${reward.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDeleteReward) {
              onDeleteReward(reward.id);
            }
          },
        },
      ]
    );
  };
  
  const rewards = propsRewards.length > 0 ? propsRewards : [
    {
      id: '1',
      name: 'Buy 10 Get 1 Free',
      type: 'product' as const,
      requirement: 10,
      active: true,
    },
    {
      id: '2',
      name: 'Write Review Reward',
      type: 'action' as const,
      requirement: 1,
      active: true,
    },
  ];

  const handleShowQRCode = (reward: Reward) => {
    setSelectedReward(reward);
    setQrCodeModalVisible(true);
  };

  return (
    <PageTemplate
      title="Rewards"
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
              <View style={styles.rewardCardHeader}>
                <TouchableOpacity
                  onPress={() => onNavigate(`EditReward${reward.id}`)}
                  style={styles.rewardCardContent}>
                  <Text style={styles.rewardName}>{reward.name}</Text>
                  <Text style={styles.rewardDetail}>
                    Type: {reward.type === 'product' ? 'Product Purchase' : 'Action'}
                  </Text>
                  <Text style={styles.rewardDetail}>
                    Requirement: {reward.requirement}
                  </Text>
                  <Text
                    style={[
                      styles.status,
                      reward.active !== false ? styles.statusActive : styles.statusInactive,
                    ]}>
                    {reward.active !== false ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteReward(reward)}>
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => handleShowQRCode(reward)}>
                  <Text style={styles.qrButtonText}>📱 QR Code</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
        
        {/* QR Code Modal */}
        {selectedReward && (
          <QRCodeModal
            visible={qrCodeModalVisible}
            title={selectedReward.name}
            qrValue={selectedReward.qrCode || `REWARD:${selectedReward.id}:${selectedReward.name}:${selectedReward.requirement}:${selectedReward.rewardType || 'free_product'}:`}
            onClose={() => {
              setQrCodeModalVisible(false);
              setSelectedReward(null);
            }}
          />
        )}
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    overflow: 'hidden',
  },
  rewardCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rewardCardContent: {
    flex: 1,
    padding: 16,
  },
  deleteButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  qrButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
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
});

export default RewardsPage;



