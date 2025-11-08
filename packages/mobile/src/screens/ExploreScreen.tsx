import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {RootStackNavigationProp} from '@types/navigation';
import {useContentStore, Content} from '@store/contentStore';
import {ContentCard} from '@components/ContentCard';
import {apiService} from '@services/api';
import {COLORS, SPACING, FONT_SIZES} from '@utils/constants';

type ContentType = 'all' | 'video' | 'audio' | 'pdf' | 'course';
type SortOption = 'trending' | 'newest' | 'price_low' | 'price_high' | 'rating';

export const ExploreScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp<'MainTabs'>>();
  const {setLoading, isLoading} = useContentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Content[]>([]);
  const [selectedType, setSelectedType] = useState<ContentType>('all');
  const [selectedSort, setSelectedSort] = useState<SortOption>('trending');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [selectedType, selectedSort]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length > 0) {
        handleSearch();
      } else {
        fetchContent();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const params: any = {
        sort: selectedSort,
        limit: 50,
      };

      if (selectedType !== 'all') {
        params.contentType = selectedType;
      }

      const response = await apiService.get<{data: Content[]}>('/contents', {
        params,
      });
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<{data: Content[]}>('/contents/search', {
        params: {
          q: searchQuery,
          contentType: selectedType !== 'all' ? selectedType : undefined,
          sort: selectedSort,
        },
      });
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentPress = (contentId: string) => {
    navigation.navigate('ContentDetails', {contentId});
  };

  const contentTypes: {value: ContentType; label: string; icon: string}[] = [
    {value: 'all', label: 'All', icon: '📦'},
    {value: 'video', label: 'Video', icon: '🎥'},
    {value: 'audio', label: 'Audio', icon: '🎵'},
    {value: 'pdf', label: 'PDF', icon: '📄'},
    {value: 'course', label: 'Course', icon: '📚'},
  ];

  const sortOptions: {value: SortOption; label: string}[] = [
    {value: 'trending', label: 'Trending'},
    {value: 'newest', label: 'Newest'},
    {value: 'price_low', label: 'Price: Low to High'},
    {value: 'price_high', label: 'Price: High to Low'},
    {value: 'rating', label: 'Highest Rated'},
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search content..."
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={contentTypes}
            keyExtractor={(item) => item.value}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedType === item.value && styles.filterChipActive,
                ]}
                onPress={() => setSelectedType(item.value)}>
                <Text style={styles.filterIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.filterText,
                    selectedType === item.value && styles.filterTextActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>

        <View style={styles.sortRow}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowFilters(!showFilters)}>
            <Text style={styles.sortButtonText}>
              Sort: {sortOptions.find((o) => o.value === selectedSort)?.label}
            </Text>
            <Text style={styles.sortIcon}>{showFilters ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.sortOptions}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  selectedSort === option.value && styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSelectedSort(option.value);
                  setShowFilters(false);
                }}>
                <Text
                  style={[
                    styles.sortOptionText,
                    selectedSort === option.value && styles.sortOptionTextActive,
                  ]}>
                  {option.label}
                </Text>
                {selectedSort === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => (
            <View style={styles.cardContainer}>
              <ContentCard
                content={item}
                onPress={() => handleContentPress(item.id)}
              />
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No content found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  clearIcon: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  filterRow: {
    marginBottom: SPACING.sm,
  },
  filterList: {
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.background,
  },
  sortRow: {
    marginBottom: SPACING.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  sortIcon: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sortOptions: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sortOptionActive: {
    backgroundColor: '#f3f4f6',
  },
  sortOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  sortOptionTextActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  checkmark: {
    fontSize: 16,
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    marginBottom: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});
