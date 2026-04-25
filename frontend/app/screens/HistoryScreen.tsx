import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import GlassBackground from '../components/GlassBackground'
import RecipeCardImage from '../components/RecipeCardImage'
import { StorageSync, imageCache, CollapsibleSection } from './HomeScreen'
import { generateFoodImage, placeholderFoodImageUrl } from '../../lib/stabilityImage'

export default function HistoryScreen({ setScreen }: any) {
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    loadData()
    const unsub = StorageSync.subscribe('history', loadData)
    return () => { unsub() }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const data = await StorageSync.getItem('history')
      const arr = data ? JSON.parse(data) : []
      setHistory(arr)
      arr.forEach((item: any) => fetchImage(item))
    } catch (err) { console.warn(err) }
  }, [])

  const fetchImage = async (item: any) => {
    if (item.image && !item.image.startsWith('https://placehold')) {
      setHistory(prev => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: item.image } : r))
      return
    }
    if (imageCache.has(item.createdAt)) {
      setHistory(prev => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: imageCache.get(item.createdAt) } : r))
      return
    }
    try {
      const uri = await generateFoodImage(item.title, item.title, undefined)
      const finalUri = uri || placeholderFoodImageUrl(item.title, item.title)
      imageCache.set(item.createdAt, finalUri)
      setHistory(prev => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: finalUri } : r))
    } catch {
      setHistory(prev => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: placeholderFoodImageUrl(item.title, item.title) } : r))
    }
  }

  const toggleFavorite = async (index: number) => {
    const item = { ...history[index] }; item.isFav = !item.isFav;
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    setHistory(prev => prev.map((r, i) => i === index ? item : r));
    
    try {
      let favs: any[] = JSON.parse((await StorageSync.getItem('favorites')) || '[]');
      const itemId = item.createdAt || item.title;
      if (item.isFav) { 
        if (!favs.some(f => (f.createdAt || f.title) === itemId)) {
          const { image, ...recipeToSave } = item as any;
          favs.unshift(recipeToSave);
        }
      } else { 
        favs = favs.filter(f => (f.createdAt || f.title) !== itemId);
      }
      await StorageSync.setItem('favorites', JSON.stringify(favs));

      let hist: any[] = JSON.parse((await StorageSync.getItem('history')) || '[]');
      hist = hist.map(h => (h.createdAt || h.title) === itemId ? { ...h, isFav: item.isFav } : h);
      await StorageSync.setItem('history', JSON.stringify(hist));
    } catch (err) { console.warn(err); }
  }

  const removeHistory = async (index: number) => {
    const item = history[index]
    const itemId = item.createdAt || item.title;
    setHistory(prev => prev.filter((_, i) => i !== index))
    try {
      let hist: any[] = JSON.parse((await StorageSync.getItem('history')) || '[]')
      hist = hist.filter(h => (h.createdAt || h.title) !== itemId)
      await StorageSync.setItem('history', JSON.stringify(hist))

      if (item.isFav) {
        let favs: any[] = JSON.parse((await StorageSync.getItem('favorites')) || '[]')
        favs = favs.filter(f => (f.createdAt || f.title) !== itemId)
        await StorageSync.setItem('favorites', JSON.stringify(favs))
      }
      if (item.createdAt) imageCache.delete(item.createdAt)
    } catch (err) { console.warn(err) }
  }

  return (
    <GlassBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>History ⏳</Text>
        </View>

        {/* Changed to contentContainerStyle and added paddingBottom: 130 to keep last item above tabs */}
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {history.length === 0 ? (
            // Removed flex: 1 so it doesn't stretch behind the tab bar
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptySubtitle}>Your generated recipes will appear here.</Text>
            </View>
          ) : (
            history.map((item, i) => (
              <View key={item.createdAt || i} style={styles.card}>
                <RecipeCardImage uri={item.image || placeholderFoodImageUrl(item.title, '')} style={styles.image} />
                <Text style={styles.recipeTitle}>{item.title}</Text>
                <View style={styles.cardDivider} />
                
                <CollapsibleSection title="Ingredients" icon="list-outline" items={item.ingredients || []} />
                <CollapsibleSection title="Steps" icon="book-outline" items={item.steps || []} isStep />

                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.actionBtn, item.isFav && styles.actionBtnFav]} onPress={() => toggleFavorite(i)}>
                    <Ionicons name={item.isFav ? 'heart' : 'heart-outline'} size={22} color={item.isFav ? '#FF3B30' : '#555'} />
                    <Text style={[styles.actionText, item.isFav && styles.actionTextFav]}>{item.isFav ? 'Saved' : 'Save'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => removeHistory(i)}>
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
        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('favorites')}><Ionicons name="heart-outline" size={26} color="#888" /><Text style={styles.tabText}>Saved</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}><Ionicons name="time" size={26} color="#000" /><Text style={styles.tabTextActive}>History</Text></TouchableOpacity>
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
  
  // THIS IS THE FIX: Forces padding inside the scroll view instead of relying on flex
  scrollContent: { 
    paddingBottom: 140, // Extra space so the last "Remove" button is above the tab bar
  },

  // THIS IS THE FIX: Removed flex: 1 so it just wraps its content safely
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 120 // Pushes empty state down into the middle of the visible screen
  },
  
  emptyTitle: { fontSize: 20, fontWeight: '600', fontFamily: IPHONE_FONT, color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 15, fontFamily: IPHONE_FONT, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#f9f9f9', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 6 },
  image: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16 },
  recipeTitle: { fontSize: 21, fontWeight: '700', fontFamily: IPHONE_FONT, color: '#111', marginBottom: 4 },
  cardDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14 },
  actionBtnFav: { backgroundColor: '#FFF0F0' },
  actionText: { marginLeft: 6, fontSize: 15, fontWeight: '500', fontFamily: IPHONE_FONT, color: '#555' },
  actionTextFav: { color: '#FF3B30', fontWeight: '600' },
  tabContainer: { position: 'absolute', bottom: 25, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  tabTextActive: { fontSize: 12, fontWeight: '600', fontFamily: IPHONE_FONT, color: '#000', marginTop: 4 },
  tabText: { fontSize: 12, fontWeight: '500', fontFamily: IPHONE_FONT, color: '#888', marginTop: 4 },
})