import React, { useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Share,
  Linking,
  ActivityIndicator,
} from "react-native";

import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";


// ======================================================
// CONFIGURATION
// ======================================================

// Android emulator -> computer localhost
// Physical Android phone -> replace 10.0.2.2 with your PC IP
const SERVER_URL = "http://10.0.2.2:5000";


// Your existing Safety Circle storage key
const CONTACTS_STORAGE_KEY = "@sakhi_trusted_contacts";


// Route deviation distance
const DEVIATION_LIMIT_METERS = 120;


// ======================================================
// COLLEGE CAMPUS DEMO DESTINATION
// ======================================================
//
// IMPORTANT:
// Put your actual college campus latitude/longitude here.
//
// For now this is a Pune demo destination.
// You can change ONLY these two values later.
//
// ======================================================

const COLLEGE_DESTINATION = {
  name: "College Campus",
  latitude: 18.5204,
  longitude: 73.8567,
};


// ======================================================
// MAP HTML
// ======================================================

const createMapHTML = () => {
  return `
<!DOCTYPE html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
/>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>

<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
</script>

<style>

html,
body,
#map {
  width:100%;
  height:100%;
  margin:0;
  padding:0;
}

.leaflet-control-attribution {
  font-size:8px;
}

.start-label {
  background:white;
  border:1px solid #777;
  padding:3px 6px;
  border-radius:5px;
  font-size:11px;
}

</style>

</head>

<body>

<div id="map"></div>

<script>

const map = L.map("map", {
  zoomControl: true
}).setView([18.5204, 73.8567], 15);


// OpenStreetMap
L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(map);


let userMarker = null;
let destinationMarker = null;

let plannedRoute = null;
let travelledRoute = null;

let currentPosition = null;
let destinationPosition = null;


// ======================================================
// Destination marker
// ======================================================

function setDestination(lat, lng, name) {

  destinationPosition = [lat, lng];

  if (destinationMarker) {
    map.removeLayer(destinationMarker);
  }

  destinationMarker = L.marker(
    [lat, lng]
  ).addTo(map);

  destinationMarker.bindPopup(
    "<b>🎓 " + name + "</b><br>Destination"
  );

}


// ======================================================
// Current GPS marker
// ======================================================

function updateUser(lat, lng) {

  currentPosition = [lat, lng];

  if (!userMarker) {

    userMarker = L.marker(
      [lat, lng]
    ).addTo(map);

    userMarker.bindPopup(
      "<b>📍 Current Location</b>"
    );

  } else {

    userMarker.setLatLng(
      [lat, lng]
    );

  }

}


// ======================================================
// Planned route
// ======================================================

function drawPlannedRoute(coords) {

  if (plannedRoute) {
    map.removeLayer(plannedRoute);
  }

  const points = coords.map(
    p => [p[1], p[0]]
  );

  plannedRoute = L.polyline(
    points,
    {
      color: "#1976ff",
      weight: 6,
      opacity: 0.85
    }
  ).addTo(map);

}


// ======================================================
// Actual travelled route
// ======================================================

function drawTravelledRoute(coords) {

  if (travelledRoute) {
    map.removeLayer(travelledRoute);
  }

  const points = coords.map(
    p => [p.latitude, p.longitude]
  );

  if (points.length < 2) {
    return;
  }

  travelledRoute = L.polyline(
    points,
    {
      color: "#7b1fa2",
      weight: 5,
      opacity: 0.9
    }
  ).addTo(map);

}


// ======================================================
// Fit route on map
// ======================================================

function fitRoute() {

  const layers = [];

  if (plannedRoute) {
    layers.push(plannedRoute);
  }

  if (userMarker) {
    layers.push(userMarker);
  }

  if (destinationMarker) {
    layers.push(destinationMarker);
  }

  if (layers.length > 0) {

    const group = L.featureGroup(layers);

    map.fitBounds(
      group.getBounds().pad(0.15)
    );

  }

}


// ======================================================
// Messages from React Native
// ======================================================

document.addEventListener(
  "message",
  function(event) {

    try {

      const data = JSON.parse(event.data);

      if (data.type === "LOCATION") {

        updateUser(
          data.latitude,
          data.longitude
        );

      }


      if (data.type === "DESTINATION") {

        setDestination(
          data.latitude,
          data.longitude,
          data.name
        );

      }


      if (data.type === "PLANNED_ROUTE") {

        drawPlannedRoute(
          data.coordinates
        );

        fitRoute();

      }


      if (data.type === "TRAVELLED_ROUTE") {

        drawTravelledRoute(
          data.coordinates
        );

      }

    } catch (error) {

      console.log(
        "MAP MESSAGE ERROR",
        error
      );

    }

  }
);


window.ReactNativeWebView &&
window.ReactNativeWebView.postMessage(
  JSON.stringify({
    type: "MAP_READY"
  })
);

</script>

</body>

</html>
`;
};


