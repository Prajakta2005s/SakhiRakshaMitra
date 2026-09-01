import * as Location from 'expo-location';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';


// =====================================================
// VOICE SOS SCREEN
// =====================================================

export default function VoiceSOSScreen({
  navigation,
  route,
}) {


  // =====================================================
  // SERVER CONFIGURATION
  // =====================================================
  //
  // IMPORTANT:
  //
  // We are using the PUBLIC NGROK URL for communication
  // between the Android app and the Node.js server.
  //
  // This avoids the:
  //
  // Failed to connect to /10.0.2.2:5000
  //
  // error.
  //
  // =====================================================

  const SERVER_BASE_URL =
    'https://quake-proofs-president.ngrok-free.dev';


  const SOS_SERVER =
    `${SERVER_BASE_URL}/send-sos`;


  const LIVE_LOCATION_SERVER =
    SERVER_BASE_URL;


  // =====================================================
  // PUBLIC SERVER
  // =====================================================
  //
  // This URL is opened by the Safety Circle person.
  //
  // =====================================================

  const PUBLIC_SERVER =
    'https://quake-proofs-president.ngrok-free.dev';


  // =====================================================
  // STORAGE
  // =====================================================

  const CONTACTS_STORAGE_KEY =
    '@sakhi_trusted_contacts';


  // =====================================================
  // STATES
  // =====================================================

  const [
    trustedContacts,
    setTrustedContacts,
  ] = useState([]);


  const [
    isListening,
    setIsListening,
  ] = useState(false);


  const [
    recognizedText,
    setRecognizedText,
  ] = useState('');


  const [
    speechStarted,
    setSpeechStarted,
  ] = useState(false);


  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');


  const [
    sosTriggered,
    setSosTriggered,
  ] = useState(false);


  const [
    isSending,
    setIsSending,
  ] = useState(false);


  const [
    latitude,
    setLatitude,
  ] = useState(null);


  const [
    longitude,
    setLongitude,
  ] = useState(null);


  const [
    gpsAccuracy,
    setGpsAccuracy,
  ] = useState(null);


  const [
    liveLocationUrl,
    setLiveLocationUrl,
  ] = useState('');


  const [
    liveLocationActive,
    setLiveLocationActive,
  ] = useState(false);


  // =====================================================
  // REFS
  // =====================================================

  const sosTriggeredRef =
    useRef(false);


  const sendingRef =
    useRef(false);


  const recognitionStartedRef =
    useRef(false);


  const startingRecognitionRef =
    useRef(false);


  const locationWatcherRef =
    useRef(null);


  const locationIdRef =
    useRef(null);


  // =====================================================
  // LOAD SAFETY CIRCLE
  // =====================================================

  useEffect(() => {

    const loadTrustedContacts =
      async () => {

        try {

          const savedContacts =
            await AsyncStorage.getItem(
              CONTACTS_STORAGE_KEY
            );


          if (!savedContacts) {

            setTrustedContacts([]);

            return;

          }


          const contacts =
            JSON.parse(
              savedContacts
            );


          if (
            Array.isArray(contacts)
          ) {

            const validContacts =
              contacts.filter(
                contact =>
                  contact &&
                  contact.email &&
                  String(
                    contact.email
                  ).trim() !== ''
              );


            console.log(
              'VALID SAFETY CIRCLE EMAIL COUNT:',
              validContacts.length
            );


            setTrustedContacts(
              validContacts
            );

          } else {

            setTrustedContacts([]);

          }


        } catch (error) {

          console.log(
            'LOAD CONTACTS ERROR:',
            error
          );


          setTrustedContacts([]);

        }

      };


    loadTrustedContacts();

  }, []);


  // =====================================================
  // EMERGENCY KEYWORDS
  // =====================================================

  const emergencyKeywords = [

    'sos',

    'help',

    'help me',

    'emergency',

    'save me',

    'i need help',

    'please help',

    'danger',

  ];


  // =====================================================
  // CHECK EMERGENCY PHRASE
  // =====================================================

  const checkEmergencyPhrase =
    (text) => {

      if (!text) {

        return false;

      }


      const cleanText =
        text
          .toLowerCase()
          .trim();


      return emergencyKeywords.some(
        keyword =>
          cleanText.includes(
            keyword
          )
      );

    };


  // =====================================================
  // SPEECH START
  // =====================================================

  useSpeechRecognitionEvent(
    'start',
    () => {

      console.log(
        'SPEECH RECOGNITION STARTED'
      );


      recognitionStartedRef.current =
        true;


      startingRecognitionRef.current =
        false;


      setIsListening(true);

      setSpeechStarted(false);

      setErrorMessage('');

    }
  );


  // =====================================================
  // SPEECH STARTED
  // =====================================================

  useSpeechRecognitionEvent(
    'speechstart',
    () => {

      console.log(
        'USER SPEECH DETECTED'
      );


      setSpeechStarted(true);

    }
  );


  // =====================================================
  // SPEECH RESULT
  // =====================================================

  useSpeechRecognitionEvent(
    'result',
    (event) => {

      if (
        sosTriggeredRef.current
      ) {

        return;

      }


      if (
        !event ||
        !event.results ||
        event.results.length === 0
      ) {

        return;

      }


      const result =
        event.results[
          event.results.length - 1
        ];


      const transcript =
        result?.transcript || '';


      if (
        !transcript.trim()
      ) {

        return;

      }


      const cleanTranscript =
        transcript.trim();


      console.log(
        'RECOGNIZED SPEECH:',
        cleanTranscript
      );


      setRecognizedText(
        cleanTranscript
      );


      if (
        checkEmergencyPhrase(
          cleanTranscript
        )
      ) {

        activateSOS(
          cleanTranscript
        );

      }

    }
  );


  // =====================================================
  // SPEECH END
  // =====================================================

  useSpeechRecognitionEvent(
    'speechend',
    () => {

      setSpeechStarted(false);

    }
  );


  // =====================================================
  // SPEECH ERROR
  // =====================================================

  useSpeechRecognitionEvent(
    'error',
    (event) => {

      console.log(
        'SPEECH ERROR:',
        JSON.stringify(event)
      );


      recognitionStartedRef.current =
        false;


      startingRecognitionRef.current =
        false;


      setIsListening(false);

      setSpeechStarted(false);


      if (
        event?.error === 'no-speech'
      ) {

        setErrorMessage(
          'No speech detected. Please try again.'
        );

        return;

      }


      if (
        event?.error === 'network'
      ) {

        setErrorMessage(
          'Speech recognition needs an internet connection.'
        );

        return;

      }


      if (
        event?.error === 'not-allowed'
      ) {

        setErrorMessage(
          'Microphone permission was denied.'
        );

        return;

      }


      setErrorMessage(
        event?.message ||
        'Unable to recognize speech.'
      );

    }
  );


  // =====================================================
  // SPEECH END EVENT
  // =====================================================

  useSpeechRecognitionEvent(
    'end',
    () => {

      recognitionStartedRef.current =
        false;


      startingRecognitionRef.current =
        false;


      setIsListening(false);

      setSpeechStarted(false);

    }
  );


  // =====================================================
  // CHECK SPEECH RECOGNITION
  // =====================================================

  const checkSpeechRecognition =
    () => {

      try {

        const available =
          ExpoSpeechRecognitionModule
            .isRecognitionAvailable();


        if (!available) {

          Alert.alert(
            'Speech Recognition Unavailable',
            'Speech recognition is not available.'
          );

          return false;

        }


        return true;

      } catch (error) {

        console.log(
          'CHECK SPEECH ERROR:',
          error
        );


        Alert.alert(
          'Speech Recognition Error',
          'Speech recognition module could not be accessed.'
        );


        return false;

      }

    };


  // =====================================================
  // GET CURRENT DEVICE LOCATION
  // =====================================================
  //
  // IMPORTANT:
  //
  // No hardcoded latitude/longitude is used here.
  //
  // The location comes from the device's location
  // services at the moment SOS is triggered.
  //
  // =====================================================

  const getFreshCurrentLocation =
    async () => {

      try {

        console.log(
          '================================'
        );

        console.log(
          '📍 GETTING CURRENT DEVICE LOCATION'
        );

        console.log(
          '================================'
        );


        // -------------------------------------------------
        // REQUEST LOCATION PERMISSION
        // -------------------------------------------------

        const permission =
          await Location.requestForegroundPermissionsAsync();


        console.log(
          'LOCATION PERMISSION:',
          permission.status
        );


        if (
          permission.status !==
          'granted'
        ) {

          throw new Error(
            'Location permission was denied. Please allow location permission.'
          );

        }


        // -------------------------------------------------
        // CHECK LOCATION SERVICES
        // -------------------------------------------------

        const servicesEnabled =
          await Location.hasServicesEnabledAsync();


        console.log(
          'LOCATION SERVICES:',
          servicesEnabled
        );


        if (!servicesEnabled) {

          throw new Error(
            'Please turn on your device location/GPS.'
          );

        }


        console.log(
          '================================'
        );

        console.log(
          '📡 REQUESTING FRESH GPS LOCATION'
        );

        console.log(
          '================================'
        );


        // -------------------------------------------------
        // GET CURRENT LOCATION
        // -------------------------------------------------

        const currentLocation =
          await Location.getCurrentPositionAsync({

            accuracy:
              Location.Accuracy.Highest,

            mayShowUserSettingsDialog:
              true,

          });


        const currentLatitude =
          currentLocation.coords.latitude;


        const currentLongitude =
          currentLocation.coords.longitude;


        const accuracy =
          currentLocation.coords.accuracy;


        const timestamp =
          currentLocation.timestamp ||
          Date.now();


        // -------------------------------------------------
        // VALIDATE LOCATION
        // -------------------------------------------------

        if (
          typeof currentLatitude !== 'number' ||
          typeof currentLongitude !== 'number'
        ) {

          throw new Error(
            'Device returned an invalid GPS location.'
          );

        }


        console.log(
          '--------------------------------'
        );

        console.log(
          '📡 CURRENT DEVICE GPS LOCATION'
        );

        console.log(
          'Latitude:',
          currentLatitude
        );

        console.log(
          'Longitude:',
          currentLongitude
        );

        console.log(
          'Accuracy:',
          accuracy
        );

        console.log(
          'Timestamp:',
          timestamp
        );

        console.log(
          '--------------------------------'
        );


        // -------------------------------------------------
        // UPDATE APP STATE
        // -------------------------------------------------

        setLatitude(
          currentLatitude
        );


        setLongitude(
          currentLongitude
        );


        setGpsAccuracy(
          accuracy
        );


        return {

          latitude:
            currentLatitude,

          longitude:
            currentLongitude,

          accuracy,

          timestamp,

        };


      } catch (error) {

        console.log(
          'FRESH LOCATION ERROR:',
          error
        );


        return {

          latitude:
            null,

          longitude:
            null,

          accuracy:
            null,

          timestamp:
            null,

          error:
            error?.message ||
            'Unable to get current device location.',

        };

      }

    };


  // =====================================================
  // CREATE LIVE LOCATION SESSION
  // =====================================================

  const createLiveLocationSession =
    async (
      location
    ) => {

      try {

        console.log(
          '================================'
        );

        console.log(
          '📍 CREATE LIVE LOCATION SESSION'
        );

        console.log(
          '================================'
        );


        console.log(
          'SERVER:',
          LIVE_LOCATION_SERVER
        );


        console.log(
          'LOCATION SENT TO SERVER:',
          location
        );


        const response =
          await fetch(
            `${LIVE_LOCATION_SERVER}/create-live-location`,
            {

              method:
                'POST',

              headers: {

                'Content-Type':
                  'application/json',

                'Accept':
                  'application/json',

                'ngrok-skip-browser-warning':
                  'true',

              },

              body:
                JSON.stringify({

                  latitude:
                    location.latitude,

                  longitude:
                    location.longitude,

                  accuracy:
                    location.accuracy,

                  timestamp:
                    location.timestamp,

                }),

            }
          );


        console.log(
          'CREATE LIVE LOCATION STATUS:',
          response.status
        );


        const responseText =
          await response.text();


        console.log(
          'CREATE LIVE LOCATION RESPONSE:',
          responseText
        );


        let result;


        try {

          result =
            JSON.parse(
              responseText
            );

        } catch (error) {

          throw new Error(
            'Server returned an invalid response.'
          );

        }


        if (
          !response.ok ||
          !result.success
        ) {

          throw new Error(
            result.message ||
            'Unable to create live location.'
          );

        }


        // -------------------------------------------------
        // SAVE LOCATION SESSION ID
        // -------------------------------------------------

        locationIdRef.current =
          result.locationId;


        // -------------------------------------------------
        // CREATE PUBLIC LIVE URL
        // -------------------------------------------------

        const publicLiveUrl =
          result.liveLocationUrl ||
          `${PUBLIC_SERVER}/live-location?locationId=${encodeURIComponent(
            result.locationId
          )}`;


        setLiveLocationUrl(
          publicLiveUrl
        );


        setLiveLocationActive(
          true
        );


        console.log(
          '================================'
        );

        console.log(
          '✅ LIVE LOCATION CREATED'
        );

        console.log(
          'LOCATION ID:',
          result.locationId
        );

        console.log(
          'LIVE URL:',
          publicLiveUrl
        );

        console.log(
          '================================'
        );


        return {

          success:
            true,

          locationId:
            result.locationId,

          liveLocationUrl:
            publicLiveUrl,

        };


      } catch (error) {

        console.log(
          'CREATE LIVE LOCATION ERROR:',
          error
        );


        return {

          success:
            false,

          error:
            error?.message ||
            'Unable to create live location.',

        };

      }

    };


  // =====================================================
  // UPDATE SERVER LOCATION
  // =====================================================

  const updateServerLocation =
    async (
      location
    ) => {

      try {

        const locationId =
          locationIdRef.current;


        if (!locationId) {

          console.log(
            'NO LIVE LOCATION ID'
          );

          return;

        }


        console.log(
          '📡 SENDING LOCATION UPDATE TO SERVER'
        );


        const response =
          await fetch(
            `${LIVE_LOCATION_SERVER}/update-location`,
            {

              method:
                'POST',

              headers: {

                'Content-Type':
                  'application/json',

                'Accept':
                  'application/json',

                'ngrok-skip-browser-warning':
                  'true',

              },

              body:
                JSON.stringify({

                  locationId,

                  latitude:
                    location.latitude,

                  longitude:
                    location.longitude,

                  accuracy:
                    location.accuracy,

                  timestamp:
                    location.timestamp,

                }),

            }
          );


        const responseText =
          await response.text();


        console.log(
          'UPDATE LOCATION STATUS:',
          response.status
        );


        if (
          !response.ok
        ) {

          console.log(
            'UPDATE LOCATION ERROR:',
            responseText
          );

          return;

        }


        console.log(
          '📍 LIVE LOCATION UPDATED'
        );

        console.log(
          'Latitude:',
          location.latitude
        );

        console.log(
          'Longitude:',
          location.longitude
        );


      } catch (error) {

        console.log(
          'UPDATE SERVER LOCATION ERROR:',
          error
        );

      }

    };


  // =====================================================
  // START CONTINUOUS LOCATION TRACKING
  // =====================================================

  const startLiveLocationTracking =
    async () => {

      try {

        // -------------------------------------------------
        // REMOVE OLD WATCHER
        // -------------------------------------------------

        if (
          locationWatcherRef.current
        ) {

          locationWatcherRef.current.remove();

          locationWatcherRef.current =
            null;

        }


        console.log(
          '================================'
        );

        console.log(
          '🛰️ STARTING CONTINUOUS GPS'
        );

        console.log(
          '================================'
        );


        // -------------------------------------------------
        // LOCATION PERMISSION
        // -------------------------------------------------

        const permission =
          await Location.requestForegroundPermissionsAsync();


        if (
          permission.status !==
          'granted'
        ) {

          console.log(
            'LOCATION TRACKING PERMISSION DENIED'
          );

          return;

        }


        // -------------------------------------------------
        // CHECK LOCATION SERVICES
        // -------------------------------------------------

        const servicesEnabled =
          await Location.hasServicesEnabledAsync();


        if (!servicesEnabled) {

          console.log(
            'LOCATION SERVICES ARE OFF'
          );

          return;

        }


        // -------------------------------------------------
        // START GPS WATCHER
        // -------------------------------------------------

        locationWatcherRef.current =
          await Location.watchPositionAsync(

            {

              accuracy:
                Location.Accuracy.Highest,

              timeInterval:
                5000,

              distanceInterval:
                1,

              mayShowUserSettingsDialog:
                true,

            },

            async (
              newLocation
            ) => {

              try {

                const coords =
                  newLocation.coords;


                const newLatitude =
                  coords.latitude;


                const newLongitude =
                  coords.longitude;


                const accuracy =
                  coords.accuracy;


                const timestamp =
                  newLocation.timestamp ||
                  Date.now();


                console.log(
                  '--------------------------------'
                );


                console.log(
                  '📡 CONTINUOUS GPS UPDATE'
                );


                console.log(
                  'Latitude:',
                  newLatitude
                );


                console.log(
                  'Longitude:',
                  newLongitude
                );


                console.log(
                  'Accuracy:',
                  accuracy
                );


                console.log(
                  '--------------------------------'
                );


                // -----------------------------------------
                // UPDATE APP
                // -----------------------------------------

                setLatitude(
                  newLatitude
                );


                setLongitude(
                  newLongitude
                );


                setGpsAccuracy(
                  accuracy
                );


                // -----------------------------------------
                // UPDATE SERVER
                // -----------------------------------------

                await updateServerLocation({

                  latitude:
                    newLatitude,

                  longitude:
                    newLongitude,

                  accuracy,

                  timestamp,

                });

              } catch (error) {

                console.log(
                  'LOCATION UPDATE CALLBACK ERROR:',
                  error
                );

              }

            }

          );


        console.log(
          '✅ CONTINUOUS GPS TRACKING STARTED'
        );


      } catch (error) {

        console.log(
          'LIVE LOCATION TRACKING ERROR:',
          error
        );

      }

    };


  // =====================================================
  // STOP LIVE LOCATION TRACKING
  // =====================================================

  const stopLiveLocationTracking =
    () => {

      try {

        if (
          locationWatcherRef.current
        ) {

          locationWatcherRef.current.remove();

          locationWatcherRef.current =
            null;

        }


        console.log(
          '🛑 LIVE LOCATION TRACKING STOPPED'
        );


        setLiveLocationActive(
          false
        );


      } catch (error) {

        console.log(
          'STOP LOCATION ERROR:',
          error
        );

      }

    };


  // =====================================================
  // START VOICE SOS
  // =====================================================

  const startVoiceSOS =
    async () => {

      try {

        if (
          recognitionStartedRef.current ||
          startingRecognitionRef.current ||
          isListening
        ) {

          return;

        }


        startingRecognitionRef.current =
          true;


        setErrorMessage('');

        setRecognizedText('');

        setSpeechStarted(false);

        setSosTriggered(false);

        setLatitude(null);

        setLongitude(null);

        setGpsAccuracy(null);

        setLiveLocationUrl('');

        setLiveLocationActive(false);


        sosTriggeredRef.current =
          false;


        sendingRef.current =
          false;


        locationIdRef.current =
          null;


        stopLiveLocationTracking();


        // -------------------------------------------------
        // CHECK SAFETY CIRCLE
        // -------------------------------------------------

        if (
          trustedContacts.length === 0
        ) {

          startingRecognitionRef.current =
            false;


          Alert.alert(
            'Safety Circle Empty',
            'Please add at least one trusted contact with an email address.'
          );


          return;

        }


        // -------------------------------------------------
        // CHECK SPEECH
        // -------------------------------------------------

        if (
          !checkSpeechRecognition()
        ) {

          startingRecognitionRef.current =
            false;

          return;

        }


        // -------------------------------------------------
        // MICROPHONE PERMISSION
        // -------------------------------------------------

        const permission =
          await ExpoSpeechRecognitionModule
            .requestMicrophonePermissionsAsync();


        if (
          !permission.granted
        ) {

          startingRecognitionRef.current =
            false;


          Alert.alert(
            'Permission Required',
            'Please allow microphone permission.'
          );


          return;

        }


        // -------------------------------------------------
        // STOP OLD SPEECH SESSION
        // -------------------------------------------------

        try {

          ExpoSpeechRecognitionModule.stop();

        } catch (error) {}


        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              700
            )
        );


        // -------------------------------------------------
        // START SPEECH RECOGNITION
        // -------------------------------------------------

        ExpoSpeechRecognitionModule.start({

          lang:
            'en-US',

          interimResults:
            true,

          continuous:
            false,

          maxAlternatives:
            1,

        });


        console.log(
          'VOICE SOS START REQUEST SENT'
        );


      } catch (error) {

        console.log(
          'START VOICE SOS ERROR:',
          error
        );


        startingRecognitionRef.current =
          false;


        setIsListening(false);


        setErrorMessage(
          error?.message ||
          'Unable to start Voice SOS.'
        );

      }

    };


  // =====================================================
  // STOP VOICE SOS
  // =====================================================

  const stopVoiceSOS =
    () => {

      try {

        ExpoSpeechRecognitionModule.stop();

      } catch (error) {}


      recognitionStartedRef.current =
        false;


      startingRecognitionRef.current =
        false;


      setIsListening(false);

      setSpeechStarted(false);

    };


  // =====================================================
  // SEND SOS EMAIL
  // =====================================================

  const sendSOSMessage =
    async (
      location,
      liveUrl
    ) => {

      try {

        if (
          trustedContacts.length === 0
        ) {

          return false;

        }


        if (
          sendingRef.current
        ) {

          return false;

        }


        sendingRef.current =
          true;


        setIsSending(true);


        // -------------------------------------------------
        // EMAIL ADDRESSES
        // -------------------------------------------------

        const emailAddresses =
          trustedContacts

            .map(
              contact =>
                String(
                  contact.email
                ).trim()
            )

            .filter(
              email =>
                email.length > 0
            );


        console.log(
          'EMAIL RECIPIENT COUNT:',
          emailAddresses.length
        );


        // -------------------------------------------------
        // REQUEST BODY
        // -------------------------------------------------

        const requestBody = {

          recipients:
            emailAddresses,

          latitude:
            location.latitude,

          longitude:
            location.longitude,

          accuracy:
            location.accuracy,

          timestamp:
            location.timestamp,

          locationId:
            locationIdRef.current,

          liveLocationUrl:
            liveUrl,

        };


        console.log(
          '================================'
        );


        console.log(
          '📍 LOCATION BEING SENT TO SERVER'
        );


        console.log(
          'Latitude:',
          location.latitude
        );


        console.log(
          'Longitude:',
          location.longitude
        );


        console.log(
          'Accuracy:',
          location.accuracy
        );


        console.log(
          'Location ID:',
          locationIdRef.current
        );


        console.log(
          'Live URL:',
          liveUrl
        );


        console.log(
          '================================'
        );


        // -------------------------------------------------
        // SEND EMAIL
        // -------------------------------------------------

        const response =
          await fetch(
            SOS_SERVER,
            {

              method:
                'POST',

              headers: {

                'Content-Type':
                  'application/json',

                'Accept':
                  'application/json',

                'ngrok-skip-browser-warning':
                  'true',

              },

              body:
                JSON.stringify(
                  requestBody
                ),

            }
          );


        const responseText =
          await response.text();


        console.log(
          'SERVER STATUS:',
          response.status
        );


        console.log(
          'SERVER RESPONSE:',
          responseText
        );


        let result;


        try {

          result =
            JSON.parse(
              responseText
            );

        } catch (error) {

          throw new Error(
            'Server returned an invalid response.'
          );

        }


        if (
          !response.ok ||
          !result.success
        ) {

          throw new Error(
            result.message ||
            'SOS email could not be sent.'
          );

        }


        return true;


      } catch (error) {

        console.log(
          'SOS EMAIL ERROR:',
          error
        );


        Alert.alert(
          'SOS Email Failed',
          error?.message ||
          'Unable to send SOS email.'
        );


        return false;


      } finally {

        sendingRef.current =
          false;


        setIsSending(false);

      }

    };


  // =====================================================
  // ACTIVATE SOS
  // =====================================================

  const activateSOS =
    async (
      spokenText
    ) => {

      if (
        sosTriggeredRef.current
      ) {

        return;

      }


      // -------------------------------------------------
      // LOCK SOS
      // -------------------------------------------------

      sosTriggeredRef.current =
        true;


      setSosTriggered(
        true
      );


      console.log(
        '================================'
      );


      console.log(
        '🚨 VOICE SOS TRIGGERED'
      );


      console.log(
        'COMMAND:',
        spokenText
      );


      console.log(
        '================================'
      );


      // -------------------------------------------------
      // STOP SPEECH
      // -------------------------------------------------

      try {

        ExpoSpeechRecognitionModule.stop();

      } catch (error) {}


      recognitionStartedRef.current =
        false;


      startingRecognitionRef.current =
        false;


      // =================================================
      // GET CURRENT DEVICE LOCATION
      // =================================================

      console.log(
        '📍 GETTING BRAND NEW CURRENT DEVICE LOCATION'
      );


      const location =
        await getFreshCurrentLocation();


      // -------------------------------------------------
      // LOCATION FAILED
      // -------------------------------------------------

      if (
        location.latitude === null ||
        location.longitude === null
      ) {

        Alert.alert(
          'Location Error',
          location.error ||
          'Unable to get current location.'
        );


        sosTriggeredRef.current =
          false;


        setSosTriggered(
          false
        );


        return;

      }


      console.log(
        '================================'
      );


      console.log(
        'FINAL CURRENT DEVICE LOCATION'
      );


      console.log(
        'Latitude:',
        location.latitude
      );


      console.log(
        'Longitude:',
        location.longitude
      );


      console.log(
        'Accuracy:',
        location.accuracy
      );


      console.log(
        '================================'
      );


      // =================================================
      // CREATE LIVE LOCATION SESSION
      // =================================================

      const liveSession =
        await createLiveLocationSession(
          location
        );


      if (
        !liveSession.success
      ) {

        Alert.alert(
          'Live Location Error',
          liveSession.error ||
          'Unable to create live location.'
        );


        sosTriggeredRef.current =
          false;


        setSosTriggered(
          false
        );


        return;

      }


      // =================================================
      // SEND SOS EMAIL
      // =================================================

      const sent =
        await sendSOSMessage(

          location,

          liveSession.liveLocationUrl

        );


      if (!sent) {

        sosTriggeredRef.current =
          false;


        setSosTriggered(
          false
        );


        return;

      }


      // =================================================
      // START CONTINUOUS LOCATION TRACKING
      // =================================================

      await startLiveLocationTracking();


      // =================================================
      // SUCCESS
      // =================================================

      Alert.alert(

        '🚨 SOS SENT',

        'SOS email has been sent to all Safety Circle contacts.\n\nThe live location is now being updated continuously.',

        [

          {
            text:
              'OK',

          },

        ]

      );

    };


  // =====================================================
  // RESET
  // =====================================================

  const resetVoiceSOS =
    () => {

      try {

        ExpoSpeechRecognitionModule.stop();

      } catch (error) {}


      stopLiveLocationTracking();


      recognitionStartedRef.current =
        false;


      startingRecognitionRef.current =
        false;


      sosTriggeredRef.current =
        false;


      sendingRef.current =
        false;


      locationIdRef.current =
        null;


      setIsListening(false);

      setSpeechStarted(false);

      setRecognizedText('');

      setErrorMessage('');

      setSosTriggered(false);

      setIsSending(false);

      setLatitude(null);

      setLongitude(null);

      setGpsAccuracy(null);

      setLiveLocationUrl('');

      setLiveLocationActive(false);

    };


  // =====================================================
  // CLEANUP
  // =====================================================

  useEffect(() => {

    return () => {

      try {

        ExpoSpeechRecognitionModule.stop();

      } catch (error) {}


      if (
        locationWatcherRef.current
      ) {

        locationWatcherRef.current.remove();

        locationWatcherRef.current =
          null;

      }

    };

  }, []);


  // =====================================================
  // UI
  // =====================================================

  return (

    <View
      style={
        styles.container
      }
    >

      {/* HEADER */}

      <View
        style={
          styles.header
        }
      >

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >

          <Text
            style={
              styles.backText
            }
          >
            ‹
          </Text>

        </TouchableOpacity>


        <View>

          <Text
            style={
              styles.title
            }
          >
            Voice SOS
          </Text>


          <Text
            style={
              styles.contactText
            }
          >
            Safety Circle
          </Text>

        </View>

      </View>


      {/* CONTENT */}

      <ScrollView
        style={
          styles.scrollView
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >


        {/* MICROPHONE */}

        <View
          style={[

            styles.microphoneCircle,

            isListening &&
              styles.listeningCircle,

            sosTriggered &&
              styles.sosCircle,

          ]}
        >

          <Text
            style={
              styles.microphone
            }
          >

            {sosTriggered
              ? '🚨'
              : '🎤'}

          </Text>

        </View>


        {/* HEADING */}

        <Text
          style={
            styles.heading
          }
        >

          {sosTriggered
            ? '🚨 SOS Activated'
            : isListening
            ? 'Voice SOS Active'
            : 'Voice SOS'}

        </Text>


        <Text
          style={
            styles.description
          }
        >

          {sosTriggered
            ? 'Your SOS has been sent and live location is being updated.'
            : isListening
            ? 'Speak clearly. Sakhi RakshaMitra is listening.'
            : 'Press START and speak your emergency command.'}

        </Text>


        {/* SENDING */}

        {isSending && (

          <View
            style={
              styles.sendingContainer
            }
          >

            <ActivityIndicator
              size="large"
              color="#C62828"
            />

            <Text
              style={
                styles.sendingText
              }
            >

              Sending SOS email...

            </Text>

          </View>

        )}


        {/* LISTENING */}

        {isListening && (

          <View
            style={
              styles.listeningContainer
            }
          >

            <ActivityIndicator
              size="large"
              color="#C62828"
            />

            <Text
              style={
                styles.listeningText
              }
            >

              {speechStarted
                ? '🎙️ Hearing your voice...'
                : '🎤 Listening... Speak now'}

            </Text>

          </View>

        )}


        {/* SPEECH */}

        <View
          style={
            styles.resultBox
          }
        >

          <Text
            style={
              styles.resultTitle
            }
          >
            Recognized Speech
          </Text>


          <Text
            style={[

              styles.resultText,

              !recognizedText &&
                styles.placeholderText,

            ]}
          >

            {recognizedText
              ? `"${recognizedText}"`
              : 'Your spoken words will appear here.'}

          </Text>

        </View>


        {/* LOCATION */}

        <View
          style={
            styles.locationBox
          }
        >

          <Text
            style={
              styles.locationTitle
            }
          >

            📍 Current Location

          </Text>


          {latitude !== null &&
          longitude !== null ? (

            <>

              <Text
                style={
                  styles.locationText
                }
              >

                Latitude:
                {' '}
                {latitude}

              </Text>


              <Text
                style={
                  styles.locationText
                }
              >

                Longitude:
                {' '}
                {longitude}

              </Text>


              {gpsAccuracy !== null && (

                <Text
                  style={
                    styles.locationText
                  }
                >

                  GPS Accuracy:
                  {' '}
                  approximately {gpsAccuracy} meters

                </Text>

              )}


              <Text
                style={
                  styles.locationLink
                }
              >

                https://www.google.com/maps?q=
                {latitude},{longitude}

              </Text>

            </>

          ) : (

            <Text
              style={
                styles.locationUnavailable
              }
            >

              Current device location will appear after SOS is triggered.

            </Text>

          )}

        </View>


        {/* LIVE LOCATION */}

        {liveLocationActive &&
        liveLocationUrl !== '' && (

          <View
            style={
              styles.liveBox
            }
          >

            <Text
              style={
                styles.liveTitle
              }
            >

              🔴 Live Location Active

            </Text>


            <Text
              style={
                styles.liveText
              }
            >

              Your Safety Circle can open the live-location link from the SOS email.

            </Text>


            <Text
              style={
                styles.liveUrl
              }
            >

              {liveLocationUrl}

            </Text>

          </View>

        )}


        {/* COMMANDS */}

        <View
          style={
            styles.commandBox
          }
        >

          <Text
            style={
              styles.commandTitle
            }
          >

            Emergency Voice Commands

          </Text>


          <Text
            style={
              styles.command
            }
          >
            • "SOS"
          </Text>


          <Text
            style={
              styles.command
            }
          >
            • "Help"
          </Text>


          <Text
            style={
              styles.command
            }
          >
            • "Help me"
          </Text>


          <Text
            style={
              styles.command
            }
          >
            • "Emergency"
          </Text>


          <Text
            style={
              styles.command
            }
          >
            • "Save me"
          </Text>

        </View>


        {/* ERROR */}

        {errorMessage !== '' && (

          <View
            style={
              styles.errorBox
            }
          >

            <Text
              style={
                styles.errorTitle
              }
            >

              Voice SOS

            </Text>


            <Text
              style={
                styles.errorText
              }
            >

              {errorMessage}

            </Text>

          </View>

        )}


        {/* START */}

        {!isListening &&
        !sosTriggered &&
        !isSending && (

          <TouchableOpacity
            style={
              styles.startButton
            }
            onPress={
              startVoiceSOS
            }
          >

            <Text
              style={
                styles.startButtonText
              }
            >

              🎤 START VOICE SOS

            </Text>

          </TouchableOpacity>

        )}


        {/* STOP */}

        {isListening && (

          <TouchableOpacity
            style={
              styles.stopButton
            }
            onPress={
              stopVoiceSOS
            }
          >

            <Text
              style={
                styles.stopButtonText
              }
            >

              🛑 STOP VOICE SOS

            </Text>

          </TouchableOpacity>

        )}


        {/* RESET */}

        {sosTriggered &&
        !isSending && (

          <TouchableOpacity
            style={
              styles.resetButton
            }
            onPress={
              resetVoiceSOS
            }
          >

            <Text
              style={
                styles.resetButtonText
              }
            >

              ↻ RESET VOICE SOS

            </Text>

          </TouchableOpacity>

        )}


        {/* SAFETY CIRCLE */}

        <View
          style={
            styles.contactBox
          }
        >

          <Text
            style={
              styles.contactTitle
            }
          >

            Safety Circle

          </Text>


          <Text
            style={
              styles.contactName
            }
          >

            {trustedContacts.length}

          </Text>


          <Text
            style={
              styles.contactDetails
            }
          >

            trusted contact
            {trustedContacts.length === 1
              ? ''
              : 's'} with email

          </Text>

        </View>


        {/* INFO */}

        <View
          style={
            styles.infoBox
          }
        >

          <Text
            style={
              styles.infoTitle
            }
          >

            How Voice SOS Works

          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            1. Press START VOICE SOS.
          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            2. Speak an emergency command.
          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            3. The emergency phrase is recognized.
          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            4. The app obtains your current device GPS location.
          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            5. A live-location session is created.
          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            6. SOS email is sent to all Safety Circle email addresses.
          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            7. Other recipients remain hidden using BCC.
          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            8. The receiver can open the live-location link on their phone.
          </Text>


          <Text
            style={
              styles.infoText
            }
          >
            9. The current device location is continuously updated while SOS is active.
          </Text>

        </View>


        <View
          style={
            styles.bottomSpace
          }
        />

      </ScrollView>

    </View>

  );

}


