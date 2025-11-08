import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {RootStackNavigationProp, RootStackParamList} from '@types/navigation';
import {Content} from '@store/contentStore';
import {useAuthStore} from '@store/authStore';
import {apiService} from '@services/api';
import {COLORS, SPACING, FONT_SIZES} from '@utils/constants';

type CheckoutRouteProp = RouteProp<RootStackParamList, 'Checkout'>;

type PaymentMethod = 'card' | 'crypto' | 'alipay' | 'wechat';

export const CheckoutScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Checkout'>>();
  const route = useRoute<CheckoutRouteProp>();
  const {contentId} = route.params;
  const {user} = useAuthStore();

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('card');

  const paymentMethods = [
    {id: 'card' as PaymentMethod, name: 'Credit/Debit Card', icon: '💳'},
    {id: 'crypto' as PaymentMethod, name: 'Cryptocurrency', icon: '₿'},
    {id: 'alipay' as PaymentMethod, name: 'Alipay', icon: '🅰️'},
    {id: 'wechat' as PaymentMethod, name: 'WeChat Pay', icon: '💬'},
  ];

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

  const handlePurchase = async () => {
    if (!content || !user) return;

    setProcessing(true);
    try {
      // Create payment intent
      const paymentIntent = await apiService.post('/payments/create-intent', {
        contentId: content.id,
        paymentMethod: selectedPayment,
        amount: content.price,
        currency: content.currency,
      });

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Confirm payment
      await apiService.post('/payments/confirm', {
        paymentIntentId: paymentIntent.id,
      });

      Alert.alert(
        'Success!',
        'Your purchase was successful. You can now access the content.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Payment failed. Please try again.');
      console.error('Payment failed:', error);
    } finally {
      setProcessing(false);
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

  const subtotal = content.price;
  const platformFee = content.price * 0.05; // 5% platform fee
  const total = subtotal + platformFee;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderCard}>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Content:</Text>
              <Text style={styles.orderValue}>{content.title}</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Creator:</Text>
              <Text style={styles.orderValue}>{content.creatorName}</Text>
            </View>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Type:</Text>
              <Text style={styles.orderValue}>
                {content.contentType.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                selectedPayment === method.id && styles.paymentMethodActive,
              ]}
              onPress={() => setSelectedPayment(method.id)}>
              <View style={styles.paymentMethodLeft}>
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <Text style={styles.paymentName}>{method.name}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  selectedPayment === method.id && styles.radioActive,
                ]}>
                {selectedPayment === method.id && (
                  <View style={styles.radioDot} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>
                {content.currency} {subtotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform Fee (5%)</Text>
              <Text style={styles.priceValue}>
                {content.currency} {platformFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {content.currency} {total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By completing this purchase, you agree to our Terms of Service and
            Privacy Policy.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.purchaseButton, processing && styles.buttonDisabled]}
          onPress={handlePurchase}
          disabled={processing}>
          {processing ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Complete Purchase - {content.currency} {total.toFixed(2)}
            </Text>
          )}
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
    padding: SPACING.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  orderCard: {
    backgroundColor: '#f3f4f6',
    padding: SPACING.md,
    borderRadius: 12,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  orderLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  orderValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  paymentMethodActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f4ff',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  paymentName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  priceCard: {
    backgroundColor: '#f3f4f6',
    padding: SPACING.md,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  priceLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  termsContainer: {
    padding: SPACING.md,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  termsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
