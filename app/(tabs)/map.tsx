import * as Location from "expo-location";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Keyboard,
  Alert,
} from "react-native";
import MapView, { Marker, Region, MapPressEvent } from "react-native-maps";

// --- Type Definitions ---
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

type MapScreenProps = {
  reminders: Reminder[];
  onAssignLocation: (
    reminderId: string,
    location: { latitude: number; longitude: number }
  ) => Promise<void>;
  reminderToAssign: string | null;
};

type SearchResult = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

// --- Component ---
export default function MapScreen({
  reminders,
  onAssignLocation,
  reminderToAssign,
}: MapScreenProps): React.ReactElement {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchMarker, setSearchMarker] = useState<{ latitude: number; longitude: number; title: string } | null>(null);

  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request permission and fetch user location
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

  // Search functionality using Nominatim (OpenStreetMap)
  const searchLocation = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(data.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Search Error", "Failed to search location. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(text);
    }, 500);
  };

  // Handle selecting a search result
  const handleSearchResultSelect = (result: SearchResult) => {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    // Update map region with larger delta for better visibility
    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };

    // Update region state first
    setRegion(newRegion);
    
    // Then animate to the new region
    setTimeout(() => {
      mapRef.current?.animateToRegion(newRegion, 1500);
    }, 100);

    // Add search marker
    setSearchMarker({
      latitude,
      longitude,
      title: result.display_name.split(',')[0], // Get the first part of the address
    });

    // Clear search UI completely
    setSearchQuery(result.display_name.split(',')[0]);
    setSearchResults([]);
    setShowSearchResults(false);
    Keyboard.dismiss();
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchMarker(null);
    Keyboard.dismiss();
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    if (searchQuery.length >= 3) {
      setShowSearchResults(true);
    }
  };

  // Handle search input blur
  const handleSearchBlur = () => {
    // Delay hiding results to allow tapping on them
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  const handleMapPress = (event: MapPressEvent) => {
    // Don't handle map press if search results are showing
    if (showSearchResults) {
      setShowSearchResults(false);
      return;
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setModalVisible(true);
  };

  const handleAssignLocation = async (reminderId: string) => {
    if (!selectedLocation) return;

    await onAssignLocation(reminderId, selectedLocation);
    setSelectedLocation(null);
    setModalVisible(false);
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a location..."
            value={searchQuery}
            onChangeText={handleSearchInput}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            returnKeyType="search"
            onSubmitEditing={() => searchLocation(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
          {isSearching && (
            <ActivityIndicator size="small" color="#007AFF" style={styles.searchLoader} />
          )}
        </View>

        {/* Search Results */}
        {showSearchResults && (
          <View style={styles.searchResultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSearchResultSelect(item)}
                >
                  <Text style={styles.searchResultText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              style={styles.searchResultsList}
            />
          </View>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        showsUserLocation
        onPress={handleMapPress}
        onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
        pointerEvents={showSearchResults ? "none" : "auto"}
      >
        {/* User marker */}
        <Marker
          coordinate={{
            latitude: region.latitude,
            longitude: region.longitude,
          }}
          title="You are here"
        />

        {/* Search result marker */}
        {searchMarker && (
          <Marker
            coordinate={{
              latitude: searchMarker.latitude,
              longitude: searchMarker.longitude,
            }}
            title={searchMarker.title}
            description="Search result"
            pinColor="green"
          />
        )}

        {/* All reminders with saved location */}
        {(reminders ?? [])
          .filter((r) => r.location)
          .map((r) => (
            <Marker
              key={r.id}
              coordinate={{
                latitude: r.location!.latitude,
                longitude: r.location!.longitude,
              }}
              title={r.title}
              description={r.category}
              pinColor="orange"
            />
          ))}

        {/* Selected marker preview */}
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected"
            pinColor="blue"
          />
        )}
      </MapView>

      {/* Modal to assign selected location to a reminder */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Assign to Reminder</Text>
            <FlatList
              data={reminders}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.reminderItem}
                  onPress={() => handleAssignLocation(item.id)}
                >
                  <Text>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={{ color: "red" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Styles ---
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
  searchContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 5,
    marginLeft: 10,
  },
  clearButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "bold",
  },
  searchLoader: {
    marginLeft: 10,
  },
  searchResultsContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 200,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultText: {
    fontSize: 14,
    color: "#333",
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