// ======================================================
// MAIN SCREEN
// ======================================================

export default function LiveLocationScreen() {

  const webViewRef = useRef(null);

  const locationSubscription =
    useRef(null);

  const timerRef =
    useRef(null);

  const alertSentRef =
    useRef(false);


  const [destinationText, setDestinationText] =
    useState(COLLEGE_DESTINATION.name);


  const [currentLocation, setCurrentLocation] =
    useState(null);


  const [plannedRoute, setPlannedRoute] =
    useState([]);


  const [travelledPath, setTravelledPath] =
    useState([]);


  const [journeyStarted, setJourneyStarted] =
    useState(false);


  const [loadingRoute, setLoadingRoute] =
    useState(false);


  const [safetyStatus, setSafetyStatus] =
    useState("Normal");


  const [deviationDistance, setDeviationDistance] =
    useState(0);


  const [journeySeconds, setJourneySeconds] =
    useState(0);


  const [routeDistance, setRouteDistance] =
    useState(0);


  const [estimatedMinutes, setEstimatedMinutes] =
    useState(0);


  const [timeline, setTimeline] =
    useState([]);


  const [contacts, setContacts] =
    useState([]);


  const [alertVisible, setAlertVisible] =
    useState(false);


  // ====================================================
  // LOAD SAFETY CIRCLE
  // ====================================================

  useEffect(() => {

    loadContacts();

    return () => {

      stopLocationTracking();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

    };

  }, []);


  const loadContacts = async () => {

    try {

      const saved =
        await AsyncStorage.getItem(
          CONTACTS_STORAGE_KEY
        );

      if (!saved) {

        console.log(
          "SAVED SAFETY CIRCLE CONTACTS: NONE"
        );

        setContacts([]);

        return;
      }

      const parsed =
        JSON.parse(saved);

      if (Array.isArray(parsed)) {

        setContacts(parsed);

        console.log(
          "SAVED SAFETY CIRCLE CONTACTS:",
          parsed
        );

      }

    } catch (error) {

      console.log(
        "CONTACT LOAD ERROR",
        error
      );

    }

  };


  // ====================================================
  // MAP SEND
  // ====================================================

  const sendToMap = (data) => {

    if (!webViewRef.current) {
      return;
    }

    webViewRef.current.injectJavaScript(
      `
      window.dispatchEvent(
        new MessageEvent(
          "message",
          {
            data: ${JSON.stringify(
              JSON.stringify(data)
            )}
          }
        )
      );
      true;
      `
    );

  };


  // ====================================================
  // GET CURRENT LOCATION
  // ====================================================

  const getCurrentLocation = async () => {

    const permission =
      await Location.requestForegroundPermissionsAsync();

    if (
      permission.status !== "granted"
    ) {

      Alert.alert(
        "Location Permission",
        "Please allow location permission to track the journey."
      );

      return null;
    }


    const location =
      await Location.getCurrentPositionAsync({
        accuracy:
          Location.Accuracy.Highest,
      });


    return location;

  };


  // ====================================================
  // DISTANCE BETWEEN TWO GPS POINTS
  // ====================================================

  const calculateDistance = (
    lat1,
    lon1,
    lat2,
    lon2
  ) => {

    const R = 6371000;

    const dLat =
      ((lat2 - lat1) * Math.PI) /
      180;

    const dLon =
      ((lon2 - lon1) * Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

      Math.cos(
        (lat1 * Math.PI) / 180
      ) *

      Math.cos(
        (lat2 * Math.PI) / 180
      ) *

      Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;

  };


  // ====================================================
  // GET DISTANCE FROM ROUTE
  // ====================================================

  const getDistanceFromRoute = (
    location,
    route
  ) => {

    if (
      !location ||
      !route ||
      route.length === 0
    ) {
      return 0;
    }


    let minimum =
      Number.MAX_SAFE_INTEGER;


    for (
      let i = 0;
      i < route.length;
      i++
    ) {

      const point =
        route[i];


      const distance =
        calculateDistance(
          location.latitude,
          location.longitude,
          point[1],
          point[0]
        );


      if (
        distance < minimum
      ) {

        minimum =
          distance;

      }

    }


    return Math.round(minimum);

  };


  // ====================================================
  // FETCH REAL ROAD ROUTE
  // ====================================================

  const fetchRoute = async (
    startLat,
    startLng,
    destinationLat,
    destinationLng
  ) => {

    try {

      setLoadingRoute(true);


      // OSRM does not require an API key.
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${startLng},${startLat};` +
        `${destinationLng},${destinationLat}` +
        `?overview=full&geometries=geojson`;


      const response =
        await fetch(url);


      if (!response.ok) {
        throw new Error(
          "Route server unavailable"
        );
      }


      const data =
        await response.json();


      if (
        data.code !== "Ok" ||
        !data.routes ||
        !data.routes.length
      ) {

        throw new Error(
          "No road route found"
        );

      }


      const route =
        data.routes[0];


      const coordinates =
        route.geometry.coordinates;


      setPlannedRoute(
        coordinates
      );


      const distanceKm =
        route.distance / 1000;


      const durationMin =
        Math.ceil(
          route.duration / 60
        );


      setRouteDistance(
        distanceKm.toFixed(2)
      );


      setEstimatedMinutes(
        durationMin
      );


      sendToMap({
        type: "PLANNED_ROUTE",
        coordinates,
      });


      addTimeline(
        "Planned road route created"
      );


      return coordinates;

    } catch (error) {

      console.log(
        "ROUTE ERROR",
        error
      );


      Alert.alert(
        "Route Error",
        "Unable to load the road route. Please check internet connection."
      );


      return [];

    } finally {

      setLoadingRoute(false);

    }

  };


  // ====================================================
  // START JOURNEY
  // ====================================================

  const startJourney = async () => {

    if (journeyStarted) {
      return;
    }


    const location =
      await getCurrentLocation();


    if (!location) {
      return;
    }


    const start = {
      latitude:
        location.coords.latitude,

      longitude:
        location.coords.longitude,
    };


    setCurrentLocation(
      start
    );


    setTravelledPath([
      start
    ]);


    sendToMap({
      type: "LOCATION",
      latitude: start.latitude,
      longitude: start.longitude,
    });


    sendToMap({
      type: "DESTINATION",
      latitude:
        COLLEGE_DESTINATION.latitude,
      longitude:
        COLLEGE_DESTINATION.longitude,
      name:
        destinationText,
    });


    addTimeline(
      "Journey started"
    );


    const route =
      await fetchRoute(
        start.latitude,
        start.longitude,

        COLLEGE_DESTINATION.latitude,
        COLLEGE_DESTINATION.longitude
      );


    if (!route.length) {
      return;
    }


    alertSentRef.current =
      false;


    setSafetyStatus(
      "Normal"
    );


    setJourneyStarted(
      true
    );


    setJourneySeconds(
      0
    );


    // ==================================================
    // JOURNEY TIMER
    // ==================================================

    timerRef.current =
      setInterval(() => {

        setJourneySeconds(
          previous =>
            previous + 1
        );

      }, 1000);


    // ==================================================
    // LIVE GPS TRACKING
    // ==================================================

    locationSubscription.current =
      await Location.watchPositionAsync(

        {
          accuracy:
            Location.Accuracy.Highest,

          timeInterval:
            4000,

          distanceInterval:
            5,
        },

        async (newLocation) => {

          const point = {

            latitude:
              newLocation.coords.latitude,

            longitude:
              newLocation.coords.longitude,

          };


          setCurrentLocation(
            point
          );


          // ============================================
          // ACTUAL TRAVELLED PATH
          // ============================================

          setTravelledPath(
            previous => {

              const updated = [
                ...previous,
                point,
              ];


              sendToMap({
                type:
                  "TRAVELLED_ROUTE",

                coordinates:
                  updated,
              });


              return updated;

            }
          );


          // ============================================
          // UPDATE MAP MARKER
          // ============================================

          sendToMap({
            type: "LOCATION",

            latitude:
              point.latitude,

            longitude:
              point.longitude,

          });


          // ============================================
          // ROUTE DEVIATION
          // ============================================

          const distance =
            getDistanceFromRoute(
              point,
              route
            );


          setDeviationDistance(
            distance
          );


          // ============================================
          // OFF ROUTE
          // ============================================

          if (
            distance >=
            DEVIATION_LIMIT_METERS
          ) {

            if (
              !alertSentRef.current
            ) {

              alertSentRef.current =
                true;


              setSafetyStatus(
                "Concern"
              );


              addTimeline(
                `⚠️ Route deviation detected (${distance} m)`
              );


              await sendSafetyCircleAlert(
                point,
                distance
              );


              setAlertVisible(
                true
              );

            }

          } else {

            if (
              safetyStatus !==
              "Emergency"
            ) {

              setSafetyStatus(
                "Normal"
              );

            }

          }

        }

      );

  };


  // ====================================================
  // STOP TRACKING
  // ====================================================

  const stopLocationTracking = () => {

    if (
      locationSubscription.current
    ) {

      locationSubscription.current.remove();

      locationSubscription.current =
        null;

    }


    if (timerRef.current) {

      clearInterval(
        timerRef.current
      );

      timerRef.current =
        null;

    }

  };


  // ====================================================
  // END JOURNEY
  // ====================================================

  const endJourney = () => {

    stopLocationTracking();

    setJourneyStarted(
      false
    );

    setSafetyStatus(
      "Normal"
    );

    addTimeline(
      "Journey monitoring stopped"
    );

    Alert.alert(
      "Journey Completed",
      "Route monitoring has been stopped."
    );

  };


  // ====================================================
  // SEND ALERT TO SAFETY CIRCLE
  // ====================================================

  const sendSafetyCircleAlert = async (
    location,
    deviation
  ) => {

    const time =
      new Date().toLocaleString();


    const message =
      `🚨 SAKHI RAKSHAMITRA ALERT

Route deviation detected.

Current location:
https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}

Destination:
${destinationText}

Distance away from planned route:
${deviation} meters

Time:
${time}

Please check whether the user is safe.`;


    addTimeline(
      "🚨 Safety Circle alert sending..."
    );


    // ================================================
    // SEND TO EVERY SAFETY CIRCLE CONTACT
    // ================================================

    if (
      contacts.length === 0
    ) {

      addTimeline(
        "⚠️ No Safety Circle contacts found"
      );

      return;

    }


    let sentCount = 0;


    for (
      const contact of contacts
    ) {

      try {

        const trustedNumber =
          contact.phone ||
          contact.number ||
          contact.mobile ||
          "";


        const trustedEmail =
          contact.email ||
          "";


        // ============================================
        // EXISTING SERVER ENDPOINT
        // ============================================

        const response =
          await fetch(
            `${SERVER_URL}/send-sos`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                trustedNumber,

                trustedEmail,

                message,

                latitude:
                  location.latitude,

                longitude:
                  location.longitude,

                destination:
                  destinationText,

                deviation:

                  deviation,

              }),

            }
          );


        const result =
          await response.json();


        console.log(
          "SAFETY CIRCLE ALERT RESULT:",
          result
        );


        if (
          result.success
        ) {

          sentCount++;

        }

      } catch (error) {

        console.log(
          "ALERT SEND ERROR:",
          error
        );

      }

    }


    if (
      sentCount > 0
    ) {

      addTimeline(
        `✅ Safety Circle alert sent to ${sentCount} contact(s)`
      );

    } else {

      addTimeline(
        "⚠️ Alert request could not reach server"
      );

    }

  };


  // ====================================================
  // I AM SAFE
  // ====================================================

  const userIsSafe = () => {

    setSafetyStatus(
      "Normal"
    );


    setAlertVisible(
      false
    );


    alertSentRef.current =
      false;


    addTimeline(
      "✅ User confirmed: I am Safe"
    );


    Alert.alert(
      "You're Safe",
      "Safety Circle has been informed that you are safe."
    );

  };


  // ====================================================
  // CALL ME
  // ====================================================

  const callMe = async () => {

    setAlertVisible(
      false
    );


    setSafetyStatus(
      "Concern"
    );


    addTimeline(
      "📞 User requested a safety call"
    );


    const firstContact =
      contacts[0];


    const phone =
      firstContact?.phone ||
      firstContact?.number ||
      firstContact?.mobile;


    if (!phone) {

      Alert.alert(
        "No Contact",
        "No phone number is available in Safety Circle."
      );

      return;

    }


    try {

      await Linking.openURL(
        `tel:${phone}`
      );

    } catch (error) {

      Alert.alert(
        "Call Error",
        "Unable to open phone application."
      );

    }

  };


  // ====================================================
  // NEED ASSISTANCE
  // ====================================================

  const needAssistance = async () => {

    setAlertVisible(
      false
    );


    setSafetyStatus(
      "Concern"
    );


    addTimeline(
      "🆘 User requested assistance"
    );


    if (
      currentLocation
    ) {

      await sendSafetyCircleAlert(
        currentLocation,
        deviationDistance
      );

    }


    Alert.alert(
      "Assistance Requested",
      "Safety Circle has been alerted."
    );

  };


  // ====================================================
  // EMERGENCY
  // ====================================================

  const emergency = async () => {

    setAlertVisible(
      false
    );


    setSafetyStatus(
      "Emergency"
    );


    addTimeline(
      "🚨 EMERGENCY activated"
    );


    if (
      currentLocation
    ) {

      await sendSafetyCircleAlert(
        currentLocation,
        deviationDistance
      );

    }


    Alert.alert(
      "Emergency Alert",
      "Emergency alert has been sent to the Safety Circle."
    );

  };


  // ====================================================
  // SHARE CURRENT LOCATION
  // ====================================================

  const shareLocation = async () => {

    if (
      !currentLocation
    ) {

      Alert.alert(
        "Location Unavailable",
        "Start the journey first."
      );

      return;

    }


    const link =
      `https://www.google.com/maps/search/?api=1&query=` +
      `${currentLocation.latitude},${currentLocation.longitude}`;


    const message =
      `📍 My current location

${link}

Destination:
${destinationText}

Safety status:
${safetyStatus}`;


    try {

      await Share.share({
        message,
      });


      addTimeline(
        "📤 Current location shared"
      );

    } catch (error) {

      console.log(
        "SHARE ERROR",
        error
      );

    }

  };


  // ====================================================
  // OPEN CURRENT LOCATION
  // ====================================================

  const openLocation = async () => {

    if (
      !currentLocation
    ) {

      return;

    }


    const url =
      `https://www.google.com/maps/search/?api=1&query=` +
      `${currentLocation.latitude},${currentLocation.longitude}`;


    try {

      await Linking.openURL(
        url
      );

    } catch (error) {

      console.log(
        error
      );

    }

  };


  // ====================================================
  // TIMELINE
  // ====================================================

  const addTimeline = (
    text
  ) => {

    const time =
      new Date().toLocaleTimeString();


    setTimeline(
      previous => [
        {
          id:
            Date.now() +
            Math.random(),

          text,

          time,

        },

        ...previous,

      ]
    );

  };


  // ====================================================
  // FORMAT TIME
  // ====================================================

  const formatDuration = (
    seconds
  ) => {

    const h =
      Math.floor(
        seconds / 3600
      );

    const m =
      Math.floor(
        (seconds % 3600) /
        60
      );

    const s =
      seconds % 60;


    if (h > 0) {

      return `${h}h ${m}m ${s}s`;

    }


    return `${m}m ${s}s`;

  };


  // ====================================================
  // RENDER
  // ====================================================

  return (

    <View
      style={styles.container}
    >

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
      >


        {/* ========================================= */}
        {/* HEADER */}
        {/* ========================================= */}

        <View
          style={styles.header}
        >

          <Text
            style={styles.busIcon}
          >
            🚌
          </Text>


          <Text
            style={styles.title}
          >
            Live Route Tracking
          </Text>


          <Text
            style={styles.subtitle}
          >
            Monitor your journey and detect route changes
          </Text>

        </View>


        {/* ========================================= */}
        {/* DESTINATION */}
        {/* ========================================= */}

        <View
          style={styles.card}
        >

          <Text
            style={styles.label}
          >
            🎓 Journey Destination
          </Text>


          <TextInput
            value={
              destinationText
            }
            onChangeText={
              setDestinationText
            }
            style={
              styles.input
            }
            placeholder="College Campus"
          />


          {!journeyStarted ? (

            <TouchableOpacity
              style={
                styles.startButton
              }
              onPress={
                startJourney
              }
            >

              {loadingRoute ? (

                <ActivityIndicator
                  color="#fff"
                />

              ) : (

                <Text
                  style={
                    styles.buttonText
                  }
                >
                  🚌 Start Journey & Track Route
                </Text>

              )}

            </TouchableOpacity>

          ) : (

            <TouchableOpacity
              style={
                styles.stopButton
              }
              onPress={
                endJourney
              }
            >

              <Text
                style={
                  styles.buttonText
                }
              >
                ⏹ Stop Journey
              </Text>

            </TouchableOpacity>

          )}

        </View>


        {/* ========================================= */}
        {/* MAP */}
        {/* ========================================= */}

        <View
          style={styles.mapContainer}
        >

          <WebView
            ref={
              webViewRef
            }

            originWhitelist={[
              "*"
            ]}

            source={{
              html:
                createMapHTML(),
            }}

            javaScriptEnabled={
              true
            }

            domStorageEnabled={
              true
            }

            startInLoadingState={
              true
            }

            renderLoading={() => (

              <View
                style={
                  styles.mapLoading
                }
              >

                <ActivityIndicator
                  size="large"
                />

                <Text>
                  Loading map...
                </Text>

              </View>

            )}

            onError={
              (event) =>
                console.log(
                  "WEBVIEW ERROR",
                  event.nativeEvent
                )
            }

          />

        </View>


        {/* ========================================= */}
        {/* LEGEND */}
        {/* ========================================= */}

        <View
          style={styles.card}
        >

          <Text
            style={styles.sectionTitle}
          >
            Route Guide
          </Text>


          <View
            style={styles.legendRow}
          >

            <View
              style={[
                styles.legendLine,
                {
                  backgroundColor:
                    "#1976ff",
                },
              ]}
            />

            <Text>
              Planned Route
            </Text>

          </View>


          <View
            style={styles.legendRow}
          >

            <View
              style={[
                styles.legendLine,
                {
                  backgroundColor:
                    "#7b1fa2",
                },
              ]}
            />

            <Text>
              Actual Travelled Route
            </Text>

          </View>


          <Text
            style={
              styles.explanation
            }
          >
            If the bus/user moves more than
            120 meters away from the planned
            road route, a Safety Circle alert
            is automatically triggered.
          </Text>

        </View>


        {/* ========================================= */}
        {/* STATUS */}
        {/* ========================================= */}

        <View
          style={styles.card}
        >

          <Text
            style={styles.sectionTitle}
          >
            Safety Status
          </Text>


          <Text
            style={[
              styles.status,
              safetyStatus ===
                "Normal" &&
                styles.normal,

              safetyStatus ===
                "Concern" &&
                styles.concern,

              safetyStatus ===
                "Emergency" &&
                styles.emergency,

            ]}
          >
            {safetyStatus}
          </Text>


          <Text
            style={styles.smallText}
          >
            {journeyStarted
              ? "Journey monitoring active"
              : "Journey monitoring stopped"}
          </Text>

        </View>


        {/* ========================================= */}
        {/* JOURNEY INFORMATION */}
        {/* ========================================= */}

        <View
          style={styles.card}
        >

          <Text
            style={styles.sectionTitle}
          >
            Journey Information
          </Text>


          <View
            style={styles.infoRow}
          >

            <Text>
              Journey Duration
            </Text>

            <Text
              style={styles.infoValue}
            >
              {formatDuration(
                journeySeconds
              )}
            </Text>

          </View>


          <View
            style={styles.infoRow}
          >

            <Text>
              Planned Route
            </Text>

            <Text
              style={styles.infoValue}
            >
              {routeDistance || "0"} km
            </Text>

          </View>


          <View
            style={styles.infoRow}
          >

            <Text>
              Estimated Time
            </Text>

            <Text
              style={styles.infoValue}
            >
              {estimatedMinutes || "0"} min
            </Text>

          </View>


          <View
            style={styles.infoRow}
          >

            <Text>
              Away From Route
            </Text>

            <Text
              style={[
                styles.infoValue,
                deviationDistance >=
                  DEVIATION_LIMIT_METERS &&
                  {
                    color:
                      "#d32f2f",
                  },
              ]}
            >
              {deviationDistance} m
            </Text>

          </View>

        </View>


        {/* ========================================= */}
        {/* LOCATION SHARING */}
        {/* ========================================= */}

        <View
          style={styles.card}
        >

          <Text
            style={styles.sectionTitle}
          >
            Location Sharing
          </Text>


          <TouchableOpacity
            style={
              styles.shareButton
            }
            onPress={
              shareLocation
            }
          >

            <Text
              style={
                styles.buttonText
              }
            >
              📤 Share Current Location
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            style={
              styles.openButton
            }
            onPress={
              openLocation
            }
          >

            <Text
              style={
                styles.openButtonText
              }
            >
              📍 Open Location in Maps
            </Text>

          </TouchableOpacity>

        </View>


        {/* ========================================= */}
        {/* SAFETY CIRCLE */}
        {/* ========================================= */}

        <View
          style={styles.card}
        >

          <Text
            style={styles.sectionTitle}
          >
            Safety Circle
          </Text>


          <Text
            style={styles.smallText}
          >
            {contacts.length}
            {" "}
            trusted contact(s) available
          </Text>


          {contacts.map(
            (
              contact,
              index
            ) => (

              <View
                key={
                  index.toString()
                }
                style={
                  styles.contactRow
                }
              >

                <Text
                  style={
                    styles.contactName
                  }
                >
                  👤{" "}
                  {
                    contact.name ||
                    "Trusted Contact"
                  }
                </Text>


                <Text
                  style={
                    styles.contactDetail
                  }
                >
                  {
                    contact.email ||
                    contact.phone ||
                    ""
                  }
                </Text>

              </View>

            )
          )}

        </View>


        {/* ========================================= */}
        {/* TIMELINE */}
        {/* ========================================= */}

        <View
          style={styles.card}
        >

          <Text
            style={styles.sectionTitle}
          >
            Safety Timeline
          </Text>


          {timeline.length === 0 ? (

            <Text
              style={
                styles.smallText
              }
            >
              No events yet.
            </Text>

          ) : (

            timeline.map(
              item => (

                <View
                  key={
                    item.id.toString()
                  }
                  style={
                    styles.timelineItem
                  }
                >

                  <Text
                    style={
                      styles.timelineText
                    }
                  >
                    {item.text}
                  </Text>


                  <Text
                    style={
                      styles.timelineTime
                    }
                  >
                    {item.time}
                  </Text>

                </View>

              )
            )

          )}

        </View>


        <View
          style={{
            height: 40,
          }}
        />

      </ScrollView>


      {/* =========================================== */}
      {/* ARE YOU SAFE ALERT */}
      {/* =========================================== */}

      {alertVisible && (

        <View
          style={styles.overlay}
        >

          <View
            style={styles.alertBox}
          >

            <Text
              style={
                styles.alertIcon
              }
            >
              ⚠️
            </Text>


            <Text
              style={
                styles.alertTitle
              }
            >
              Are You Safe?
            </Text>


            <Text
              style={
                styles.alertMessage
              }
            >
              You moved away from the planned
              route by approximately{" "}
              {deviationDistance} meters.
            </Text>


            <Text
              style={
                styles.alertMessage
              }
            >
              Safety Circle has been alerted.
            </Text>


            <TouchableOpacity
              style={
                styles.safeButton
              }
              onPress={
                userIsSafe
              }
            >

              <Text
                style={
                  styles.buttonText
                }
              >
                ✅ I Am Safe
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.callButton
              }
              onPress={
                callMe
              }
            >

              <Text
                style={
                  styles.buttonText
                }
              >
                📞 Call Me
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.assistanceButton
              }
              onPress={
                needAssistance
              }
            >

              <Text
                style={
                  styles.buttonText
                }
              >
                🆘 I Need Assistance
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.emergencyButton
              }
              onPress={
                emergency
              }
            >

              <Text
                style={
                  styles.buttonText
                }
              >
                🚨 Emergency
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      )}

    </View>

  );

}


