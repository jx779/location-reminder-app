import React, { useState, useEffect } from "react";
import {
  Button,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import MapScreen from "./map";
import { API_ENDPOINTS } from "../../config/api";
const API_URL = "http://172.20.10.2:5000/api/reminders";

type Reminder = {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
};

const categoryColors: Record<string, string> = {
  Travel: "#d2e7ed",
  Events: "#fce1f4",
  Work: "#d4efc2",
};

const categories: string[] = ["Travel", "Events", "Work"];

function getColorForCategory(category: string): string {
  return categoryColors[category];
}

export default function RemindersScreen(): React.ReactElement {
  const router = useRouter();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isMapVisible, setMapVisible] = useState(false);
  const [reminderToAssign, setReminderToAssign] = useState<string | null>(null);

  // Load reminders from backend on component mount
  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async (): Promise<void> => {
    try {
      const response = await fetch(API_ENDPOINTS.REMINDERS);
      if (response.ok) {
        const data = await response.json();
        const formattedReminders = data.map((reminder: any) => ({
          ...reminder,
          id: reminder._id,
        }));
        setReminders(formattedReminders);
      } else {
        console.error("Failed to load reminders");
        Alert.alert("Error", "Failed to load reminders");
      }
    } catch (error) {
      console.error("Error loading reminders:", error);
      Alert.alert("Error", "Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReminder = async (id: string): Promise<void> => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const updatedReminder = { ...reminder, isActive: !reminder.isActive };
    
    // Optimistic update
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? updatedReminder : r))
    );

    try {
      const response = await fetch(API_ENDPOINTS.REMINDER_BY_ID(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !reminder.isActive }),
      });

      if (!response.ok) {
        // Revert on failure
        setReminders((prev) =>
          prev.map((r) => (r.id === id ? reminder : r))
        );
        Alert.alert("Error", "Failed to update reminder");
      }
    } catch (error) {
      console.error("Error updating reminder:", error);
      // Revert on failure
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? reminder : r))
      );
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  const addReminder = async (): Promise<void> => {
    if (!newReminderTitle.trim() || !selectedCategory) {
      Alert.alert("Error", "Please enter a title and select a category");
      return;
    }

    const newReminder = {
      title: newReminderTitle.trim(),
      category: selectedCategory,
      isActive: true,
    };

    try {
      const response = await fetch(API_ENDPOINTS.REMINDERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReminder),
      });

      if (response.ok) {
        const savedReminder = await response.json();
        setReminders((prev) => [...prev, { ...savedReminder, id: savedReminder._id }]);
        console.log("✅ Reminder saved:", savedReminder);
        
        setModalVisible(false);
        setNewReminderTitle("");
        setSelectedCategory(null);
      } else {
        Alert.alert("Error", "Failed to save reminder");
      }
    } catch (error) {
      console.error("❌ Failed to save reminder:", error);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  const onAssignLocation = async (
    reminderId: string,
    location: { latitude: number; longitude: number }
  ) => {
    // Optimistic update
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, location } : r))
    );

    try {
      const response = await fetch(API_ENDPOINTS.REMINDER_BY_ID(reminderId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Location updated in backend:", result);
      } else {
        Alert.alert("Error", "Failed to update location");
        // Revert the optimistic update
        setReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, location: undefined } : r))
        );
      }
    } catch (error) {
      console.error("❌ Failed to update location:", error);
      Alert.alert("Error", "Failed to connect to server");
      // Revert the optimistic update
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, location: undefined } : r))
      );
    }

    setMapVisible(false);
    setReminderToAssign(null);
  };

  const renderReminder = ({ item }: { item: Reminder }) => (
    <View style={styles.reminderBox} key={item.id}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        {item.location && (
          <Text style={styles.locationText}>
            📍 {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
          </Text>
        )}
      </View>
      <Switch value={item.isActive} onValueChange={() => toggleReminder(item.id)} />
      <TouchableOpacity
        style={styles.assignLocationButton}
        onPress={() => {
          setReminderToAssign(item.id);
          setMapVisible(true);
        }}
      >
        <Text style={styles.assignLocationText}>
          {item.location ? "📍" : "📍+"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading reminders...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/ImageBackground.jpg")}
      style={styles.container}
      imageStyle={{ opacity: 0.2 }}
      resizeMode="cover"
    >
      <Text style={styles.header}>Reminders</Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}>
        {categories.map((category) => {
          const categoryReminders = reminders.filter((r) => r.category === category);

          return (
            <View
              key={category}
              style={[styles.categoryBox, { backgroundColor: getColorForCategory(category) }]}
            >
              <View style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(true);
                      setSelectedCategory(category);
                    }}
                    style={styles.addButton}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {categoryReminders.length > 0 ? (
                  categoryReminders.map((item) => <View key={item.id}>{renderReminder({ item })}</View>)
                ) : (
                  <Text style={styles.emptyText}>No reminders in this category.</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal for adding reminders */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Add Reminder</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter reminder title"
              value={newReminderTitle}
              onChangeText={setNewReminderTitle}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={addReminder}>
                <Text style={styles.buttonText}>Add Reminder</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for MapScreen */}
      <Modal 
        visible={isMapVisible} 
        animationType="slide" 
        onRequestClose={() => setMapVisible(false)}
      >
        <MapScreen 
          reminders={reminders} 
          onAssignLocation={onAssignLocation}
          reminderToAssign={reminderToAssign}
        />
        <TouchableOpacity 
          style={styles.closeMapButton} 
          onPress={() => setMapVisible(false)}
        >
          <Text style={styles.buttonText}>Close Map</Text>
        </TouchableOpacity>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  categoryBox: {
    padding: 15,
    borderRadius: 20,
    marginBottom: 20,
    paddingTop: 5,
    paddingBottom: 0,
  },
  categorySection: {
    marginBottom: 10,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addButtonText: {
    color: "black",
    fontSize: 30,
  },
  reminderBox: {
    backgroundColor: "#f2f2f2",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
  },
  locationText: {
    fontSize: 12,
    color: "gray",
    marginTop: 2,
  },
  emptyText: {
    color: "gray",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  assignLocationButton: {
    marginLeft: 10,
    padding: 8,
  },
  assignLocationText: {
    fontSize: 18,
  },
  closeMapButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
});