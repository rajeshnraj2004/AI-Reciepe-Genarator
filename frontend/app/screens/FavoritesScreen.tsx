import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import GlassBackground from '../components/GlassBackground'
import RecipeCardImage from '../components/RecipeCardImage'
import { StorageSync, imageCache, CollapsibleSection } from './HomeScreen'
import { generateFoodImage, placeholderFoodImageUrl } from '../../lib/stabilityImage'

export default function FavoritesScreen({ setScreen }: any) {
  const [favorites, setFavorites] = useState<any[]>([])

  useEffect(() => {
    loadData()
    const unsub = StorageSync.subscribe('favorites', loadData)
    return () => { unsub() }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const data = await StorageSync.getItem('favorites')
      const arr = data ? JSON.parse(data) : []
      
      setFavorites(arr)
      
      // Trigger image fetch for ALL items since they are saved without images
      arr.forEach((item: any) => fetchImage(item))
    } catch (err) { console.warn('Fav load err:', err) }
  }, [])

  const fetchImage = async (item: any) => {
    // 1. If we already have it in memory cache, use it immediately
    if (imageCache.has(item.createdAt)) {
      setFavorites(prev => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: imageCache.get(item.createdAt) } : r))
      return
    }

    // 2. Otherwise, fetch from Stability AI
    try {
      const uri = await generateFoodImage(item.title, item.title, undefined)
      const finalUri = uri || placeholderFoodImageUrl(item.title, item.title)
      
      // Save to memory cache so we don't fetch it again this session
      imageCache.set(item.createdAt, finalUri)
      
      // Update the UI with the real image
      setFavorites(prev => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: finalUri } : r))
    } catch {
      // Fallback to placeholder if API fails
      setFavorites(prev => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: placeholderFoodImageUrl(item.title, item.title) } : r))
    }
  }

  const removeFavorite = async (index: number) => {
    const item = favorites[index]
    setFavorites(prev => prev.filter((_, i) => i !== index))
    try {
      // 1. Remove from Favorites Storage
      let favs: any[] = JSON.parse((await StorageSync.getItem('favorites')) || '[]')
      favs = favs.filter(f => f.createdAt !== item.createdAt)
      await StorageSync.setItem('favorites', JSON.stringify(favs))

      // 2. Un-favorite in History Storage
      let history: any[] = JSON.parse((await StorageSync.getItem('history')) || '[]')
      history = history.map(h => h.createdAt === item.createdAt ? { ...h, isFav: false } : h)
      await StorageSync.setItem('history', JSON.stringify(history))
      
      imageCache.delete(item.createdAt)
    } catch (err) { console.warn('Fav remove err:', err) }
  }

  // Helper to check if an image is still loading (fallback placeholder)
  const isImageLoading = (imageUri: string | undefined) => {
    return !imageUri || imageUri.includes('placehold.co')
  }

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Saved Recipes ❤️</Text>
        </View>

        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {favorites.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No saved recipes</Text>
              <Text style={styles.emptySubtitle}>Generate a recipe and tap Save to see it here.</Text>
            </View>
          ) : (
            favorites.map((item, i) => (
              <View key={item.createdAt || i} style={styles.card}>
                <View style={styles.imageWrap}>
                  <RecipeCardImage 
                    uri={item.image || placeholderFoodImageUrl(item.title, '')} 
                    style={styles.image} 
                  />
                  {/* Show a small loader over the image while the AI generates it */}
                  {isImageLoading(item.image) && (
                    <View style={styles.imageLoader}>
                      <ActivityIndicator size="small" color="#000" />
                    </View>
                  )}
                </View>

                <Text style={styles.recipeTitle}>{item.title}</Text>
                <View style={styles.cardDivider} />
                
                <CollapsibleSection title="Ingredients" icon="list-outline" items={item.ingredients || []} />
                <CollapsibleSection title="Steps" icon="book-outline" items={item.steps || []} isStep />

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => removeFavorite(i)}>
                    <Ionicons name="trash-outline" size={22} color="#555" />
                    <Text style={styles.actionText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('home')}><Ionicons name="home-outline" size={26} color="#888" /><Text style={styles.tabText}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}><Ionicons name="heart" size={26} color="#000" /><Text style={styles.tabTextActive}>Saved</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('history')}><Ionicons name="time-outline" size={26} color="#888" /><Text style={styles.tabText}>History</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('profile')}><Ionicons name="person-outline" size={26} color="#888" /><Text style={styles.tabText}>Profile</Text></TouchableOpacity>
      </View>
    </GlassBackground>
  )
}

const IPHONE_FONT = Platform.OS === 'ios' ? 'System' : 'sans-serif'
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '700', fontFamily: IPHONE_FONT, color: '#000' },
  container: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 140 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  emptyTitle: { fontSize: 20, fontWeight: '600', fontFamily: IPHONE_FONT, color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 15, fontFamily: IPHONE_FONT, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#f9f9f9', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 6 },
  
  // Added wrapper to position the loading spinner correctly
  imageWrap: { 
    position: 'relative', 
    marginBottom: 16 
  },
  image: { width: '100%', height: 180, borderRadius: 16 },
  
  // Small loading indicator that sits in the center of the image placeholder
  imageLoader: { 
    position: 'absolute', 
    top: 0, left: 0, right: 0, bottom: 0, 
    justifyContent: 'center', alignItems: 'center', 
    borderRadius: 16, 
    backgroundColor: 'rgba(255, 255, 255, 0.6)' 
  },

  recipeTitle: { fontSize: 21, fontWeight: '700', fontFamily: IPHONE_FONT, color: '#111', marginBottom: 4 },
  cardDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14 },
  actionText: { marginLeft: 6, fontSize: 15, fontWeight: '500', fontFamily: IPHONE_FONT, color: '#555' },
  tabContainer: { position: 'absolute', bottom: 25, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  tabTextActive: { fontSize: 12, fontWeight: '600', fontFamily: IPHONE_FONT, color: '#000', marginTop: 4 },
  tabText: { fontSize: 12, fontWeight: '500', fontFamily: IPHONE_FONT, color: '#888', marginTop: 4 },
})