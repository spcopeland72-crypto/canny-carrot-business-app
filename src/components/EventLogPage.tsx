import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Colors} from '../constants/Colors';
import PageTemplate from './PageTemplate';
import {getEventLog} from '../services/eventLogService';

interface EventLogPageProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const EventLogPage: React.FC<EventLogPageProps> = ({
  currentScreen,
  onNavigate,
  onBack,
}) => {
  const [log, setLog] = useState<{ timestamp: string; action: string; data: Record<string, unknown> }[]>([]);

  useEffect(() => {
    if (currentScreen !== 'EventLog') return;
    let mounted = true;
    getEventLog().then((entries) => {
      if (mounted) setLog(entries);
    });
    return () => { mounted = false; };
  }, [currentScreen]);

  return (
    <PageTemplate
      title="Event Log"
      currentScreen={currentScreen}
      onNavigate={onNavigate}
      onBack={onBack ?? (() => onNavigate('More'))}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.menuList}>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemSubtitle}>Per device (this browser). Login/logout and counts are recorded here.</Text>
          </View>
          {log.length === 0 ? (
            <View style={styles.menuItem}>
              <Text style={styles.menuItemTitle}>No events yet.</Text>
            </View>
          ) : (
            log.map((entry, index) => (
              <View key={index} style={styles.menuItem}>
                <Text style={styles.menuItemTitle}>{JSON.stringify(entry)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </PageTemplate>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  menuList: {
    backgroundColor: Colors.background,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    minHeight: 72,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary || Colors.text.primary,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  menuItemTitle: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '400',
    flex: 1,
  },
});

export default EventLogPage;
