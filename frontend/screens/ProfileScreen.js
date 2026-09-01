import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@sakhi_user';
const LOGIN_KEY = '@sakhi_logged_in';

const ProfileScreen = ({ navigation }) => {

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {

      const savedUser =
        await AsyncStorage.getItem(USER_KEY);

      if (savedUser) {

        const user = JSON.parse(savedUser);

        setName(user.name || '');
        setPhone(user.phone || '');

      }

    } catch (error) {

      console.log('Profile loading error:', error);

    }
  };

  const saveProfile = async () => {

    if (!name.trim() || !phone.trim()) {

      Alert.alert(
        'Missing Information',
        'Name and phone number cannot be empty.'
      );

      return;
    }

    try {

      const savedUser =
        await AsyncStorage.getItem(USER_KEY);

      const user = savedUser
        ? JSON.parse(savedUser)
        : {};

      const updatedUser = {
        ...user,
        name: name.trim(),
        phone: phone.trim(),
      };

      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(updatedUser)
      );

      setEditMode(false);

      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.'
      );

    } catch (error) {

      console.log('Profile update error:', error);

      Alert.alert(
        'Error',
        'Unable to update profile.'
      );

    }
  };

  const logout = () => {

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',

          onPress: async () => {

            await AsyncStorage.removeItem(
              LOGIN_KEY
            );

            navigation.replace('Login');

          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >

      {/* Profile Icon */}

      <View style={styles.profileCircle}>
        <Text style={styles.profileIcon}>
          👤
        </Text>
      </View>

      <Text style={styles.title}>
        My Profile
      </Text>

      <Text style={styles.subtitle}>
        Manage your Sakhi RakshaMitra account
      </Text>


      {/* Profile Card */}

      <View style={styles.profileCard}>

        <Text style={styles.sectionTitle}>
          Personal Information
        </Text>


        {/* Name */}

        <Text style={styles.label}>
          Full Name
        </Text>

        {editMode ? (

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />

        ) : (

          <View style={styles.infoBox}>

            <Text style={styles.infoText}>
              {name || 'Not available'}
            </Text>

          </View>

        )}


        {/* Phone */}

        <Text style={styles.label}>
          Phone Number
        </Text>

        {editMode ? (

          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Enter phone number"
          />

        ) : (

          <View style={styles.infoBox}>

            <Text style={styles.infoText}>
              {phone || 'Not available'}
            </Text>

          </View>

        )}


        {/* Edit / Save */}

        {editMode ? (

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveProfile}
          >

            <Text style={styles.buttonText}>
              Save Changes
            </Text>

          </TouchableOpacity>

        ) : (

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditMode(true)}
          >

            <Text style={styles.buttonText}>
              ✏️ Edit Profile
            </Text>

          </TouchableOpacity>

        )}

      </View>


      {/* Safety Information */}

      <View style={styles.safetyCard}>

        <Text style={styles.safetyTitle}>
          🛡️ Safety Account
        </Text>

        <Text style={styles.safetyText}>
          Your profile information is used to
          personalize your safety experience.
        </Text>

      </View>


      {/* Logout */}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={logout}
      >

        <Text style={styles.logoutText}>
          🚪 Logout
        </Text>

      </TouchableOpacity>


      {/* Back */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >

        <Text style={styles.backText}>
          ← Back
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
};


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8F5FC',
  },

  content: {
    padding: 20,
    paddingTop: 55,
    paddingBottom: 40,
  },

  profileCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E9D9F8',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },

  profileIcon: {
    fontSize: 45,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7425C9',
    textAlign: 'center',
    marginTop: 15,
  },

  subtitle: {
    fontSize: 13,
    color: '#777777',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 25,
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555555',
    marginBottom: 7,
  },

  infoBox: {
    backgroundColor: '#F7F3FA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 17,
  },

  infoText: {
    fontSize: 15,
    color: '#333333',
  },

  input: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 15,
    marginBottom: 17,
  },

  editButton: {
    backgroundColor: '#7425C9',
    borderRadius: 11,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },

  saveButton: {
    backgroundColor: '#269447',
    borderRadius: 11,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  safetyCard: {
    backgroundColor: '#F1E8FA',
    borderRadius: 15,
    padding: 18,
    marginTop: 18,
  },

  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7425C9',
  },

  safetyText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 19,
    marginTop: 7,
  },

  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D62828',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  logoutText: {
    color: '#D62828',
    fontSize: 16,
    fontWeight: 'bold',
  },

  backButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },

  backText: {
    fontSize: 15,
    color: '#555555',
    fontWeight: '600',
  },

});

export default ProfileScreen;