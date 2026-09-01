import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";


// =====================================================
// STORAGE KEY
// =====================================================

export const CONTACTS_STORAGE_KEY =
  "@sakhi_trusted_contacts";


// =====================================================
// PUBLIC SERVER URL
// =====================================================
//
// IMPORTANT:
// Use ngrok URL here.
// Do NOT use localhost or 10.0.2.2.
//
// Make sure ngrok is running:
// ngrok http 5000
//
// =====================================================

const SERVER_URL =
  "https://quake-proofs-president.ngrok-free.dev";


// =====================================================
// SAFETY CIRCLE SCREEN
// =====================================================

export default function SafetyCircleScreen() {

  // ===================================================
  // CONTACTS
  // ===================================================

  const [contacts, setContacts] =
    useState([]);

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [relationship, setRelationship] =
    useState("");


  // ===================================================
  // HISTORY MODAL
  // ===================================================

  const [historyVisible, setHistoryVisible] =
    useState(false);

  const [selectedContact, setSelectedContact] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historyError, setHistoryError] =
    useState("");


// =====================================================
// LOAD CONTACTS
// =====================================================

  useEffect(() => {

    loadContacts();

  }, []);


// =====================================================
// LOAD CONTACTS FROM ASYNC STORAGE
// =====================================================

  const loadContacts = async () => {

    try {

      const saved =
        await AsyncStorage.getItem(
          CONTACTS_STORAGE_KEY
        );

      if (saved) {

        const parsed =
          JSON.parse(saved);

        if (Array.isArray(parsed)) {

          setContacts(parsed);

          console.log(
            "SAVED SAFETY CIRCLE CONTACTS: CONTACTS FOUND"
          );

        } else {

          setContacts([]);

        }

      } else {

        setContacts([]);

        console.log(
          "SAVED SAFETY CIRCLE CONTACTS: NONE"
        );

      }

    } catch (error) {

      console.log(
        "LOAD CONTACTS ERROR:",
        error
      );

      setContacts([]);

    }

  };


// =====================================================
// SAVE CONTACTS
// =====================================================

  const saveContacts = async (newContacts) => {

    try {

      await AsyncStorage.setItem(
        CONTACTS_STORAGE_KEY,
        JSON.stringify(newContacts)
      );

      setContacts(newContacts);

    } catch (error) {

      console.log(
        "SAVE CONTACTS ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to save Safety Circle contacts."
      );

    }

  };


// =====================================================
// ADD CONTACT
// =====================================================

  const addContact = async () => {

    const cleanName =
      name.trim();

    const cleanPhone =
      phone.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanRelationship =
      relationship.trim();


    // -------------------------------------------------
    // NAME
    // -------------------------------------------------

    if (!cleanName) {

      Alert.alert(
        "Missing Name",
        "Please enter the contact name."
      );

      return;

    }


    // -------------------------------------------------
    // EMAIL
    // -------------------------------------------------

    if (!cleanEmail) {

      Alert.alert(
        "Missing Email",
        "Please enter the contact email address."
      );

      return;

    }


    // -------------------------------------------------
    // SIMPLE EMAIL VALIDATION
    // -------------------------------------------------

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {

      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );

      return;

    }


    // -------------------------------------------------
    // DUPLICATE EMAIL
    // -------------------------------------------------

    const duplicate =
      contacts.some(
        contact =>
          String(contact.email || "")
            .trim()
            .toLowerCase() === cleanEmail
      );

    if (duplicate) {

      Alert.alert(
        "Already Added",
        "This email address is already in your Safety Circle."
      );

      return;

    }


    // -------------------------------------------------
    // CREATE CONTACT
    // -------------------------------------------------

    const newContact = {

      id:
        Date.now().toString(),

      name:
        cleanName,

      phone:
        cleanPhone,

      email:
        cleanEmail,

      relationship:
        cleanRelationship,

    };


    const updatedContacts = [

      ...contacts,

      newContact,

    ];


    await saveContacts(
      updatedContacts
    );


    // -------------------------------------------------
    // CLEAR INPUTS
    // -------------------------------------------------

    setName("");
    setPhone("");
    setEmail("");
    setRelationship("");


    Alert.alert(
      "Success",
      "Contact added to Safety Circle."
    );

  };


