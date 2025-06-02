import auth from "@react-native-firebase/auth";
import { router } from 'expo-router';
import { JSX, useState } from 'react';
import {
  Button,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type Reminder = {
  id: number;
  title: string;
  category: string;
  isActive: boolean;
};

const categoryColors: Record<string, string> = {
  Travel: '#d2e7ed',
  Events: '#fce1f4',
  Work: '#d4efc2',
};

const categories: string[] = ['Travel', 'Events', 'Work'];

function getColorForCategory(category: string): string {
  return categoryColors[category];
}

export default function RemindersScreen(): JSX.Element {
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: 1, title: 'Home', category: 'Travel', isActive: true },
    { id: 2, title: 'Team meeting at 10am', category: 'Work', isActive: false },
    { id: 3, title: 'Birthday party on Saturday', category: 'Events', isActive: true },
  ]);

  const toggleReminder = (id: number): void => {
    setReminders(prev =>
      prev.map(reminder =>
        reminder.id === id ? { ...reminder, isActive: !reminder.isActive } : reminder
      )
    );
  };

  const addReminder = (category: string): void => {
    if (!categoryColors[category]) return;

    const newReminder = {
      id: Date.now(),
      title: 'New Reminder',
      category,
      isActive: true,
    };
    setReminders(prev => [...prev, newReminder]);
  };

  const renderReminder = ({ item }: { item: Reminder }): JSX.Element => (
    <View style={styles.reminderBox}>
      <Text style={styles.title}>{item.title}</Text>
      <Switch value={item.isActive} onValueChange={() => toggleReminder(item.id)} />
    </View>
  );

  return (
    <ImageBackground
      source={require('../../assets/images/ImageBackground.jpg')}
      style={styles.container}
      imageStyle={{ opacity: 0.2 }}
      resizeMode="cover"
    >
      <Text style={styles.header}>Reminders</Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}>
        {categories.map(category => {
          const categoryReminders = reminders.filter(r => r.category === category);

          return (
            <View key={category} style={[styles.categoryBox, { backgroundColor: getColorForCategory(category) }]}>
              <View style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <TouchableOpacity onPress={() => addReminder(category)} style={styles.addButton}>
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {categoryReminders.length > 0 ? (
                  categoryReminders.map(item => (
                    <View key={item.id}>{renderReminder({ item })}</View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No reminders in this category.</Text>
                )}
              </View>
            </View>
          );
        })}
        <Button
          title="Logout"
          onPress={async () => {
            try {
              await auth().signOut();
              router.replace('/(auth)');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }}
        />
      </ScrollView>
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
    fontWeight: 'bold',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addButtonText: {
    color: 'black',
    fontSize: 30,
  },
  reminderBox: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
  },
  emptyText: {
    color: 'gray',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
});