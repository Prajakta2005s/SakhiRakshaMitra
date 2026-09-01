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
  Image,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async () => {

    if (!phone.trim() || !password.trim()) {

      Alert.alert(
        'Missing Information',
        'Please enter your phone number and password.'
      );

      return;
    }


    try {

      const savedUser =
        await AsyncStorage.getItem('@sakhi_user');


      // No account found
      if (!savedUser) {

        Alert.alert(
          'Account Not Found',
          'Please create an account first.',
          [
            {
              text: 'Register',
              onPress: () =>
                navigation.navigate('Register'),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );

        return;
      }


      const user = JSON.parse(savedUser);


      // Check login details
      if (
        user.phone === phone.trim() &&
        user.password === password
      ) {

        // Save login status
        await AsyncStorage.setItem(
          '@sakhi_logged_in',
          'true'
        );


        Alert.alert(
          'Login Successful',
          `Welcome, ${user.name}!`,
          [
            {
              text: 'Continue',
              onPress: () =>
                navigation.replace('Home'),
            },
          ]
        );

      } else {

        Alert.alert(
          'Login Failed',
          'Phone number or password is incorrect.'
        );

      }

    } catch (error) {

      console.log(
        'Login error:',
        error
      );

      Alert.alert(
        'Error',
        'Something went wrong while logging in.'
      );

    }
  };


  // =====================================================
  // UI
  // =====================================================

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
        showsVerticalScrollIndicator={false}
      >


        {/* =================================================
            LOGO
        ================================================= */}

        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />


        {/* =================================================
            WELCOME TEXT
        ================================================= */}

        <Text style={styles.title}>
          Welcome Back
        </Text>


        <Text style={styles.subtitle}>
          Login to Sakhi RakshaMitra
        </Text>


        {/* =================================================
            PHONE NUMBER
        ================================================= */}

        <Text style={styles.label}>
          Phone Number
        </Text>


        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          placeholderTextColor="#999999"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
        />


        {/* =================================================
            PASSWORD
        ================================================= */}

        <Text style={styles.label}>
          Password
        </Text>


        <View style={styles.passwordContainer}>

          <TextInput
            style={styles.passwordInput}
            placeholder="Enter password"
            placeholderTextColor="#999999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />


          {/* EYE BUTTON */}

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() =>
              setShowPassword(!showPassword)
            }
            activeOpacity={0.7}
          >

            <Text style={styles.eyeIcon}>
              {showPassword ? '👁️' : '👁️'}
            </Text>

          </TouchableOpacity>

        </View>


        {/* =================================================
            LOGIN BUTTON
        ================================================= */}

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >

          <Text style={styles.loginText}>
            Login
          </Text>

        </TouchableOpacity>


        {/* =================================================
            REGISTER
        ================================================= */}

        <View style={styles.registerRow}>

          <Text style={styles.registerLabel}>
            Don't have an account?
          </Text>


          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Register')
            }
          >

            <Text style={styles.registerButton}>
              Register
            </Text>

          </TouchableOpacity>

        </View>

      </ScrollView>

    </KeyboardAvoidingView>

  );
};


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FFF9FC',
  },


  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 35,
  },


  // ===================================================
  // LOGO
  // ===================================================

  logo: {
    width: 170,
    height: 170,
    alignSelf: 'center',
    marginBottom: 5,
  },


  // ===================================================
  // TITLE
  // ===================================================

  title: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#7425C9',
    textAlign: 'center',
    marginTop: 0,
  },


  subtitle: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 35,
  },


  // ===================================================
  // LABEL
  // ===================================================

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 7,
  },


  // ===================================================
  // NORMAL INPUT
  // ===================================================

  input: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 18,
    color: '#222222',
  },


  // ===================================================
  // PASSWORD CONTAINER
  // ===================================================

  passwordContainer: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },


  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#222222',
  },


  // ===================================================
  // EYE BUTTON
  // ===================================================

  eyeButton: {
    width: 50,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },


  eyeIcon: {
    fontSize: 21,
  },


  // ===================================================
  // LOGIN BUTTON
  // ===================================================

  loginButton: {
    backgroundColor: '#7425C9',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },


  loginText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },


  // ===================================================
  // REGISTER
  // ===================================================

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },


  registerLabel: {
    color: '#666666',
    fontSize: 14,
  },


  registerButton: {
    color: '#7425C9',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },

});


export default LoginScreen;