// =====================================================
// DELETE CONTACT
// =====================================================

  const deleteContact = (contact) => {

    Alert.alert(

      "Remove Contact",

      `Remove ${contact.name} from Safety Circle?`,

      [

        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Remove",
          style: "destructive",

          onPress: async () => {

            const updatedContacts =
              contacts.filter(
                item =>
                  item.id !== contact.id
              );

            await saveContacts(
              updatedContacts
            );

          },

        },

      ]

    );

  };


// =====================================================
// GET SOS HISTORY
// =====================================================

  const openSOSHistory = async (contact) => {

    console.log("");
    console.log(
      "======================================"
    );

    console.log(
      "📋 OPENING SOS HISTORY"
    );

    console.log(
      "======================================"
    );

    console.log(
      "Contact:",
      contact.name
    );

    console.log(
      "Email:",
      contact.email
    );


    setSelectedContact(contact);

    setHistory([]);

    setHistoryError("");

    setHistoryVisible(true);

    setHistoryLoading(true);


    try {

      // ------------------------------------------------
      // CHECK EMAIL
      // ------------------------------------------------

      const contactEmail =
        String(
          contact.email || ""
        )
          .trim()
          .toLowerCase();


      if (!contactEmail) {

        setHistoryError(
          "This contact does not have an email address."
        );

        setHistoryLoading(false);

        return;

      }


      console.log(
        "REQUESTING HISTORY FOR:",
        contactEmail
      );


      // ------------------------------------------------
      // CREATE URL
      // ------------------------------------------------

      const historyUrl =
        `${SERVER_URL}/sos-history-by-email?email=${encodeURIComponent(
          contactEmail
        )}`;


      console.log(
        "HISTORY URL:",
        historyUrl
      );


      // ------------------------------------------------
      // FETCH
      // ------------------------------------------------

      const response =
        await fetch(
          historyUrl,
          {
            method: "GET",

            headers: {

              "ngrok-skip-browser-warning":
                "true",

              Accept:
                "application/json",

            },

          }
        );


      console.log(
        "HISTORY SERVER STATUS:",
        response.status
      );


      // ------------------------------------------------
      // READ RESPONSE
      // ------------------------------------------------

      const responseText =
        await response.text();


      console.log(
        "HISTORY SERVER RESPONSE:",
        responseText
      );


      let data;

      try {

        data =
          JSON.parse(
            responseText
          );

      } catch (parseError) {

        throw new Error(
          "Server returned an invalid response."
        );

      }


      // ------------------------------------------------
      // HTTP ERROR
      // ------------------------------------------------

      if (!response.ok) {

        throw new Error(
          data.message ||
          `Server returned status ${response.status}`
        );

      }


      // ------------------------------------------------
      // SERVER SUCCESS CHECK
      // ------------------------------------------------

      if (!data.success) {

        throw new Error(
          data.message ||
          "Unable to load SOS history."
        );

      }


      // ------------------------------------------------
      // HISTORY
      // ------------------------------------------------

      const receivedHistory =
        Array.isArray(data.history)
          ? data.history
          : [];


      console.log(
        "HISTORY COUNT:",
        receivedHistory.length
      );


      setHistory(
        receivedHistory
      );


      if (
        receivedHistory.length === 0
      ) {

        setHistoryError(
          "No SOS alerts have been recorded for this Safety Circle contact yet."
        );

      }


    } catch (error) {

      console.log(
        "SOS HISTORY ERROR:",
        error
      );

      setHistory([]);

      setHistoryError(
        error.message ||
        "Unable to load SOS history."
      );

    } finally {

      setHistoryLoading(false);

    }

  };


// =====================================================
// CLOSE HISTORY
// =====================================================

  const closeHistory = () => {

    setHistoryVisible(false);

    setSelectedContact(null);

    setHistory([]);

    setHistoryError("");

  };


// =====================================================
// OPEN GOOGLE MAPS
// =====================================================

  const openGoogleMaps = async (url) => {

    try {

      if (!url) {

        Alert.alert(
          "Location Unavailable",
          "Google Maps location is not available."
        );

        return;

      }

      const supported =
        await Linking.canOpenURL(
          url
        );

      if (supported) {

        await Linking.openURL(
          url
        );

      } else {

        Alert.alert(
          "Unable to Open",
          "Google Maps could not be opened."
        );

      }

    } catch (error) {

      console.log(
        "GOOGLE MAPS ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to open Google Maps."
      );

    }

  };


