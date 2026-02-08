import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../constants/Colors';
import BottomNavigation from './BottomNavigation';
import { businessRepository } from '../services/localRepository';
import type { BusinessProfile } from '../types';

interface ManageProductsPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  onScanPress?: () => void;
}

const DUMMY_PRODUCTS = ['Product 1', 'Product 2', 'Product 3'];

export default function ManageProductsPage({
  currentScreen,
  onNavigate,
  onBack,
  onScanPress,
}: ManageProductsPageProps) {
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [editProductName, setEditProductName] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      const profile = await businessRepository.get();
      if (profile?.products && Array.isArray(profile.products)) {
        const filtered = profile.products.filter(
          (p) => p && !DUMMY_PRODUCTS.includes(p)
        );
        setProducts(filtered);
      } else {
        setProducts([]);
      }
    } catch (e) {
      console.error('[ManageProductsPage] Load error:', e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [currentScreen, loadProducts]);

  const handleDeletePress = (e: any, name: string) => {
    e?.stopPropagation?.();
    setDeleteConfirmId(name);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const profile = await businessRepository.get();
      if (!profile) return;
      const updated = (profile.products || []).filter((p) => p !== deleteConfirmId);
      await businessRepository.save({ ...profile, products: updated });
      setProducts(updated);
      setDeleteConfirmId(null);
    } catch (e) {
      console.error('[ManageProductsPage] Delete error:', e);
      Alert.alert('Error', 'Failed to delete product.');
    }
  };

  const handleCreateProduct = async () => {
    const name = newProductName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }
    if (products.includes(name)) {
      Alert.alert('Error', 'A product with this name already exists');
      return;
    }
    try {
      const profile = await businessRepository.get();
      const current = profile?.products && Array.isArray(profile.products)
        ? profile.products.filter((p) => p && !DUMMY_PRODUCTS.includes(p))
        : [];
      const updated = [...current, name];
      await businessRepository.save({
        ...(profile || {}),
        products: updated,
      } as BusinessProfile);
      setProducts(updated);
      setNewProductName('');
      setCreateModalVisible(false);
    } catch (e) {
      console.error('[ManageProductsPage] Create error:', e);
      Alert.alert('Error', 'Failed to create product.');
    }
  };

  const openEditModal = (name: string) => {
    setEditingProduct(name);
    setEditProductName(name);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const newName = editProductName.trim();
    if (!editingProduct || !newName) return;
    if (newName === editingProduct) {
      setEditModalVisible(false);
      setEditingProduct(null);
      return;
    }
    if (products.some((p) => p !== editingProduct && p === newName)) {
      Alert.alert('Error', 'A product with this name already exists');
      return;
    }
    try {
      const profile = await businessRepository.get();
      if (!profile?.products) {
        setEditModalVisible(false);
        setEditingProduct(null);
        return;
      }
      const updated = profile.products.map((p) => (p === editingProduct ? newName : p));
      await businessRepository.save({ ...profile, products: updated });
      setProducts((prev) => prev.map((p) => (p === editingProduct ? newName : p)));
      setEditModalVisible(false);
      setEditingProduct(null);
    } catch (e) {
      console.error('[ManageProductsPage] Edit error:', e);
      Alert.alert('Error', 'Failed to update product.');
    }
  };

  const renderRow = ({ item }: { item: string }) => (
    <View style={styles.row}>
      <Text style={styles.productName} numberOfLines={1}>
        {item}
      </Text>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openEditModal(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={(e) => handleDeletePress(e, item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const listHeader = (
    <TouchableOpacity
      style={styles.createButton}
      onPress={() => setCreateModalVisible(true)}>
      <Text style={styles.createButtonText}>+ Create new product</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.headerBanner}>
        <TouchableOpacity
          style={styles.headerBackTouch}
          onPress={() => (onBack ? onBack() : onNavigate('More'))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Products</Text>
        <View style={styles.headerRight} />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No products yet.</Text>
              <Text style={styles.emptySubtext}>Tap "Create new product" to add one.</Text>
            </View>
          }
        />
      )}
      {/* Delete confirm modal */}
      <Modal
        visible={deleteConfirmId != null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteConfirmId(null)}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Delete product?</Text>
            <Text style={styles.modalSubtitle}>
              "{deleteConfirmId}" will be removed. This cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteConfirmId(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirmDelete}>
                <Text style={styles.modalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Create product modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCreateModalVisible(false)}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Create new product</Text>
            <TextInput
              style={styles.input}
              value={newProductName}
              onChangeText={setNewProductName}
              placeholder="Product name"
              placeholderTextColor="#9e9e9e"
              autoCapitalize="words"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setCreateModalVisible(false);
                  setNewProductName('');
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreateProduct}>
                <Text style={styles.modalConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Edit product modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Edit product</Text>
            <TextInput
              style={styles.input}
              value={editProductName}
              onChangeText={setEditProductName}
              placeholder="Product name"
              placeholderTextColor="#9e9e9e"
              autoCapitalize="words"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingProduct(null);
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveEdit}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <BottomNavigation
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        onScanPress={onScanPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    position: 'relative',
    ...Platform.select({
      web: {
        position: 'sticky' as const,
        top: 0,
        zIndex: 100,
      },
      default: {},
    }),
  },
  headerBackTouch: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerBackText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.background,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.background,
    textAlign: 'center',
  },
  headerRight: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  createButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  actionIcon: {
    fontSize: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#616161',
  },
  emptyWrap: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#616161',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9e9e9e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalConfirm: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
