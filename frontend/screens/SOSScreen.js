import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Location from 'expo-location';


// =====================================================
// CONSTANTS
// =====================================================

const CONTACTS_KEY = '@sakhi_safety_circle';
const TIMELINE_KEY = '@sakhi_safety_timeline';

// IMPORTANT:
// Android Emulator -> 10.0.2.2 means your Windows PC
const SMS_SERVER_URL = 'http://10.0.2.2:5000/send-sos';


// =====================================================
// SOS SCREEN
// =====================================================

const SOSScreen = ({ navigation }) => {

  const [loading, setLoading] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);


  // ===================================================
  // SAVE TIMELINE EVENT
  // ===================================================

  const saveTimelineEvent = async (event) => {

    try {

      const savedEvents =
        await AsyncStorage.getItem(TIMELINE_KEY);

      const events = savedEvents
        ? JSON.parse(savedEvents)
        : [];

      const newEvent = {

        id: Date.now().toString(),

        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),

        title: event.title,

        description: event.description,

        icon: event.icon,

        details: event.details,
      };

      const updatedEvents = [
        newEvent,
        ...events,
      ];

      await AsyncStorage.setItem(
        TIMELINE_KEY,
        JSON.stringify(updatedEvents)
      );

    } catch (error) {

      console.log(
        'Timeline save error:',
        error
      );

    }

  };


  // ===================================================
  // ACTIVATE SOS
  // ===================================================

  const activateSOS = async () => {

    try {

      console.log('');
      console.log('======================================');
      console.log('SOS ACTIVATION STARTED');
      console.log('======================================');


      setLoading(true);


      // =================================================
      // 1. GET SAFETY CIRCLE
      // =================================================

      const savedContacts =
        await AsyncStorage.getItem(
          CONTACTS_KEY
        );

      const contacts = savedContacts
        ? JSON.parse(savedContacts)
        : [];


      console.log(
        'SAFETY CIRCLE CONTACTS:',
        JSON.stringify(contacts)
      );


      if (
        !Array.isArray(contacts) ||
        contacts.length === 0
      ) {

        setLoading(false);

        Alert.alert(
          'Safety Circle Empty',

          'Please add at least one trusted contact before activating SOS.',

          [
            {
              text: 'Go to Safety Circle',

              onPress: () =>
                navigation.navigate(
                  'SafetyCircle'
                ),
            },

            {
              text: 'Cancel',

              style: 'cancel',
            },
          ]
        );

        return;
      }


      // =================================================
      // 2. REQUEST LOCATION PERMISSION
      // =================================================

      console.log(
        'REQUESTING LOCATION PERMISSION...'
      );

      const {
        status,
      } =
        await Location.requestForegroundPermissionsAsync();


      console.log(
        'LOCATION PERMISSION:',
        status
      );


      if (status !== 'granted') {

        setLoading(false);

        Alert.alert(
          'Location Permission Required',

          'Please allow location access to use SOS.'
        );

        return;
      }


      // =================================================
      // 3. GET CURRENT LOCATION
      // =================================================

      console.log(
        'GETTING CURRENT LOCATION...'
      );

      const currentLocation =
        await Location.getCurrentPositionAsync({

          accuracy:
            Location.Accuracy.High,

        });


      const latitude =
        currentLocation.coords.latitude;

      const longitude =
        currentLocation.coords.longitude;


      console.log(
        'LATITUDE:',
        latitude
      );

      console.log(
        'LONGITUDE:',
        longitude
      );


      // =================================================
      // 4. GOOGLE MAPS LINK
      // =================================================

      const locationLink =
        `https://www.google.com/maps?q=${latitude},${longitude}`;


      console.log(
        'LOCATION LINK:',
        locationLink
      );


      // =================================================
      // 5. SAVE SOS EVENT TO TIMELINE
      // =================================================

      await saveTimelineEvent({

        title:
          'SOS Activated',

        description:
          'Emergency SOS was activated and current location was captured.',

        icon:
          '🚨',

        details:

          `SOS was activated successfully.\n\n` +

          `Trusted Contacts: ${contacts.length}\n\n` +

          `Latitude: ${latitude.toFixed(6)}\n` +

          `Longitude: ${longitude.toFixed(6)}\n\n` +

          `Location:\n${locationLink}`,

      });


      // =================================================
      // 6. SAVE LOCATION EVENT
      // =================================================

      await saveTimelineEvent({

        title:
          'Emergency Location Captured',

        description:
          'Current GPS location was captured during the SOS event.',

        icon:
          '📍',

        details:

          `Latitude: ${latitude.toFixed(6)}\n` +

          `Longitude: ${longitude.toFixed(6)}\n\n` +

          `Location link:\n${locationLink}`,

      });


      // =================================================
      // 7. SET SOS ACTIVATED
      // =================================================

      setSosActivated(true);

      setLoading(false);


      // =================================================
      // 8. SHOW CONFIRMATION
      // =================================================

      Alert.alert(

        '🚨 SOS Activated',

        `Emergency SOS has been activated.\n\n` +

        `Trusted Contact: ${contacts[0].name}\n\n` +

        `Location:\n` +

        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,

        [

          {

            text:
              'Send Emergency SMS',

            onPress:
              () => {

                sendSOSSMS(
                  contacts,
                  latitude,
                  longitude
                );

              },

          },


          {

            text:
              'Call 112',

            onPress:
              () => {

                Linking.openURL(
                  'tel:112'
                );

            },

          },


          {

            text:
              'View Timeline',

            onPress:
              () => {

                navigation.navigate(
                  'SafetyTimeline'
                );

            },

          },

        ]

      );


    } catch (error) {

      console.log(
        'SOS ERROR:',
        error
      );

      setLoading(false);

      Alert.alert(

        'SOS Error',

        error?.message ||
        'Unable to activate SOS. Please try again.'

      );

    }

  };


  // ===================================================
  // SEND SOS SMS THROUGH NODE SERVER
  // ===================================================

  const sendSOSSMS = async (
    contacts,
    latitude,
    longitude
  ) => {

    try {

      // =================================================
      // GET FIRST TRUSTED CONTACT
      // =================================================

      const firstContact =
        contacts[0];


      if (
        !firstContact ||
        !firstContact.phone
      ) {

        Alert.alert(
          'Contact Error',
          'Trusted contact phone number is missing.'
        );

        return;
      }


      console.log('');
      console.log('======================================');
      console.log('SENDING SOS SMS');
      console.log('======================================');


      console.log(
        'Trusted Name:',
        firstContact.name
      );

      console.log(
        'Trusted Phone:',
        firstContact.phone
      );

      console.log(
        'Latitude:',
        latitude
      );

      console.log(
        'Longitude:',
        longitude
      );


      // =================================================
      // SEND TO NODE SERVER
      // =================================================

      const response =
        await fetch(
          SMS_SERVER_URL,
          {

            method:
              'POST',

            headers:
              {
                'Content-Type':
                  'application/json',
              },

            body:
              JSON.stringify({

                trustedNumber:
                  firstContact.phone,

                latitude:
                  latitude,

                longitude:
                  longitude,

              }),

          }
        );


      console.log(
        'SERVER STATUS:',
        response.status
      );


      const result =
        await response.json();


      console.log(
        'SERVER RESPONSE:',
        JSON.stringify(result)
      );


      // =================================================
      // CHECK SERVER RESPONSE
      // =================================================

      if (
        !response.ok ||
        !result.success
      ) {

        throw new Error(

          result.error ||
          result.message ||
          'Unable to send SOS SMS.'

        );

      }


      // =================================================
      // SUCCESS
      // =================================================

      console.log(
        '======================================'
      );

      console.log(
        'SOS SMS SENT SUCCESSFULLY'
      );

      console.log(
        '======================================'
      );


      Alert.alert(

        '✅ SOS SMS Sent',

        `Emergency message was sent to ${firstContact.name}.\n\n` +

        `📍 Location:\n` +

        `${result.locationUrl || 'Location sent'}`

      );


    } catch (error) {

      console.log(
        '======================================'
      );

      console.log(
        'SOS SMS ERROR'
      );

      console.log(
        error
      );

      console.log(
        '======================================'
      );


      Alert.alert(

        'SMS Error',

        error?.message ||

        'Unable to send emergency SMS. Please check that the server is running.'

      );

    }

  };


  // ===================================================
  // UI
  // ===================================================

  return (

    <View style={styles.container}>

      {/* ICON */}

      <Text style={styles.icon}>
        🚨
      </Text>


      {/* TITLE */}

      <Text style={styles.title}>
        Emergency SOS
      </Text>


      {/* SUBTITLE */}

      <Text style={styles.subtitle}>
        Use this button only when you need immediate help.
      </Text>


      {/* SOS BUTTON */}

      <TouchableOpacity

        style={[
          styles.sosButton,

          sosActivated &&
          styles.sosActivated,
        ]}

        onPress={
          activateSOS
        }

        disabled={
          loading
        }

        activeOpacity={
          0.8
        }

      >

        {loading ? (

          <ActivityIndicator
            size="large"
            color="#FFFFFF"
          />

        ) : (

          <>

            <Text style={styles.sosIcon}>
              🆘
            </Text>

            <Text style={styles.sosText}>

              {sosActivated
                ? 'SOS ACTIVATED'
                : 'ACTIVATE SOS'}

            </Text>

            <Text style={styles.sosSubText}>
              Tap for immediate help
            </Text>

          </>

        )}

      </TouchableOpacity>


      {/* STATUS */}

      <View style={styles.statusCard}>

        <Text style={styles.statusIcon}>
          🛡️
        </Text>


        <View>

          <Text style={styles.statusTitle}>
            Emergency System
          </Text>


          <Text style={styles.statusText}>

            {sosActivated
              ? 'SOS alert activated'
              : 'Ready for emergency use'}

          </Text>

        </View>

      </View>


      {/* INFORMATION */}

      <View style={styles.infoCard}>

        <Text style={styles.infoTitle}>
          When SOS is activated
        </Text>


        <Text style={styles.infoItem}>
          ✓ Safety Circle is checked
        </Text>


        <Text style={styles.infoItem}>
          ✓ Current GPS location is obtained
        </Text>


        <Text style={styles.infoItem}>
          ✓ Emergency message is prepared
        </Text>


        <Text style={styles.infoItem}>
          ✓ SOS event is saved to Timeline
        </Text>


        <Text style={styles.infoItem}>
          ✓ Emergency SMS is sent through Twilio
        </Text>

      </View>


      {/* TIMELINE BUTTON */}

      <TouchableOpacity

        style={styles.timelineButton}

        onPress={() =>
          navigation.navigate(
            'SafetyTimeline'
          )
        }

      >

        <Text style={styles.timelineText}>
          🗺️ View Safety Timeline
        </Text>

      </TouchableOpacity>


      {/* BACK */}

      <TouchableOpacity

        style={styles.backButton}

        onPress={() =>
          navigation.goBack()
        }

      >

        <Text style={styles.backText}>
          ← Back to Home
        </Text>

      </TouchableOpacity>

    </View>

  );

};


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FFF7F7',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
  },

  icon: {
    fontSize: 48,
    marginBottom: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },

  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#D62828',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    marginBottom: 25,
  },

  sosActivated: {
    backgroundColor: '#B71C1C',
  },

  sosIcon: {
    fontSize: 50,
    marginBottom: 8,
  },

  sosText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 'bold',
  },

  sosSubText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 6,
  },

  statusCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    marginBottom: 15,
  },

  statusIcon: {
    fontSize: 32,
    marginRight: 14,
  },

  statusTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333333',
  },

  statusText: {
    fontSize: 13,
    color: '#269447',
    marginTop: 4,
  },

  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    elevation: 2,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },

  infoItem: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 8,
  },

  timelineButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#7425C9',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 15,
  },

  timelineText: {
    color: '#7425C9',
    fontSize: 14,
    fontWeight: 'bold',
  },

  backButton: {
    paddingVertical: 15,
  },

  backText: {
    color: '#444444',
    fontSize: 16,
    fontWeight: '600',
  },

});


export default SOSScreen;