// =====================================================
// OPEN LIVE LOCATION
// =====================================================

  const openLiveLocation = async (url) => {

    try {

      if (!url) {

        Alert.alert(
          "Live Location Unavailable",
          "Live location link is not available."
        );

        return;

      }

      console.log(
        "OPENING LIVE LOCATION:",
        url
      );


      const supported =
        await Linking.canOpenURL(
          url
        );


      if (supported) {

        await Linking.openURL(
          url
        );

      } else {

        Alert.alert(
          "Unable to Open",
          "The live location webpage could not be opened."
        );

      }

    } catch (error) {

      console.log(
        "LIVE LOCATION OPEN ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to open live location."
      );

    }

  };


// =====================================================
// FORMAT DATE
// =====================================================

  const formatDate = (record) => {

    if (record.date) {

      return record.date;

    }

    if (record.sentAt) {

      try {

        return new Date(
          record.sentAt
        ).toLocaleDateString(
          "en-IN"
        );

      } catch (error) {

        return "Unavailable";

      }

    }

    return "Unavailable";

  };


// =====================================================
// FORMAT TIME
// =====================================================

  const formatTime = (record) => {

    if (record.time) {

      return record.time;

    }

    if (record.sentAt) {

      try {

        return new Date(
          record.sentAt
        ).toLocaleTimeString(
          "en-IN"
        );

      } catch (error) {

        return "Unavailable";

      }

    }

    return "Unavailable";

  };


// =====================================================
// RENDER HISTORY ITEM
// =====================================================

  const renderHistoryItem = ({
    item,
    index,
  }) => {

    const hasLocation =
      item.latitude !== null &&
      item.latitude !== undefined &&
      item.longitude !== null &&
      item.longitude !== undefined;


    const hasGoogleMaps =
      Boolean(
        item.googleMapsUrl
      );


    const hasLiveLocation =
      Boolean(
        item.liveLocationUrl
      );


    return (

      <View
        style={styles.historyCard}
      >

        {/* =========================================
            HEADER
        ========================================= */}

        <View
          style={styles.historyHeader}
        >

          <View>

            <Text
              style={styles.historyTitle}
            >

              🚨 SOS Alert

            </Text>

            <Text
              style={styles.alertNumber}
            >

              Alert #{index + 1}

            </Text>

          </View>

          <View
            style={styles.alertBadge}
          >

            <Text
              style={styles.alertBadgeText}
            >

              SOS

            </Text>

          </View>

        </View>


        {/* =========================================
            DATE
        ========================================= */}

        <View
          style={styles.infoRow}
        >

          <Text
            style={styles.infoLabel}
          >

            📅 Date

          </Text>

          <Text
            style={styles.infoValue}
          >

            {formatDate(item)}

          </Text>

        </View>


        {/* =========================================
            TIME
        ========================================= */}

        <View
          style={styles.infoRow}
        >

          <Text
            style={styles.infoLabel}
          >

            🕐 Time

          </Text>

          <Text
            style={styles.infoValue}
          >

            {formatTime(item)}

          </Text>

        </View>


        {/* =========================================
            LOCATION
        ========================================= */}

        <View
          style={styles.locationBox}
        >

          <Text
            style={styles.sectionTitle}
          >

            📍 Location

          </Text>


          {hasLocation ? (

            <>

              <Text
                style={styles.locationText}
              >

                <Text
                  style={styles.boldText}
                >
                  Latitude:
                </Text>

                {" "}

                {item.latitude}

              </Text>


              <Text
                style={styles.locationText}
              >

                <Text
                  style={styles.boldText}
                >
                  Longitude:
                </Text>

                {" "}

                {item.longitude}

              </Text>


              <Text
                style={styles.locationText}
              >

                <Text
                  style={styles.boldText}
                >
                  GPS Accuracy:
                </Text>

                {" "}

                {item.accuracy !== null &&
                item.accuracy !== undefined
                  ? `${item.accuracy} meters`
                  : "Unavailable"}

              </Text>

            </>

          ) : (

            <Text
              style={styles.unavailableText}
            >

              Location unavailable

            </Text>

          )}

        </View>


        {/* =========================================
            GOOGLE MAPS
        ========================================= */}

        {hasGoogleMaps && (

          <TouchableOpacity
            style={styles.mapsButton}
            onPress={() =>
              openGoogleMaps(
                item.googleMapsUrl
              )
            }
          >

            <Text
              style={styles.buttonText}
            >

              📍 Open Current Location

            </Text>

          </TouchableOpacity>

        )}


        {/* =========================================
            LIVE LOCATION
        ========================================= */}

        {hasLiveLocation && (

          <View
            style={styles.liveLocationBox}
          >

            <Text
              style={styles.liveTitle}
            >

              🔴 Live Location

            </Text>


            <Text
              style={styles.liveDescription}
            >

              Open the link to view the user's
              latest location.

            </Text>


            <TouchableOpacity
              style={styles.liveButton}
              onPress={() =>
                openLiveLocation(
                  item.liveLocationUrl
                )
              }
            >

              <Text
                style={styles.buttonText}
              >

                📍 Open Live Location

              </Text>

            </TouchableOpacity>

          </View>

        )}


        {/* =========================================
            SENT TIME
        ========================================= */}

        {item.sentAt && (

          <Text
            style={styles.sentAtText}
          >

            Alert recorded on{" "}

            {new Date(
              item.sentAt
            ).toLocaleString("en-IN")}

          </Text>

        )}

      </View>

    );

  };


