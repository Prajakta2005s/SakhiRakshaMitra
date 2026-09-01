import React, { useEffect, useState } from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import SOSScreen from './screens/SOSScreen';
import VoiceSOSScreen from './screens/VoiceSOSScreen';
import SafetyCircleScreen from './screens/SafetyCircleScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import SafetyTimelineScreen from './screens/SafetyTimelineScreen';
import LiveLocationScreen from './screens/LiveLocationScreen';

const Stack = createNativeStackNavigator();

export default function App() {

  const [initialRoute, setInitialRoute] =
    useState(null);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {

    try {

      const loggedIn =
        await AsyncStorage.getItem(
          '@sakhi_logged_in'
        );

      if (loggedIn === 'true') {
        setInitialRoute('Home');
      } else {
        setInitialRoute('Login');
      }

    } catch (error) {

      setInitialRoute('Login');
    }
  };

  if (!initialRoute) {
    return null;
  }

  return (

    <NavigationContainer>

      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}
      >

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />

        <Stack.Screen
          name="SOS"
          component={SOSScreen}
        />

        <Stack.Screen
          name="VoiceSOS"
          component={VoiceSOSScreen}
        />

        <Stack.Screen
          name="SafetyCircle"
          component={SafetyCircleScreen}
        />

        <Stack.Screen
          name="Emergency"
          component={EmergencyScreen}
        />

        <Stack.Screen
          name="SafetyTimeline"
          component={SafetyTimelineScreen}
        />

        <Stack.Screen
          name="LiveLocation"
          component={LiveLocationScreen}
        />

      </Stack.Navigator>

    </NavigationContainer>
  );
}