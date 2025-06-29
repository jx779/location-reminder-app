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
  const [selectedProximity, setSelectedProximity] = useState<number>(10); // Default 10 meters
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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=&dedupe=1`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'LocationReminderApp/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON format');
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      setSearchResults(data);
      setShowSearchResults(data.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      
      let errorMessage = "Failed to search location. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          errorMessage = "Search service temporarily unavailable. Please try again later.";
        } else if (error.message.includes('HTTP')) {
          errorMessage = "Network error. Please check your connection.";
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert("Search Error", errorMessage);
      
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(text);
    }, 500);
  };

  // Handle selecting a search result
  const handleSearchResultSelect = (result: SearchResult) => {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setRegion(newRegion);

    setSearchMarker({
      latitude,
      longitude,
      title: result.display_name.split(',')[0],
    });

    setTimeout(() => {
      mapRef.current?.animateToRegion(newRegion, 1000);
    }, 50);

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
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  // FIXED: Enhanced map press handler - always show modal
  const handleMapPress = (event: MapPressEvent) => {
    console.log("Map pressed!", event.nativeEvent.coordinate);
    console.log("showSearchResults:", showSearchResults);
    
    // Don't handle map press if search results are showing
    if (showSearchResults) {
      console.log("Search results showing, hiding them");
      setShowSearchResults(false);
      return;
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;
    console.log("Setting selected location:", { latitude, longitude });
    
    setSelectedLocation({ latitude, longitude });
    console.log("Setting modal visible to true");
    setModalVisible(true);
  };

  const handleAssignLocation = async (reminderId: string) => {
    if (!selectedLocation) return;

    // Include proximity in the location data
    const locationWithProximity = {
      ...selectedLocation,
      proximity: selectedProximity
    };

    await onAssignLocation(reminderId, locationWithProximity);
    setSelectedLocation(null);
    setModalVisible(false);
    setSelectedProximity(10); // Reset to default
  };

  // Debug: Add a test button to manually trigger modal
  const testModal = () => {
    console.log("Test modal button pressed");
    setSelectedLocation({ latitude: 37.7749, longitude: -122.4194 });
    setModalVisible(true);
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
      {/* Debug button - remove this once working */}
      <TouchableOpacity 
        style={styles.debugButton} 
        onPress={testModal}
      >
        <Text style={styles.debugButtonText}>Test Modal</Text>
      </TouchableOpacity>

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
        showsUserLocation={true}
        onPress={handleMapPress}
        onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
        // FIXED: Removed the pointerEvents restriction that was blocking map taps
        // pointerEvents={showSearchResults ? "none" : "auto"}
      >
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

      {/* Modal to assign selected location to a reminder with proximity selection */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          console.log("Modal close requested");
          setModalVisible(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Set Location Reminder</Text>
            
            {/* Location Info */}
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                📍 Location: {selectedLocation?.latitude.toFixed(6)}, {selectedLocation?.longitude.toFixed(6)}
              </Text>
            </View>

            {/* Proximity Selection */}
            <View style={styles.proximitySection}>
              <Text style={styles.sectionTitle}>Select Proximity Range</Text>
              <Text style={styles.proximityDescription}>
                You'll be notified when you're within this distance
              </Text>
              
              <View style={styles.proximityOptions}>
                {[1, 10, 25, 50].map((distance) => (
                  <TouchableOpacity
                    key={distance}
                    style={[
                      styles.proximityOption,
                      selectedProximity === distance && styles.selectedProximityOption
                    ]}
                    onPress={() => setSelectedProximity(distance)}
                  >
                    <Text style={[
                      styles.proximityOptionText,
                      selectedProximity === distance && styles.selectedProximityOptionText
                    ]}>
                      {distance}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reminder Selection */}
            <View style={styles.reminderSelection}>
              <Text style={styles.sectionTitle}>Choose Reminder</Text>
              <FlatList
                data={reminders}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.reminderItem}
                    onPress={() => handleAssignLocation(item.id)}
                  >
                    <View style={styles.reminderItemContent}>
                      <Text style={styles.reminderTitle}>{item.title}</Text>
                      <Text style={styles.reminderCategory}>{item.category}</Text>
                    </View>
                    <Text style={styles.selectText}>Select →</Text>
                  </TouchableOpacity>
                )}
                style={styles.reminderList}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => {
                  console.log("Cancel button pressed");
                  setModalVisible(false);
                  setSelectedProximity(10); // Reset
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
    borderRadius: 15,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  locationInfo: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  proximitySection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  proximityDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 15,
  },
  proximityOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  proximityOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
    minWidth: 60,
    alignItems: "center",
  },
  selectedProximityOption: {
    borderColor: "#007AFF",
    backgroundColor: "#007AFF",
  },
  proximityOptionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedProximityOptionText: {
    color: "white",
  },
  reminderSelection: {
    marginBottom: 20,
  },
  reminderList: {
    maxHeight: 150,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fafafa",
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderItemContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  reminderCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  selectText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  actionButtons: {
    alignItems: "center",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  // Debug styles - remove these once working
  debugButton: {
    position: "absolute",
    top: 200,
    right: 20,
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    zIndex: 1001,
  },
  debugButtonText: {
    color: "white",
    fontSize: 12,
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
});