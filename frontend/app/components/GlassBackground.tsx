import React from 'react'
import { View, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export default function GlassBackground({ children }: any) {
  return (
    <View style={styles.container}>

      {/* 🌿 Top Left Gradient */}
      <LinearGradient
        colors={['#d4fc79', 'transparent']}
        style={styles.topLeft}
      />

      {/* 🌸 Bottom Right Gradient */}
      <LinearGradient
        colors={['#fbc2eb', 'transparent']}
        style={styles.bottomRight}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {children}
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa', // clean center
  },

  content: {
    flex: 1,
  },

  topLeft: {
    position: 'absolute',
    width: 250,
    height: 250,
    top: -50,
    left: -50,
    borderRadius: 200,
  },

  bottomRight: {
    position: 'absolute',
    width: 300,
    height: 300,
    bottom: -80,
    right: -80,
    borderRadius: 250,
  },
})