// ======================================================
// STYLES
// ======================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        "#f7f5fb",
    },


    header: {
      alignItems:
        "center",

      paddingTop:
        20,

      paddingBottom:
        10,
    },


    busIcon: {
      fontSize:
        34,
    },


    title: {
      fontSize:
        22,

      fontWeight:
        "bold",

      color:
        "#7b1fa2",

      marginTop:
        5,
    },


    subtitle: {
      fontSize:
        12,

      color:
        "#777",

      marginTop:
        3,
    },


    card: {
      backgroundColor:
        "#fff",

      marginHorizontal:
        12,

      marginVertical:
        6,

      padding:
        14,

      borderRadius:
        12,

      elevation:
        3,

      shadowColor:
        "#000",

      shadowOpacity:
        0.08,

      shadowRadius:
        4,

      shadowOffset: {
        width:
          0,

        height:
          2,
      },
    },


    label: {
      color:
        "#7b1fa2",

      fontWeight:
        "bold",

      marginBottom:
        7,
    },


    input: {
      borderWidth:
        1,

      borderColor:
        "#d7c4e8",

      borderRadius:
        8,

      padding:
        11,

      backgroundColor:
        "#fbf9fd",

      marginBottom:
        10,
    },


    startButton: {
      backgroundColor:
        "#7b1fa2",

      padding:
        13,

      borderRadius:
        8,

      alignItems:
        "center",
    },


    stopButton: {
      backgroundColor:
        "#616161",

      padding:
        13,

      borderRadius:
        8,

      alignItems:
        "center",
    },


    buttonText: {
      color:
        "#fff",

      fontWeight:
        "bold",

      textAlign:
        "center",
    },


    mapContainer: {
      height:
        390,

      marginHorizontal:
        12,

      marginVertical:
        8,

      borderRadius:
        14,

      overflow:
        "hidden",

      elevation:
        4,
    },


    mapLoading: {
      flex:
        1,

      justifyContent:
        "center",

      alignItems:
        "center",
    },


    sectionTitle: {
      fontSize:
        16,

      fontWeight:
        "bold",

      color:
        "#333",

      marginBottom:
        10,
    },


    legendRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom:
        8,
    },


    legendLine: {
      width:
        35,

      height:
        6,

      borderRadius:
        5,

      marginRight:
        8,
    },


    explanation: {
      fontSize:
        12,

      color:
        "#666",

      lineHeight:
        18,

      marginTop:
        5,
    },


    status: {
      fontSize:
        18,

      fontWeight:
        "bold",
    },


    normal: {
      color:
        "#2e7d32",
    },


    concern: {
      color:
        "#ef6c00",
    },


    emergency: {
      color:
        "#d32f2f",
    },


    smallText: {
      color:
        "#777",

      fontSize:
        12,

      marginTop:
        4,
    },


    infoRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      paddingVertical:
        8,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#eeeeee",
    },


    infoValue: {
      fontWeight:
        "bold",

      color:
        "#7b1fa2",
    },


    shareButton: {
      backgroundColor:
        "#7b1fa2",

      padding:
        12,

      borderRadius:
        8,

      alignItems:
        "center",

      marginBottom:
        8,
    },


    openButton: {
      borderWidth:
        1,

      borderColor:
        "#7b1fa2",

      padding:
        11,

      borderRadius:
        8,

      alignItems:
        "center",
    },


    openButtonText: {
      color:
        "#7b1fa2",

      fontWeight:
        "bold",
    },


    contactRow: {
      paddingVertical:
        8,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#eeeeee",
    },


    contactName: {
      fontWeight:
        "bold",

      color:
        "#333",
    },


    contactDetail: {
      color:
        "#777",

      fontSize:
        12,

      marginTop:
        2,
    },


    timelineItem: {
      borderLeftWidth:
        3,

      borderLeftColor:
        "#7b1fa2",

      paddingLeft:
        10,

      marginBottom:
        10,
    },


    timelineText: {
      fontSize:
        13,

      color:
        "#333",
    },


    timelineTime: {
      fontSize:
        10,

      color:
        "#888",

      marginTop:
        3,
    },


    overlay: {
      position:
        "absolute",

      left:
        0,

      right:
        0,

      top:
        0,

      bottom:
        0,

      backgroundColor:
        "rgba(0,0,0,0.55)",

      justifyContent:
        "center",

      alignItems:
        "center",

      padding:
        20,
    },


    alertBox: {
      backgroundColor:
        "#fff",

      borderRadius:
        18,

      padding:
        20,

      width:
        "100%",

      elevation:
        10,
    },


    alertIcon: {
      fontSize:
        40,

      textAlign:
        "center",
    },


    alertTitle: {
      fontSize:
        24,

      fontWeight:
        "bold",

      textAlign:
        "center",

      color:
        "#d32f2f",

      marginVertical:
        8,
    },


    alertMessage: {
      textAlign:
        "center",

      color:
        "#555",

      lineHeight:
        20,

      marginBottom:
        8,
    },


    safeButton: {
      backgroundColor:
        "#2e7d32",

      padding:
        13,

      borderRadius:
        8,

      marginTop:
        8,

      marginBottom:
        7,
    },


    callButton: {
      backgroundColor:
        "#1976d2",

      padding:
        13,

      borderRadius:
        8,

      marginBottom:
        7,
    },


    assistanceButton: {
      backgroundColor:
        "#ef6c00",

      padding:
        13,

      borderRadius:
        8,

      marginBottom:
        7,
    },


    emergencyButton: {
      backgroundColor:
        "#d32f2f",

      padding:
        13,

      borderRadius:
        8,
    },

  });