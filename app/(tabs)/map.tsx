import * as Location from "expo-location";
import React, { JSX, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
} from "react-native";
import MapView, { Marker, Region, MapPressEvent } from "react-native-maps";
import { getReminders, updateReminderLocation, Reminder } from "../../utils/api"; // Adjust path if needed

export default function MapScreen(): JSX.Element {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Request location permission + fetch current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  // Fetch reminders from backend
  useEffect(() => {
    getReminders()
      .then(setReminders)
      .catch((err) => console.error("❌ Failed to load reminders:", err));
  }, []);

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setModalVisible(true);
  };

  const assignLocationToReminder = async (reminderId: string) => {
    if (!selectedLocation) return;

    try {
      const updated = await updateReminderLocation(reminderId, selectedLocation);
      console.log("✅ Reminder location updated:", updated);

      // Refresh reminders after update
      setReminders((prev) =>
        prev.map((r) => (r._id === reminderId ? { ...r, location: selectedLocation } : r))
      );

      setModalVisible(false);
      setSelectedLocation(null);
    } catch (err) {
      console.error("❌ Failed to update reminder:", err);
    }
  };

  if (!region) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading map...</Text>
        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation
        onPress={handleMapPress}
      >
        {/* User’s location marker */}
        <Marker
          coordinate={{
            latitude: region.latitude,
            longitude: region.longitude,
          }}
          title="You are here"
        />

        {/* All reminders with locations */}
        {reminders
          .filter((r) => r.location)
          .map((r) => (
            <Marker
              key={r._id}
              coordinate={{
                latitude: r.location!.latitude,
                longitude: r.location!.longitude,
              }}
              title={r.title}
              description={r.category}
              pinColor="orange"
            />
          ))}

        {/* Temp selected marker */}
        {selectedLocation && (
          <Marker coordinate={selectedLocation} title="Selected" pinColor="blue" />
        )}
      </MapView>

      {/* Modal to assign selected location to a reminder */}
      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Assign to Reminder</Text>
            <FlatList
              data={reminders}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.reminderItem}
                  onPress={() => assignLocationToReminder(item._id)}
                >
                  <Text>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
              <Text style={{ color: "red" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    marginTop: 10,
    color: "red",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  reminderItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  cancelButton: {
    marginTop: 15,
    alignItems: "center",
  },
});
