import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, FlatList, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Constants from 'expo-constants';
import * as Permissions from 'expo-permissions';
import { Audio } from 'expo-av';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function PersonalAssistantApp() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [tasks, setTasks] = useState({});
  const [sound, setSound] = useState(null);

  useEffect(() => {
    // Request necessary permissions
    const getPermissions = async () => {
      if (Platform.OS === 'android') {
        await Permissions.askAsync(Permissions.AUDIO_RECORDING);
      }
      await Notifications.requestPermissionsAsync();
    };
    getPermissions();
  }, []);

  // Function to play alarm sound
  const playAlarmSound = async () => {
    try {
      console.log('Loading Sound');
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3' }
      );
      setSound(sound);
      console.log('Playing Sound');
      await sound.playAsync();
    } catch (error) {
      console.error('Error loading or playing sound:', error);
      Alert.alert('Error', 'Unable to play alarm sound.');
    }
  };

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const scheduleReminder = (date, time, title) => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }

    const eventDateTime = new Date(`${date}T${time.toISOString().split('T')[1]}`);
    const alarmTime = new Date(eventDateTime.getTime() - 15 * 60 * 1000); // 15 minutes before

    Notifications.scheduleNotificationAsync({
      content: { title: 'Upcoming Event', body: `${title} starts in 15 minutes!` },
      trigger: { date: alarmTime },
    });

    const timeUntilAlarm = alarmTime.getTime() - new Date().getTime();
    if (timeUntilAlarm > 0) {
      setTimeout(playAlarmSound, timeUntilAlarm);
    } else {
      playAlarmSound();
    }

    const newTask = { title, time };
    setTasks((prevTasks) => {
      const updatedTasks = { ...prevTasks };
      if (!updatedTasks[date]) {
        updatedTasks[date] = [];
      }
      updatedTasks[date].push(newTask);
      updatedTasks[date].sort((a, b) => a.time - b.time); // Sort by time
      return updatedTasks;
    });

    // Clear the task title input
    setTaskTitle('');

    Alert.alert('Reminder Set!', `Event '${title}' added on ${date} at ${time.toLocaleTimeString()}`);
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{ [selectedDate]: { selected: true } }}
      />
      {selectedDate && (
        <View>
          <TextInput
            placeholder="Enter Task Title"
            value={taskTitle}
            onChangeText={setTaskTitle}
            style={{ borderWidth: 1, marginVertical: 10, padding: 10 }}
          />
          <Button title="Select Time" onPress={() => setDatePickerVisibility(true)} />
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="time"
            onConfirm={(time) => {
              setSelectedTime(time);
              setDatePickerVisibility(false);
            }}
            onCancel={() => setDatePickerVisibility(false)}
          />
          <Button
            title="Set Reminder"
            onPress={() => scheduleReminder(selectedDate, selectedTime, taskTitle)}
          />

          <Text style={{ fontWeight: 'bold', marginTop: 20 }}>Today's Schedule:</Text>
          <FlatList
            data={tasks[selectedDate] || []}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Text>
                {item.time.toLocaleTimeString()} - {item.title}
              </Text>
            )}
          />
        </View>
      )}
    </View>
  );
}
