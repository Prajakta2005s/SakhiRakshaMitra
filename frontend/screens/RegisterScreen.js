import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterScreen = ({ navigation }) => {

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {

    if (
      !name.trim() ||
      !phone.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {

      Alert.alert(
        'Missing Information',
        'Please fill all the fields.'
      );

      return;
    }

    if (phone.trim().length !== 10) {

      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid 10-digit phone number.'
      );

      return;
    }

    if (password.length < 6) {

      Alert.alert(
        'Weak Password',
        'Password must contain at least 6 characters.'
      );

      return;
    }

    if (password !== confirmPassword) {

      Alert.alert(
        'Password Mismatch',
        'Passwords do not match.'
      );

      return;
    }

    try {

      const user = {
        name: name.trim(),
        phone: phone.trim(),
        password: password,
      };

      await AsyncStorage.setItem(
        '@sakhi_user',
        JSON.stringify(user)
      );

      Alert.alert(
        'Registration Successful',
        'Your Sakhi RakshaMitra account has been created.',
        [
          {
            text: 'Go to Login',
            onPress: () =>
              navigation.replace('Login'),
          },
        ]
      );

    } catch (error) {

      console.log(
        'Registration error:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to create your account.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        <Text style={styles.icon}>
          🛡️
        </Text>

        <Text style={styles.title}>
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Create your Sakhi RakshaMitra account
        </Text>


        <Text style={styles.label}>
          Full Name
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />


        <Text style={styles.label}>
          Phone Number
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter 10-digit phone number"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
        />


        <Text style={styles.label}>
          Password
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Create password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />


        <Text style={styles.label}>
          Confirm Password
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Re-enter password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />


        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          activeOpacity={0.8}
        >

          <Text style={styles.registerText}>
            Create Account
          </Text>

        </TouchableOpacity>


        <View style={styles.loginRow}>

          <Text style={styles.loginLabel}>
            Already have an account?
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Login')
            }
          >

            <Text style={styles.loginButtonText}>
              Login
            </Text>

          </TouchableOpacity>

        </View>

      </ScrollView>

    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FFF9FC',
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 25,
  },

  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7425C9',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 30,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 7,
  },

  input: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 17,
  },

  registerButton: {
    backgroundColor: '#7425C9',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  registerText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },

  loginLabel: {
    color: '#666666',
    fontSize: 14,
  },

  loginButtonText: {
    color: '#7425C9',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },

});

export default RegisterScreen;