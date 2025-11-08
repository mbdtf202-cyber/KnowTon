import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {RootStackNavigationProp} from '@types/navigation';
import {useContentStore, Content} from '@store/contentStore';
import {useAuthStore} from '@store/authStore';
import {ContentCard} from '@components/ContentCard';
import {apiService} from '@services/api';
import {COLORS, SPACING, FONT_SIZES} from '@utils/constants';

export const HomeScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp<'MainTabs'>>();
  const {user} = useAuthStore();
  const {contents, setContents, setLoading, isLoading} = useContentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredContent, setFeaturedContent] = useState<Content[]>([]);
  const [trendingContent, setTrendingContent] = useState<Content[]>([]);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      // Fetch featured content
      const featured = await apiService.get<{data: Content[]}>('/contents', {
        params: {featured: true, limit: 10},
      });
      setFeaturedContent(featured.data || []);

      // Fetch trending content
      const trending = await apiService.get<{data: Content[]}>('/contents', {
        params: {sort: 'trending', limit: 10},
      });
      setTrendingContent(trending.data || []);

      // Update store with all content
      setContents([...(featured.data || []), ...(trending.data || [])]);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContent();
    setRefreshing(false);
  };

  const handleContentPress = (contentId: string) => {
    navigation.navigate('ContentDetails', {contentId});
  };

  const renderContentList = (data: Content[], title: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All →</Text>
        </TouchableOpacity>
      </View>

      {data.length > 0 ? (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => (
            <View style={styles.cardWrapper}>
              <ContentCard
                content={item}
                onPress={() => handleContentPress(item.id)}
              />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <Text style={styles.emptyText}>No content available</Text>
      )}
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Welcome{user ? `, ${user.username}` : ''}! 👋
            </Text>
            <Text style={styles.subtitle}>
              Discover premium digital content
            </Text>
          </View>
        </View>

        {renderContentList(featuredContent, 'Featured Content')}
        {renderContentList(trendingContent, 'Trending Now')}

        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <View style={styles.categoriesGrid}>
            {['Video', 'Audio', 'PDF', 'Course'].map((category) => (
              <TouchableOpacity key={category} style={styles.categoryCard}>
                <Text style={styles.categoryIcon}>
                  {category === 'Video' && '🎥'}
                  {category === 'Audio' && '🎵'}
                  {category === 'PDF' && '📄'}
                  {category === 'Course' && '📚'}
                </Text>
                <Text style={styles.categoryText}>{category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  header: {
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
  },
  cardWrapper: {
    marginRight: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  categoriesSection: {
    padding: SPACING.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  categoryText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
});
