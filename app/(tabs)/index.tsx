import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import MapScreen from "./map"; // Adjust path if needed

type Reminder = {
  id: number;
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

export default function RemindersScreen(): JSX.Element {
  const router = useRouter();

  const [reminders, setReminders] = useState<Reminder[]>([
    { id: 1, title: "Home", category: "Travel", isActive: true },
    { id: 2, title: "Team meeting at 10am", category: "Work", isActive: false },
    { id: 3, title: "Birthday party on Saturday", category: "Events", isActive: true },
  ]);

  const [isModalVisible, setModalVisible] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // For showing the Map modal
  const [isMapVisible, setMapVisible] = useState(false);
  // Store the reminder ID we want to assign a location for
  const [reminderToAssign, setReminderToAssign] = useState<number | null>(null);

  const toggleReminder = (id: number): void => {
    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id ? { ...reminder, isActive: !reminder.isActive } : reminder
      )
    );
  };

  const addReminder = (): void => {
    if (newReminderTitle.trim() && selectedCategory) {
      const newReminder = {
        id: Date.now(),
        title: newReminderTitle,
        category: selectedCategory,
        isActive: true,
      };
      setReminders((prev) => [...prev, newReminder]);
      setModalVisible(false);
      setNewReminderTitle("");
      setSelectedCategory(null);
    }
  };

  // Called from MapScreen when user picks a location
  const onAssignLocation = (
    reminderId: number,
    location: { latitude: number; longitude: number }
  ) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, location } : r))
    );
    setMapVisible(false);
    setReminderToAssign(null);
  };

  const renderReminder = ({ item }: { item: Reminder }) => (
    <View style={styles.reminderBox} key={item.id}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        {item.location && (
          <Text style={styles.locationText}>
            Location: {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
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
        <Text style={{ color: "blue" }}>Set Location</Text>
      </TouchableOpacity>
    </View>
  );

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
      {isModalVisible && (
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
              <Button title="Add Reminder" onPress={addReminder} />
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </Modal>
      )}

      {/* Modal for MapScreen */}
      {isMapVisible && reminderToAssign !== null && (
        <Modal visible={isMapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
          <MapScreen reminders={reminders} onAssignLocation={onAssignLocation} />
          <Button title="Close Map" onPress={() => setMapVisible(false)} />
        </Modal>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 5,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
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
  assignLocationButton: {
    marginLeft: 10,
  },
});
