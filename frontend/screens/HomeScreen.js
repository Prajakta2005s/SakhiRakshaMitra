import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >

      {/* Header */}
      <View style={styles.header}>

        <View>
          <Text style={styles.welcome}>
            Welcome to
          </Text>

          <Text style={styles.title}>
            Sakhi RakshaMitra
          </Text>
        </View>

        {/* Profile */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <Text style={styles.profileText}>
            👤
          </Text>
        </TouchableOpacity>

      </View>


      {/* Safety Status */}
      <View style={styles.statusCard}>

        <Text style={styles.statusIcon}>
          🛡️
        </Text>

        <View style={styles.statusInfo}>

          <Text style={styles.statusTitle}>
            You are Safe
          </Text>

          <Text style={styles.statusText}>
            Your safety system is active
          </Text>

        </View>

      </View>


      {/* Emergency SOS */}
      <TouchableOpacity
        style={styles.sosButton}
        onPress={() => navigation.navigate('SOS')}
        activeOpacity={0.8}
      >

        <Text style={styles.sosIcon}>
          🆘
        </Text>

        <Text style={styles.sosText}>
          EMERGENCY SOS
        </Text>

        <Text style={styles.sosSubText}>
          Tap for immediate help
        </Text>

      </TouchableOpacity>


      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>
        Quick Actions
      </Text>


      <View style={styles.grid}>

        {/* VOICE SOS */}
        <TouchableOpacity
          style={styles.voiceCard}
          onPress={() => navigation.navigate('VoiceSOS')}
          activeOpacity={0.8}
        >

          <Text style={styles.voiceIcon}>
            🎤
          </Text>

          <Text style={styles.voiceTitle}>
            Voice SOS
          </Text>

          <Text style={styles.voiceText}>
            Activate SOS using your voice
          </Text>

        </TouchableOpacity>


        {/* LIVE LOCATION */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('LiveLocation')}
          activeOpacity={0.8}
        >

          <Text style={styles.cardIcon}>
            📍
          </Text>

          <Text style={styles.cardTitle}>
            Live Location
          </Text>

          <Text style={styles.cardText}>
            Share your location
          </Text>

        </TouchableOpacity>


        {/* SAFETY CIRCLE */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('SafetyCircle')}
          activeOpacity={0.8}
        >

          <Text style={styles.cardIcon}>
            👥
          </Text>

          <Text style={styles.cardTitle}>
            Safety Circle
          </Text>

          <Text style={styles.cardText}>
            Trusted contacts
          </Text>

        </TouchableOpacity>


        {/* EMERGENCY */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Emergency')}
          activeOpacity={0.8}
        >

          <Text style={styles.cardIcon}>
            📞
          </Text>

          <Text style={styles.cardTitle}>
            Emergency
          </Text>

          <Text style={styles.cardText}>
            Emergency contacts
          </Text>

        </TouchableOpacity>


        {/* SAFETY TIMELINE */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('SafetyTimeline')}
          activeOpacity={0.8}
        >

          <Text style={styles.cardIcon}>
            🗺️
          </Text>

          <Text style={styles.cardTitle}>
            Safety Timeline
          </Text>

          <Text style={styles.cardText}>
            View your activity
          </Text>

        </TouchableOpacity>

      </View>

    </ScrollView>
  );
};


const styles = StyleSheet.create({

  /* ================= CONTAINER ================= */

  container: {
    flex: 1,
    backgroundColor: '#F8F5FC',
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },


  /* ================= HEADER ================= */

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 35,
    marginBottom: 20,
  },

  welcome: {
    fontSize: 16,
    color: '#666',
  },

  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#7425C9',
    marginTop: 3,
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E9D9F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileText: {
    fontSize: 23,
  },


  /* ================= SAFETY STATUS ================= */

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },

  statusIcon: {
    fontSize: 35,
    marginRight: 15,
  },

  statusInfo: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#269447',
  },

  statusText: {
    color: '#666',
    marginTop: 4,
  },


  /* ================= SOS ================= */

  sosButton: {
    backgroundColor: '#D62828',
    borderRadius: 20,
    paddingVertical: 25,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 5,
  },

  sosIcon: {
    fontSize: 40,
  },

  sosText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 5,
  },

  sosSubText: {
    color: '#FFFFFF',
    marginTop: 5,
  },


  /* ================= QUICK ACTIONS ================= */

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },


  /* ================= VOICE SOS CARD ================= */

  voiceCard: {
    backgroundColor: '#F3E5F5',
    width: '48%',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#D8B4E2',
  },

  voiceIcon: {
    fontSize: 30,
    marginBottom: 10,
  },

  voiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7425C9',
  },

  voiceText: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
    lineHeight: 17,
  },


  /* ================= NORMAL CARDS ================= */

  card: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    elevation: 3,
  },

  cardIcon: {
    fontSize: 30,
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7425C9',
  },

  cardText: {
    fontSize: 12,
    color: '#777',
    marginTop: 5,
  },

});

export default HomeScreen;