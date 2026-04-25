import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, Image, FlatList, Dimensions
} from 'react-native'
import { BlurView } from 'expo-blur'
import GlassBackground from '../components/GlassBackground'

const { width } = Dimensions.get('window')

const slides = [
  {
    title: '🍳 ChefGPT',
    bold: 'AI Recipe Generator',
    subtitle: 'Turn your ingredients into delicious meals instantly',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
  },
  {
    title: '🥗 Smart Cooking',
    bold: 'Personalized Recipes',
    subtitle: 'Get recipes based on what you have at home',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
  },
  {
    title: '⚡ Fast & Easy',
    bold: 'Cook Better Everyday',
    subtitle: 'Save time and cook healthy with AI guidance',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
  },
]

export default function OnboardingScreen({ setScreen }: any) {
  const [index, setIndex] = useState(0)

  return (
    <GlassBackground>

      {/* 🔙 Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => setScreen('login')}
      >
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => i.toString()}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width)
          setIndex(i)
        }}
        renderItem={({ item, index: i }) => (
          <View style={styles.slide}>

            <BlurView intensity={60} tint="light" style={styles.card}>

              <Image source={{ uri: item.image }} style={styles.image} />

              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.bold}>{item.bold}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>

              {/* ✅ Navigate to Login */}
              {i === slides.length - 1 && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => setScreen('login')}
                >
                  <Text style={styles.btnText}>Get Started</Text>
                </TouchableOpacity>
              )}

            </BlurView>

          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { opacity: index === i ? 1 : 0.3 }
            ]}
          />
        ))}
      </View>

    </GlassBackground>
  )
}

const styles = StyleSheet.create({
  slide: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* 💎 Glass Card */
  card: {
    width: '85%',
    padding: 25,
    borderRadius: 30,

    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },

    elevation: 8,
  },

  image: {
    width: '100%',
    height: 160,
    borderRadius: 20,
    marginBottom: 20,
  },

  title: {
    fontSize: 18,
    color: '#444',
  },

  bold: {
    fontSize: 26,
    fontWeight: '600',
    color: '#111',
  },

  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },

  button: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
  },

  btnText: {
    color: '#fff',
    fontWeight: '600',
  },

  /* 🔙 Back Button */
  backBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },

  backText: {
    fontSize: 24,
    color: '#000',
  },

  /* Dots */
  dots: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignSelf: 'center',
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#000',
    margin: 5,
  },
})