import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

const SplashScreen = ({ onFinish }) => {

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>

      {/* App Logo */}
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
      />

      {/* Loading Text */}
      <Text style={styles.loadingText}>
        Loading...
      </Text>

      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
      </View>

    </View>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#090712',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 320,
    height: 500,
    resizeMode: 'contain',
  },

  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: -60,
    letterSpacing: 0.5,
  },

  loadingContainer: {
    width: 80,
    height: 4,
    backgroundColor: '#2A2035',
    borderRadius: 10,
    marginTop: 12,
    overflow: 'hidden',
  },

  loadingDot: {
    width: 25,
    height: 4,
    backgroundColor: '#E85DFF',
    borderRadius: 10,
  },

});

export default SplashScreen;