// =====================================================
// RENDER CONTACT
// =====================================================

  const renderContact = ({
    item,
  }) => {

    return (

      <View
        style={styles.contactCard}
      >

        {/* =========================================
            CONTACT INITIAL
        ========================================= */}

        <View
          style={styles.avatar}
        >

          <Text
            style={styles.avatarText}
          >

            {item.name
              ? item.name
                  .charAt(0)
                  .toUpperCase()
              : "?"}

          </Text>

        </View>


        {/* =========================================
            CONTACT INFORMATION
        ========================================= */}

        <View
          style={styles.contactInfo}
        >

          <Text
            style={styles.contactName}
          >

            {item.name}

          </Text>


          {item.relationship ? (

            <Text
              style={styles.relationship}
            >

              {item.relationship}

            </Text>

          ) : null}


          {item.email ? (

            <Text
              style={styles.email}
              numberOfLines={1}
            >

              {item.email}

            </Text>

          ) : null}


          {item.phone ? (

            <Text
              style={styles.phone}
            >

              {item.phone}

            </Text>

          ) : null}


          {/* =======================================
              SOS HISTORY BUTTON
          ======================================= */}

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() =>
              openSOSHistory(item)
            }
          >

            <Text
              style={styles.historyButtonText}
            >

              📋 SOS History

            </Text>

          </TouchableOpacity>

        </View>


        {/* =========================================
            DELETE
        ========================================= */}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() =>
            deleteContact(item)
          }
        >

          <Text
            style={styles.deleteText}
          >

            ✕

          </Text>

        </TouchableOpacity>

      </View>

    );

  };


