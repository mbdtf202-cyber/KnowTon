import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {RootStackNavigationProp, RootStackParamList} from '@types/navigation';
import {Content} from '@store/contentStore';
import {useCartStore} from '@store/cartStore';
import {useOfflineStore} from '@store/offlineStore';
import {VideoPlayer} from '@components/VideoPlayer';
import {AudioPlayer} from '@components/AudioPlayer';
import {DownloadButton} from '@components/DownloadButton';
import {apiService} from '@services/api';
import {COLORS, SPACING, FONT_SIZES} from '@utils/constants';

type ContentDetailsRouteProp = RouteProp<RootStackParamList, 'ContentDetails'>;

const {width} = Dimensions.get('window');

export const ContentDetailsScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp<'ContentDetails'>>();
  const route = useRoute<ContentDetailsRouteProp>();
  const {contentId} = route.params;
  const {addItem} = useCartStore();
  const {isOnline} = useOfflineStore();

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchContentDetails();
  }, [contentId]);

  const fetchContentDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{data: Content}>(
        `/contents/${contentId}`
      );
      setContent(response.data);
    } catch (error) {
      console.error('Failed to fetch content details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    if (content) {
      navigation.navigate('Checkout', {contentId: content.id});
    }
  };

  const handleAddToCart = () => {
    if (content) {
      addItem(content);
    }
  };

  const renderPreview = () => {
    if (!content?.previewUrl) return null;

    switch (content.contentType) {
      case 'video':
        return <VideoPlayer uri={content.previewUrl} />;
      case 'audio':
        return (
          <AudioPlayer
            uri={content.previewUrl}
            title={content.title}
            artist={content.creatorName}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!content) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Content not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {content.thumbnailUrl ? (
          <Image
            source={{uri: content.thumbnailUrl}}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Text style={styles.placeholderIcon}>
              {content.contentType === 'video' && '🎥'}
              {content.contentType === 'audio' && '🎵'}
              {content.contentType === 'pdf' && '📄'}
              {content.contentType === 'course' && '📚'}
            </Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {content.contentType.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.title}>{content.title}</Text>

          <TouchableOpacity style={styles.creatorRow}>
            <Text style={styles.creatorLabel}>By </Text>
            <Text style={styles.creatorName}>{content.creatorName}</Text>
          </TouchableOpacity>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⭐</Text>
              <Text style={styles.metaText}>{content.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🛍️</Text>
              <Text style={styles.metaText}>{content.purchaseCount} sales</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📁</Text>
              <Text style={styles.metaText}>{content.category}</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {content.currency} {content.price.toFixed(2)}
              </Text>
              <DownloadButton
                contentId={content.id}
                title={content.title}
                contentType={content.contentType}
                downloadUrl={`${apiService.baseURL}/contents/${content.id}/download`}
                thumbnailUrl={content.thumbnailUrl}
                size="large"
              />
            </View>
            {!isOnline && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>
                  📡 Offline - Download to access
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{content.description}</Text>
          </View>

          {content.previewUrl && (
            <View style={styles.section}>
              <View style={styles.previewHeader}>
                <Text style={styles.sectionTitle}>Preview</Text>
                <TouchableOpacity onPress={() => setShowPreview(!showPreview)}>
                  <Text style={styles.previewToggle}>
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Text>
                </TouchableOpacity>
              </View>
              {showPreview && (
                <View style={styles.previewContainer}>{renderPreview()}</View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}>
          <Text style={styles.addToCartText}>🛒 Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyButton} onPress={handlePurchase}>
          <Text style={styles.buyButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  content: {
    paddingBottom: 100,
  },
  thumbnail: {
    width: width,
    height: width * 0.5625,
  },
  placeholderThumbnail: {
    width: width,
    height: width * 0.5625,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
  },
  infoContainer: {
    padding: SPACING.md,
  },
  typeBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  typeBadgeText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  creatorLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  creatorName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  priceContainer: {
    backgroundColor: '#f3f4f6',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  offlineBadge: {
    marginTop: SPACING.sm,
    backgroundColor: '#FFF3CD',
    padding: SPACING.sm,
    borderRadius: 8,
  },
  offlineBadgeText: {
    fontSize: FONT_SIZES.sm,
    color: '#856404',
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previewToggle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: SPACING.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  addToCartText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  buyButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
