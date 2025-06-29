import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import { API_ENDPOINTS } from "../../config/api";
import MapScreen from "./map";

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
  return categoryColors[category] || "#f0f0f0";
}

export default function RemindersScreen(): React.ReactElement {
  const router = useRouter();

  // State management
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isMapVisible, setMapVisible] = useState(false);
  const [reminderToAssign, setReminderToAssign] = useState<string | null>(null);
  
  // New state for delete modal
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  // Load reminders on component mount
  useEffect(() => {
    loadReminders();
  }, []);

  // API Functions
  const loadReminders = async (): Promise<void> => {
    try {
      console.log("🔄 Fetching from:", API_ENDPOINTS.REMINDERS);
      const response = await fetch(API_ENDPOINTS.REMINDERS);
      console.log("📡 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Raw data received from server:", data);

        // Check if data is an array (reminders) or an object (error message)
        if (Array.isArray(data)) {
          const formattedReminders = data.map((reminder: any) => ({
            ...reminder,
            id: reminder._id,
          }));
          
          console.log("🎯 Formatted reminders:", formattedReminders);
          setReminders(formattedReminders);
        } else {
          console.error("❌ Expected array, got object:", data);
          setReminders([]); // Set empty array as fallback
          Alert.alert("Error", "Backend not returning reminder data properly");
        }
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to load reminders:", errorText);
        Alert.alert("Error", `Failed to load reminders: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Network error loading reminders:", error);
      Alert.alert("Error", "Failed to connect to server. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReminder = async (id: string): Promise<void> => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) {
      console.error("❌ Reminder not found:", id);
      return;
    }

    const updatedReminder = { ...reminder, isActive: !reminder.isActive };
    
    // Optimistic update
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? updatedReminder : r))
    );

    try {
      console.log("🔄 Updating reminder status:", id, !reminder.isActive);
      const response = await fetch(API_ENDPOINTS.REMINDER_BY_ID(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !reminder.isActive }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Reminder status updated:", result);
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to update reminder:", errorText);
        
        // Revert optimistic update
        setReminders((prev) =>
          prev.map((r) => (r.id === id ? reminder : r))
        );
        Alert.alert("Error", "Failed to update reminder status");
      }
    } catch (error) {
      console.error("❌ Network error updating reminder:", error);
      
      // Revert optimistic update
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? reminder : r))
      );
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  const addReminder = async (): Promise<void> => {
    if (!newReminderTitle.trim()) {
      Alert.alert("Error", "Please enter a reminder title");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    const newReminder = {
      title: newReminderTitle.trim(),
      category: selectedCategory,
      isActive: true,
    };

    try {
      console.log("🔄 Creating new reminder:", newReminder);
      const response = await fetch(API_ENDPOINTS.REMINDERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReminder),
      });

      if (response.ok) {
        const savedReminder = await response.json();
        console.log("✅ Reminder created:", savedReminder);
        
        // Add to local state with proper id conversion
        setReminders((prev) => [...prev, { ...savedReminder, id: savedReminder._id }]);
        
        // Reset form
        setModalVisible(false);
        setNewReminderTitle("");
        setSelectedCategory(null);
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to create reminder:", errorText);
        Alert.alert("Error", "Failed to save reminder");
      }
    } catch (error) {
      console.error("❌ Network error creating reminder:", error);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  // New delete function
  const deleteReminder = async (id: string): Promise<void> => {
    try {
      console.log("🔄 Deleting reminder:", id);
      const response = await fetch(API_ENDPOINTS.REMINDER_BY_ID(id), {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("✅ Reminder deleted successfully");
        
        // Remove from local state
        setReminders((prev) => prev.filter((r) => r.id !== id));
        
        // Close delete modal
        setDeleteModalVisible(false);
        setSelectedReminder(null);
        
        Alert.alert("Success", "Reminder deleted successfully");
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to delete reminder:", errorText);
        Alert.alert("Error", "Failed to delete reminder");
      }
    } catch (error) {
      console.error("❌ Network error deleting reminder:", error);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  // Handle reminder press
  const handleReminderPress = (reminder: Reminder): void => {
    setSelectedReminder(reminder);
    setDeleteModalVisible(true);
  };

  const onAssignLocation = async (
    reminderId: string,
    location: { latitude: number; longitude: number }
  ): Promise<void> => {
    // Optimistic update
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, location } : r))
    );

    try {
      console.log("🔄 Updating location for reminder:", reminderId, location);
      const response = await fetch(API_ENDPOINTS.REMINDER_BY_ID(reminderId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Location updated in backend:", result);
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to update location:", errorText);
        
        // Revert optimistic update
        setReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, location: undefined } : r))
        );
        Alert.alert("Error", "Failed to update location");
      }
    } catch (error) {
      console.error("❌ Network error updating location:", error);
      
      // Revert optimistic update
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, location: undefined } : r))
      );
      Alert.alert("Error", "Failed to connect to server");
    }

    // Close map modal
    setMapVisible(false);
    setReminderToAssign(null);
  };

  // UI Components
  const renderReminder = (item: Reminder) => (
    <TouchableOpacity 
      style={styles.reminderBox} 
      key={item.id}
      onPress={() => handleReminderPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.reminderContent}>
        <Text style={styles.title}>{item.title}</Text>
        {item.location && (
          <Text style={styles.locationText}>
            📍 {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
          </Text>
        )}
      </View>
      
      <View style={styles.reminderActions}>
        <Switch 
          value={item.isActive} 
          onValueChange={() => toggleReminder(item.id)} 
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={item.isActive ? "#f5dd4b" : "#f4f3f4"}
        />
        <TouchableOpacity
          style={styles.assignLocationButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering the reminder press
            setReminderToAssign(item.id);
            setMapVisible(true);
          }}
        >
          <Text style={styles.assignLocationText}>
            {item.location ? "📍" : "📍+"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const resetModal = () => {
    setModalVisible(false);
    setNewReminderTitle("");
    setSelectedCategory(null);
  };

  const resetDeleteModal = () => {
    setDeleteModalVisible(false);
    setSelectedReminder(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading reminders...</Text>
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

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
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
                      setSelectedCategory(category);
                      setModalVisible(true);
                    }}
                    style={styles.addButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {categoryReminders.length > 0 ? (
                  categoryReminders.map((item) => renderReminder(item))
                ) : (
                  <Text style={styles.emptyText}>No reminders in this category.</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={isModalVisible}
        onRequestClose={resetModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              Add {selectedCategory} Reminder
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter reminder title"
              value={newReminderTitle}
              onChangeText={setNewReminderTitle}
              autoFocus
              maxLength={100}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.button} 
                onPress={addReminder}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Add Reminder</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={resetModal}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Reminder Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={isDeleteModalVisible}
        onRequestClose={resetDeleteModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Delete Reminder</Text>
            <Text style={styles.deleteText}>
              Are you sure you want to delete "{selectedReminder?.title}"?
            </Text>
            <Text style={styles.deleteSubtext}>
              This action cannot be undone.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.deleteButton]} 
                onPress={() => selectedReminder && deleteReminder(selectedReminder.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.button} 
                onPress={resetDeleteModal}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
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
          activeOpacity={0.8}
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
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  scrollContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  categoryBox: {
    padding: 15,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categorySection: {
    marginBottom: 10,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  addButtonText: {
    color: "#333",
    fontSize: 24,
    fontWeight: "bold",
  },
  reminderBox: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderContent: {
    flex: 1,
    marginRight: 10,
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  emptyText: {
    color: "#888",
    fontStyle: "italic",
    paddingVertical: 15,
    textAlign: "center",
  },
  assignLocationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  assignLocationText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 15,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  deleteText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  deleteSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  closeMapButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});