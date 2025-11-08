import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {MainTabNavigator} from './MainTabNavigator';
import {LoginScreen} from '@screens/LoginScreen';
import {ContentDetailsScreen} from '@screens/ContentDetailsScreen';
import {CheckoutScreen} from '@screens/CheckoutScreen';
import {useAuthStore} from '@store/authStore';

export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  ContentDetails: {contentId: string};
  Checkout: {contentId: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
        <Stack.Screen
          name="ContentDetails"
          component={ContentDetailsScreen}
          options={{
            headerShown: true,
            title: 'Content Details',
          }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{
            headerShown: true,
            title: 'Checkout',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
