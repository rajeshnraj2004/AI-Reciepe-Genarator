import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'

export default function BackButton({ onPress }: any) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.text}>← Back</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },

  text: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
})