import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';

const EmergencyScreen = ({ navigation }) => {

  const makeCall = (number, name) => {
    Alert.alert(
      `Call ${name}?`,
      `Do you want to call ${number}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${number}`).catch(() => {
              Alert.alert(
                'Call Error',
                'Unable to open the phone application.'
              );
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>

      {/* Header */}

      <Text style={styles.icon}>
        📞
      </Text>

      <Text style={styles.title}>
        Emergency Contacts
      </Text>

      <Text style={styles.subtitle}>
        Quickly contact emergency services when you need help.
      </Text>

      {/* Emergency 112 */}

      <TouchableOpacity
        style={styles.emergencyCard}
        onPress={() => makeCall('112', 'Emergency Services')}
        activeOpacity={0.8}
      >

        <View style={styles.numberCircle}>
          <Text style={styles.numberText}>
            112
          </Text>
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>
            Emergency Services
          </Text>

          <Text style={styles.contactDescription}>
            Police, ambulance and emergency assistance
          </Text>
        </View>

        <Text style={styles.callIcon}>
          📞
        </Text>

      </TouchableOpacity>

      {/* Police */}

      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => makeCall('100', 'Police')}
        activeOpacity={0.8}
      >

        <Text style={styles.cardIcon}>
          👮
        </Text>

        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>
            Police
          </Text>

          <Text style={styles.contactDescription}>
            Emergency police assistance
          </Text>

          <Text style={styles.phoneNumber}>
            100
          </Text>
        </View>

        <Text style={styles.callIcon}>
          📞
        </Text>

      </TouchableOpacity>

      {/* Ambulance */}

      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => makeCall('108', 'Ambulance')}
        activeOpacity={0.8}
      >

        <Text style={styles.cardIcon}>
          🚑
        </Text>

        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>
            Ambulance
          </Text>

          <Text style={styles.contactDescription}>
            Medical emergency assistance
          </Text>

          <Text style={styles.phoneNumber}>
            108
          </Text>
        </View>

        <Text style={styles.callIcon}>
          📞
        </Text>

      </TouchableOpacity>

      {/* Women Helpline */}

      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => makeCall('181', 'Women Helpline')}
        activeOpacity={0.8}
      >

        <Text style={styles.cardIcon}>
          👩
        </Text>

        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>
            Women Helpline
          </Text>

          <Text style={styles.contactDescription}>
            Women safety and support
          </Text>

          <Text style={styles.phoneNumber}>
            181
          </Text>
        </View>

        <Text style={styles.callIcon}>
          📞
        </Text>

      </TouchableOpacity>

      {/* Information */}

      <View style={styles.infoCard}>

        <Text style={styles.infoTitle}>
          🛡️ Emergency Safety
        </Text>

        <Text style={styles.infoText}>
          In a serious emergency, use the SOS feature
          to share your location with your trusted
          contacts.
        </Text>

      </View>

      {/* Back */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>
          ← Back to Home
        </Text>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FFF9FC',
    paddingHorizontal: 20,
    paddingTop: 55,
  },

  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 8,
  },

  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#222222',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 25,
  },

  emergencyCard: {
    backgroundColor: '#D62828',
    borderRadius: 16,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    marginBottom: 14,
  },

  numberCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  numberText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#D62828',
  },

  contactInfo: {
    flex: 1,
    marginLeft: 14,
  },

  contactTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333333',
  },

  emergencyCardTitle: {
    color: '#FFFFFF',
  },

  contactDescription: {
    fontSize: 12,
    color: '#777777',
    marginTop: 4,
    lineHeight: 17,
  },

  phoneNumber: {
    fontSize: 13,
    color: '#7425C9',
    fontWeight: 'bold',
    marginTop: 5,
  },

  callIcon: {
    fontSize: 23,
    marginLeft: 8,
  },

  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    marginBottom: 12,
  },

  cardIcon: {
    fontSize: 32,
    width: 45,
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: '#F1E8FA',
    borderRadius: 15,
    padding: 17,
    marginTop: 5,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7425C9',
  },

  infoText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 19,
    marginTop: 7,
  },

  backButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },

  backText: {
    color: '#444444',
    fontSize: 16,
    fontWeight: '600',
  },

});

export default EmergencyScreen;