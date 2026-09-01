import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMELINE_KEY = '@sakhi_safety_timeline';

const SafetyTimelineScreen = ({ navigation }) => {

  const [events, setEvents] = useState([]);

  const loadEvents = async () => {
    try {
      const savedEvents =
        await AsyncStorage.getItem(TIMELINE_KEY);

      if (savedEvents) {
        setEvents(JSON.parse(savedEvents));
      } else {
        setEvents([]);
      }

    } catch (error) {
      console.log('Timeline loading error:', error);
    }
  };

  React.useEffect(() => {
    const unsubscribe =
      navigation.addListener('focus', loadEvents);

    return unsubscribe;
  }, [navigation]);

  const openEvent = (event) => {
    Alert.alert(
      event.title,
      event.details || event.description,
      [
        {
          text: 'OK',
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      <Text style={styles.headerIcon}>
        🗺️
      </Text>

      <Text style={styles.title}>
        Safety Timeline
      </Text>

      <Text style={styles.subtitle}>
        Your safety events and activity history
      </Text>

      <View style={styles.dateCard}>

        <Text style={styles.dateIcon}>
          📅
        </Text>

        <View>
          <Text style={styles.dateTitle}>
            Safety Activity
          </Text>

          <Text style={styles.dateText}>
            {events.length} event(s) recorded
          </Text>
        </View>

      </View>

      {events.length === 0 ? (

        <View style={styles.emptyCard}>

          <Text style={styles.emptyIcon}>
            🛡️
          </Text>

          <Text style={styles.emptyTitle}>
            No Safety Events Yet
          </Text>

          <Text style={styles.emptyText}>
            Safety events will appear here when you
            use features such as SOS and Live Location.
          </Text>

        </View>

      ) : (

        <View style={styles.timeline}>

          {events.map((event, index) => (

            <TouchableOpacity
              key={event.id}
              style={styles.timelineItem}
              onPress={() => openEvent(event)}
              activeOpacity={0.75}
            >

              {index !== events.length - 1 && (
                <View style={styles.line} />
              )}

              <View style={styles.timelineIcon}>

                <Text style={styles.iconText}>
                  {event.icon || '🛡️'}
                </Text>

              </View>

              <View style={styles.timelineContent}>

                <Text style={styles.time}>
                  {event.time}
                </Text>

                <Text style={styles.itemTitle}>
                  {event.title}
                </Text>

                <Text style={styles.description}>
                  {event.description}
                </Text>

                <Text style={styles.viewDetails}>
                  Tap to view details →
                </Text>

              </View>

            </TouchableOpacity>

          ))}

        </View>

      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>
          ← Back to Home
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
    paddingBottom: 35,
  },

  headerIcon: {
    fontSize: 50,
    textAlign: 'center',
    marginBottom: 10,
  },

  title: {
    fontSize: 28,
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

  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    marginBottom: 25,
  },

  dateIcon: {
    fontSize: 32,
    marginRight: 14,
  },

  dateTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#7425C9',
  },

  dateText: {
    fontSize: 13,
    color: '#777777',
    marginTop: 4,
  },

  timeline: {
    paddingLeft: 5,
  },

  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
    minHeight: 110,
  },

  line: {
    position: 'absolute',
    left: 25,
    top: 52,
    bottom: 0,
    width: 2,
    backgroundColor: '#D9C8EB',
  },

  timelineIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E9D9F8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  iconText: {
    fontSize: 23,
  },

  timelineContent: {
    flex: 1,
    marginLeft: 15,
    paddingBottom: 25,
  },

  time: {
    fontSize: 12,
    color: '#888888',
  },

  itemTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 3,
  },

  description: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 19,
    marginTop: 5,
  },

  viewDetails: {
    fontSize: 12,
    color: '#7425C9',
    fontWeight: 'bold',
    marginTop: 7,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    elevation: 3,
  },

  emptyIcon: {
    fontSize: 45,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333333',
  },

  emptyText: {
    fontSize: 13,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },

  backButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  backText: {
    color: '#444444',
    fontSize: 16,
    fontWeight: '600',
  },

});

export default SafetyTimelineScreen;