// =====================================================
// MAIN UI
// =====================================================

  return (

    <View
      style={styles.container}
    >

      {/* ===========================================
          HEADER
      =========================================== */}

      <View
        style={styles.header}
      >

        <Text
          style={styles.headerTitle}
        >

          Safety Circle

        </Text>

        <Text
          style={styles.headerSubtitle}
        >

          Your trusted emergency contacts

        </Text>

      </View>


      {/* ===========================================
          ADD CONTACT FORM
      =========================================== */}

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >

        <View
          style={styles.formCard}
        >

          <Text
            style={styles.formTitle}
          >

            Add Trusted Contact

          </Text>


          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />


          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />


          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />


          <TextInput
            style={styles.input}
            placeholder="Relationship (e.g. Mother, Father)"
            placeholderTextColor="#999"
            value={relationship}
            onChangeText={setRelationship}
          />


          <TouchableOpacity
            style={styles.addButton}
            onPress={addContact}
          >

            <Text
              style={styles.addButtonText}
            >

              + Add to Safety Circle

            </Text>

          </TouchableOpacity>

        </View>


        {/* =========================================
            CONTACT LIST
        ========================================= */}

        <Text
          style={styles.listTitle}
        >

          Trusted Contacts

        </Text>


        {contacts.length === 0 ? (

          <View
            style={styles.emptyContacts}
          >

            <Text
              style={styles.emptyIcon}
            >

              👥

            </Text>

            <Text
              style={styles.emptyTitle}
            >

              No Trusted Contacts

            </Text>

            <Text
              style={styles.emptyText}
            >

              Add a trusted person to your
              Safety Circle.

            </Text>

          </View>

        ) : (

          <FlatList
            data={contacts}
            keyExtractor={(item, index) =>
              String(
                item.id ||
                item.email ||
                index
              )
            }
            renderItem={renderContact}
            scrollEnabled={false}
          />

        )}

      </ScrollView>


      {/* =================================================
          SOS HISTORY MODAL
      ================================================= */}

      <Modal
        visible={historyVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={
          closeHistory
        }
      >

        <View
          style={styles.modalContainer}
        >

          {/* =========================================
              MODAL HEADER
          ========================================= */}

          <View
            style={styles.modalHeader}
          >

            <View
              style={styles.modalHeaderText}
            >

              <Text
                style={styles.modalTitle}
              >

                SOS History

              </Text>


              {selectedContact && (

                <>

                  <Text
                    style={styles.modalContactName}
                  >

                    {selectedContact.name}

                  </Text>


                  <Text
                    style={styles.modalContactEmail}
                  >

                    {selectedContact.email}

                  </Text>

                </>

              )}

            </View>


            <TouchableOpacity
              style={styles.closeButton}
              onPress={
                closeHistory
              }
            >

              <Text
                style={styles.closeButtonText}
              >

                ×

              </Text>

            </TouchableOpacity>

          </View>


          {/* =========================================
              LOADING
          ========================================= */}

          {historyLoading ? (

            <View
              style={styles.loadingContainer}
            >

              <ActivityIndicator
                size="large"
              />

              <Text
                style={styles.loadingText}
              >

                Loading SOS history...

              </Text>

            </View>

          ) : (

            <>

              {/* =====================================
                  HISTORY COUNT
              ===================================== */}

              <View
                style={styles.countBox}
              >

                <Text
                  style={styles.countNumber}
                >

                  {history.length}

                </Text>

                <Text
                  style={styles.countText}
                >

                  SOS alert
                  {history.length === 1
                    ? ""
                    : "s"} received

                </Text>

              </View>


              {/* =====================================
                  ERROR / EMPTY
              ===================================== */}

              {history.length === 0 ? (

                <View
                  style={styles.noHistoryContainer}
                >

                  <Text
                    style={styles.noHistoryIcon}
                  >

                    📭

                  </Text>


                  <Text
                    style={styles.noHistoryTitle}
                  >

                    No SOS History

                  </Text>


                  <Text
                    style={styles.noHistoryText}
                  >

                    {historyError ||
                      "No SOS alerts have been recorded for this Safety Circle contact yet."}

                  </Text>

                </View>

              ) : (

                <FlatList
                  data={history}
                  keyExtractor={(item, index) =>
                    String(
                      item.id ||
                      item.sentAt ||
                      index
                    )
                  }
                  renderItem={
                    renderHistoryItem
                  }
                  contentContainerStyle={
                    styles.historyList
                  }
                  showsVerticalScrollIndicator={
                    true
                  }
                />

              )}

            </>

          )}

        </View>

      </Modal>

    </View>

  );

}


// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: "#f5f5f5",

  },


  // ===================================================
  // HEADER
  // ===================================================

  header: {

    backgroundColor: "#8b1515",

    paddingTop: 18,

    paddingBottom: 18,

    paddingHorizontal: 20,

  },

  headerTitle: {

    color: "#ffffff",

    fontSize: 24,

    fontWeight: "bold",

  },

  headerSubtitle: {

    color: "#f4caca",

    fontSize: 13,

    marginTop: 4,

  },


  scrollContent: {

    padding: 16,

    paddingBottom: 40,

  },


  // ===================================================
  // FORM
  // ===================================================

  formCard: {

    backgroundColor: "#ffffff",

    borderRadius: 14,

    padding: 18,

    marginBottom: 20,

    elevation: 3,

    shadowColor: "#000",

    shadowOpacity: 0.08,

    shadowRadius: 5,

    shadowOffset: {
      width: 0,
      height: 2,
    },

  },

  formTitle: {

    fontSize: 19,

    fontWeight: "bold",

    color: "#333333",

    marginBottom: 15,

  },

  input: {

    height: 50,

    borderWidth: 1,

    borderColor: "#dddddd",

    borderRadius: 9,

    paddingHorizontal: 14,

    fontSize: 15,

    color: "#333333",

    marginBottom: 11,

    backgroundColor: "#fafafa",

  },

  addButton: {

    backgroundColor: "#c62828",

    height: 50,

    borderRadius: 9,

    alignItems: "center",

    justifyContent: "center",

    marginTop: 4,

  },

  addButtonText: {

    color: "#ffffff",

    fontSize: 16,

    fontWeight: "bold",

  },


  // ===================================================
  // CONTACT LIST
  // ===================================================

  listTitle: {

    fontSize: 19,

    fontWeight: "bold",

    color: "#333333",

    marginBottom: 12,

  },

  contactCard: {

    backgroundColor: "#ffffff",

    borderRadius: 14,

    padding: 15,

    marginBottom: 12,

    flexDirection: "row",

    alignItems: "flex-start",

    elevation: 2,

    shadowColor: "#000",

    shadowOpacity: 0.07,

    shadowRadius: 4,

    shadowOffset: {
      width: 0,
      height: 2,
    },

  },

  avatar: {

    width: 48,

    height: 48,

    borderRadius: 24,

    backgroundColor: "#f3d4d4",

    alignItems: "center",

    justifyContent: "center",

    marginRight: 12,

  },

  avatarText: {

    fontSize: 20,

    fontWeight: "bold",

    color: "#a51c1c",

  },

  contactInfo: {

    flex: 1,

  },

  contactName: {

    fontSize: 17,

    fontWeight: "bold",

    color: "#222222",

  },

  relationship: {

    fontSize: 13,

    color: "#777777",

    marginTop: 2,

  },

  email: {

    fontSize: 13,

    color: "#555555",

    marginTop: 5,

  },

  phone: {

    fontSize: 13,

    color: "#555555",

    marginTop: 3,

  },

  historyButton: {

    alignSelf: "flex-start",

    backgroundColor: "#fff1f1",

    borderWidth: 1,

    borderColor: "#e7aaaa",

    borderRadius: 7,

    paddingHorizontal: 11,

    paddingVertical: 8,

    marginTop: 10,

  },

  historyButtonText: {

    color: "#b71c1c",

    fontSize: 13,

    fontWeight: "bold",

  },

  deleteButton: {

    width: 34,

    height: 34,

    borderRadius: 17,

    backgroundColor: "#fbeaea",

    alignItems: "center",

    justifyContent: "center",

  },

  deleteText: {

    color: "#c62828",

    fontSize: 20,

    fontWeight: "bold",

  },


  // ===================================================
  // EMPTY CONTACTS
  // ===================================================

  emptyContacts: {

    backgroundColor: "#ffffff",

    borderRadius: 14,

    padding: 35,

    alignItems: "center",

  },

  emptyIcon: {

    fontSize: 45,

  },

  emptyTitle: {

    fontSize: 17,

    fontWeight: "bold",

    color: "#444444",

    marginTop: 10,

  },

  emptyText: {

    color: "#777777",

    textAlign: "center",

    marginTop: 6,

  },


  // ===================================================
  // MODAL
  // ===================================================

  modalContainer: {

    flex: 1,

    backgroundColor: "#ffffff",

  },

  modalHeader: {

    backgroundColor: "#ffffff",

    paddingTop: 20,

    paddingBottom: 15,

    paddingHorizontal: 18,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    borderBottomWidth: 1,

    borderBottomColor: "#eeeeee",

  },

  modalHeaderText: {

    flex: 1,

  },

  modalTitle: {

    fontSize: 20,

    fontWeight: "bold",

    color: "#222222",

  },

  modalContactName: {

    fontSize: 14,

    color: "#c62828",

    marginTop: 5,

    fontWeight: "500",

  },

  modalContactEmail: {

    fontSize: 12,

    color: "#777777",

    marginTop: 2,

  },

  closeButton: {

    width: 38,

    height: 38,

    borderRadius: 19,

    backgroundColor: "#eeeeee",

    alignItems: "center",

    justifyContent: "center",

  },

  closeButtonText: {

    fontSize: 27,

    color: "#555555",

    lineHeight: 30,

  },


  // ===================================================
  // COUNT
  // ===================================================

  countBox: {

    marginHorizontal: 16,

    marginTop: 15,

    marginBottom: 5,

    padding: 14,

    borderRadius: 10,

    borderWidth: 1,

    borderColor: "#ffcaca",

    backgroundColor: "#fff8f8",

    flexDirection: "row",

    alignItems: "center",

  },

  countNumber: {

    color: "#c62828",

    fontSize: 20,

    fontWeight: "bold",

    marginRight: 10,

  },

  countText: {

    color: "#555555",

    fontSize: 13,

  },


  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {

    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    padding: 30,

  },

  loadingText: {

    marginTop: 12,

    color: "#777777",

    fontSize: 14,

  },


  // ===================================================
  // NO HISTORY
  // ===================================================

  noHistoryContainer: {

    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 40,

  },

  noHistoryIcon: {

    fontSize: 48,

    marginBottom: 15,

  },

  noHistoryTitle: {

    fontSize: 17,

    fontWeight: "bold",

    color: "#444444",

  },

  noHistoryText: {

    textAlign: "center",

    color: "#777777",

    fontSize: 13,

    lineHeight: 19,

    marginTop: 8,

  },


  // ===================================================
  // HISTORY LIST
  // ===================================================

  historyList: {

    padding: 16,

    paddingBottom: 30,

  },


  // ===================================================
  // HISTORY CARD
  // ===================================================

  historyCard: {

    backgroundColor: "#ffffff",

    borderWidth: 1,

    borderColor: "#eeeeee",

    borderRadius: 14,

    padding: 16,

    marginBottom: 15,

    elevation: 2,

    shadowColor: "#000",

    shadowOpacity: 0.07,

    shadowRadius: 4,

    shadowOffset: {
      width: 0,
      height: 2,
    },

  },

  historyHeader: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 12,

  },

  historyTitle: {

    fontSize: 17,

    fontWeight: "bold",

    color: "#c62828",

  },

  alertNumber: {

    fontSize: 12,

    color: "#888888",

    marginTop: 3,

  },

  alertBadge: {

    backgroundColor: "#ffebee",

    borderRadius: 15,

    paddingHorizontal: 10,

    paddingVertical: 5,

  },

  alertBadgeText: {

    color: "#c62828",

    fontSize: 11,

    fontWeight: "bold",

  },


  // ===================================================
  // INFO
  // ===================================================

  infoRow: {

    flexDirection: "row",

    justifyContent: "space-between",

    paddingVertical: 8,

    borderBottomWidth: 1,

    borderBottomColor: "#f1f1f1",

  },

  infoLabel: {

    color: "#666666",

    fontSize: 14,

  },

  infoValue: {

    color: "#333333",

    fontSize: 14,

    fontWeight: "600",

    maxWidth: "60%",

    textAlign: "right",

  },


  // ===================================================
  // LOCATION
  // ===================================================

  locationBox: {

    backgroundColor: "#f8f8f8",

    borderRadius: 10,

    padding: 14,

    marginTop: 14,

  },

  sectionTitle: {

    fontSize: 16,

    fontWeight: "bold",

    color: "#333333",

    marginBottom: 8,

  },

  locationText: {

    fontSize: 13,

    color: "#555555",

    marginTop: 5,

    lineHeight: 19,

  },

  boldText: {

    fontWeight: "bold",

    color: "#333333",

  },

  unavailableText: {

    color: "#888888",

    fontSize: 13,

  },


  // ===================================================
  // GOOGLE MAPS BUTTON
  // ===================================================

  mapsButton: {

    backgroundColor: "#c62828",

    borderRadius: 9,

    paddingVertical: 13,

    alignItems: "center",

    justifyContent: "center",

    marginTop: 13,

  },

  buttonText: {

    color: "#ffffff",

    fontSize: 14,

    fontWeight: "bold",

  },


  // ===================================================
  // LIVE LOCATION
  // ===================================================

  liveLocationBox: {

    backgroundColor: "#fff1f1",

    borderRadius: 10,

    padding: 14,

    marginTop: 14,

    borderWidth: 1,

    borderColor: "#ffd0d0",

  },

  liveTitle: {

    color: "#c62828",

    fontSize: 16,

    fontWeight: "bold",

  },

  liveDescription: {

    color: "#666666",

    fontSize: 13,

    lineHeight: 19,

    marginTop: 6,

  },

  liveButton: {

    backgroundColor: "#c62828",

    borderRadius: 9,

    paddingVertical: 13,

    alignItems: "center",

    marginTop: 12,

  },


  // ===================================================
  // SENT TIME
  // ===================================================

  sentAtText: {

    color: "#999999",

    fontSize: 11,

    marginTop: 14,

    textAlign: "center",

  },

});