// =====================================================
// STYLES
// =====================================================

const styles =
  StyleSheet.create({

    container: {

      flex: 1,

      backgroundColor: '#F7F7F7',

    },


    header: {

      height: 80,

      backgroundColor: '#C62828',

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 18,

    },


    backButton: {

      width: 45,

      height: 45,

      justifyContent: 'center',

      alignItems: 'center',

      marginRight: 10,

    },


    backText: {

      fontSize: 40,

      color: '#FFFFFF',

      lineHeight: 40,

    },


    title: {

      fontSize: 22,

      fontWeight: '700',

      color: '#FFFFFF',

    },


    contactText: {

      marginTop: 2,

      fontSize: 13,

      color: '#FFEAEA',

    },


    scrollView: {

      flex: 1,

    },


    content: {

      padding: 20,

      paddingBottom: 60,

      alignItems: 'center',

    },


    bottomSpace: {

      height: 30,

      width: '100%',

    },


    microphoneCircle: {

      width: 130,

      height: 130,

      borderRadius: 65,

      backgroundColor: '#FFEBEE',

      justifyContent: 'center',

      alignItems: 'center',

      marginTop: 20,

      borderWidth: 5,

      borderColor: '#EF9A9A',

    },


    listeningCircle: {

      backgroundColor: '#FFCDD2',

      borderColor: '#C62828',

    },


    sosCircle: {

      backgroundColor: '#FFCDD2',

      borderColor: '#B71C1C',

    },


    microphone: {

      fontSize: 55,

    },


    heading: {

      fontSize: 25,

      fontWeight: '700',

      color: '#333333',

      marginTop: 18,

      textAlign: 'center',

    },


    description: {

      fontSize: 15,

      color: '#666666',

      textAlign: 'center',

      marginTop: 8,

      marginBottom: 15,

      lineHeight: 22,

    },


    listeningContainer: {

      alignItems: 'center',

      marginVertical: 10,

    },


    listeningText: {

      marginTop: 8,

      fontSize: 15,

      fontWeight: '600',

      color: '#C62828',

    },


    sendingContainer: {

      alignItems: 'center',

      marginVertical: 15,

    },


    sendingText: {

      marginTop: 8,

      fontSize: 15,

      fontWeight: '600',

      color: '#C62828',

    },


    resultBox: {

      width: '100%',

      backgroundColor: '#FFFFFF',

      borderRadius: 15,

      padding: 18,

      marginTop: 15,

      borderWidth: 1,

      borderColor: '#E0E0E0',

    },


    resultTitle: {

      fontSize: 18,

      fontWeight: '700',

      color: '#333333',

      marginBottom: 10,

    },


    resultText: {

      fontSize: 17,

      color: '#222222',

      lineHeight: 25,

    },


    placeholderText: {

      color: '#999999',

      fontSize: 15,

    },


    locationBox: {

      width: '100%',

      backgroundColor: '#FFFFFF',

      borderRadius: 15,

      padding: 18,

      marginTop: 15,

      borderWidth: 1,

      borderColor: '#E0E0E0',

    },


    locationTitle: {

      fontSize: 18,

      fontWeight: '700',

      color: '#333333',

      marginBottom: 10,

    },


    locationText: {

      fontSize: 14,

      color: '#555555',

      marginTop: 5,

      lineHeight: 21,

    },


    locationLink: {

      fontSize: 13,

      color: '#1565C0',

      marginTop: 10,

      lineHeight: 20,

    },


    locationUnavailable: {

      fontSize: 14,

      color: '#888888',

      lineHeight: 21,

    },


    liveBox: {

      width: '100%',

      backgroundColor: '#FFF8F8',

      borderRadius: 15,

      padding: 18,

      marginTop: 15,

      borderWidth: 1,

      borderColor: '#EF9A9A',

    },


    liveTitle: {

      fontSize: 18,

      fontWeight: '700',

      color: '#B71C1C',

      marginBottom: 8,

    },


    liveText: {

      fontSize: 14,

      color: '#555555',

      lineHeight: 21,

    },


    liveUrl: {

      fontSize: 12,

      color: '#1565C0',

      marginTop: 10,

      lineHeight: 18,

    },


    commandBox: {

      width: '100%',

      backgroundColor: '#FFF8F8',

      borderRadius: 15,

      padding: 18,

      marginTop: 15,

      borderWidth: 1,

      borderColor: '#FFCDD2',

    },


    commandTitle: {

      fontSize: 17,

      fontWeight: '700',

      color: '#B71C1C',

      marginBottom: 8,

    },


    command: {

      fontSize: 15,

      color: '#333333',

      marginTop: 5,

    },


    errorBox: {

      width: '100%',

      backgroundColor: '#FFEBEE',

      borderRadius: 15,

      padding: 18,

      marginTop: 15,

      borderWidth: 1,

      borderColor: '#EF9A9A',

    },


    errorTitle: {

      fontSize: 17,

      fontWeight: '700',

      color: '#B71C1C',

      marginBottom: 6,

    },


    errorText: {

      fontSize: 14,

      color: '#7F0000',

      lineHeight: 21,

    },


    startButton: {

      width: '100%',

      backgroundColor: '#C62828',

      paddingVertical: 18,

      borderRadius: 14,

      marginTop: 20,

      alignItems: 'center',

    },


    startButtonText: {

      color: '#FFFFFF',

      fontSize: 17,

      fontWeight: '700',

    },


    stopButton: {

      width: '100%',

      backgroundColor: '#424242',

      paddingVertical: 18,

      borderRadius: 14,

      marginTop: 20,

      alignItems: 'center',

    },


    stopButtonText: {

      color: '#FFFFFF',

      fontSize: 17,

      fontWeight: '700',

    },


    resetButton: {

      width: '100%',

      backgroundColor: '#757575',

      paddingVertical: 16,

      borderRadius: 14,

      marginTop: 15,

      alignItems: 'center',

    },


    resetButtonText: {

      color: '#FFFFFF',

      fontSize: 16,

      fontWeight: '700',

    },


    contactBox: {

      width: '100%',

      backgroundColor: '#FFFFFF',

      borderRadius: 15,

      padding: 18,

      marginTop: 20,

      borderWidth: 1,

      borderColor: '#E0E0E0',

    },


    contactTitle: {

      fontSize: 17,

      fontWeight: '700',

      color: '#333333',

      marginBottom: 8,

    },


    contactName: {

      fontSize: 22,

      fontWeight: '700',

      color: '#C62828',

    },


    contactDetails: {

      fontSize: 14,

      color: '#666666',

      marginTop: 4,

    },


    infoBox: {

      width: '100%',

      backgroundColor: '#FFFFFF',

      borderRadius: 15,

      padding: 18,

      marginTop: 20,

    },


    infoTitle: {

      fontSize: 18,

      fontWeight: '700',

      color: '#333333',

      marginBottom: 10,

    },


    infoText: {

      fontSize: 14,

      color: '#555555',

      lineHeight: 22,

      marginBottom: 5,

    },

  });