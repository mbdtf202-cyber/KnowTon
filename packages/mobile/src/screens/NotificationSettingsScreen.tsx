/**
 * Notification Settings Screen
 * Allows users to manage notification preferences
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import useNotificationStore from '../store/notificationStore';

const NotificationSettingsScreen: React.FC = () => {
  const {
    preferences,
    isLoading,
    error,
    getPreferences,
    updatePreferences,
  } = useNotificationStore();

  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  const loadPreferences = async () => {
    try {
      await getPreferences();
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleToggle = (key: keyof typeof localPrefs) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updatePreferences(localPrefs);
      Alert.alert('Success', 'Notification preferences updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all notification preferences to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setLocalPrefs({
              enabled: true,
              purchaseUpdates: true,
              contentReleases: true,
              creatorUpdates: true,
              promotions: true,
              systemAlerts: true,
            });
          },
        },
      ]
    );
  };

  if (isLoading && !localPrefs) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Notification Settings</Text>
          <Text style={styles.subtitle}>
            Manage your notification preferences
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Turn all notifications on or off
              </Text>
            </View>
            <Switch
              value={localPrefs.enabled}
              onValueChange={() => handleToggle('enabled')}
              trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
              thumbColor={localPrefs.enabled ? '#007AFF' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Notification Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Purchase Updates</Text>
              <Text style={styles.settingDescription}>
                Notifications about your purchases and downloads
              </Text>
            </View>
            <Switch
              value={localPrefs.purchaseUpdates}
              onValueChange={() => handleToggle('purchaseUpdates')}
              disabled={!localPrefs.enabled}
              trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
              thumbColor={localPrefs.purchaseUpdates ? '#007AFF' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Content Releases</Text>
              <Text style={styles.settingDescription}>
                New content from creators you follow
              </Text>
            </View>
            <Switch
              value={localPrefs.contentReleases}
              onValueChange={() => handleToggle('contentReleases')}
              disabled={!localPrefs.enabled}
              trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
              thumbColor={localPrefs.contentReleases ? '#007AFF' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Creator Updates</Text>
              <Text style={styles.settingDescription}>
                Updates from creators you follow
              </Text>
            </View>
            <Switch
              value={localPrefs.creatorUpdates}
              onValueChange={() => handleToggle('creatorUpdates')}
              disabled={!localPrefs.enabled}
              trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
              thumbColor={localPrefs.creatorUpdates ? '#007AFF' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Promotions</Text>
              <Text style={styles.settingDescription}>
                Special offers and discounts
              </Text>
            </View>
            <Switch
              value={localPrefs.promotions}
              onValueChange={() => handleToggle('promotions')}
              disabled={!localPrefs.enabled}
              trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
              thumbColor={localPrefs.promotions ? '#007AFF' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>System Alerts</Text>
              <Text style={styles.settingDescription}>
                Important system notifications and updates
              </Text>
            </View>
            <Switch
              value={localPrefs.systemAlerts}
              onValueChange={() => handleToggle('systemAlerts')}
              disabled={!localPrefs.enabled}
              trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
              thumbColor={localPrefs.systemAlerts ? '#007AFF' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={handleReset}
            disabled={isSaving}
          >
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 You can change these settings at any time. System alerts cannot
            be disabled as they contain important security and account
            information.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    marginTop: 8,
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});

export default NotificationSettingsScreen;
