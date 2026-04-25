import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, Platform,
  Animated, Easing,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import GlassBackground from '../components/GlassBackground'
import RecipeCardImage from '../components/RecipeCardImage'
import { supabase } from '../../lib/supabase'
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  generateFoodImage,
  placeholderFoodImageUrl,
} from '../../lib/stabilityImage'

const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ""
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null
const model = genAI?.getGenerativeModel({ model: "gemini-2.5-flash" }) ?? null

function extractJsonObject(text: string): string {
  const trimmed = text.trim()
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  if (fence) return fence[1].trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

// ==========================================
// ASYNC STORAGE EVENT EMITTER (FIXES CURSORWINDOW BUG)
// ==========================================
const StorageEvents = {
  listeners: new Map<string, Set<() => void>>(),
  subscribe(key: string, cb: () => void) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    this.listeners.get(key)!.add(cb)
    return () => this.listeners.get(key)?.delete(cb)
  },
  emit(key: string) { this.listeners.get(key)?.forEach(cb => cb()) },
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, value)
    this.emit(key)
  },
  async getItem(key: string) { return await AsyncStorage.getItem(key) },
}
export const StorageSync = StorageEvents

// MEMORY IMAGE CACHE
export const imageCache = new Map<string, string>()

// ==========================================
// UI COMPONENTS
// ==========================================
export const ThinkingDots = () => {
  const d1 = useRef(new Animated.Value(0)).current
  const d2 = useRef(new Animated.Value(0)).current
  const d3 = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const run = (d: Animated.Value, del: number) => Animated.loop(Animated.sequence([Animated.delay(del), Animated.timing(d, { toValue: 1, duration: 400, useNativeDriver: true }), Animated.timing(d, { toValue: 0, duration: 400, useNativeDriver: true }), Animated.delay(200)])).start()
    run(d1, 0); run(d2, 150); run(d3, 300)
  }, [])
  const s = (v: Animated.Value) => ({ width: 10, height: 10, borderRadius: 5, backgroundColor: '#000', marginHorizontal: 4, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }] })
  return (<View style={{ flexDirection: 'row', alignItems: 'center' }}><Animated.View style={s(d1)} /><Animated.View style={s(d2)} /><Animated.View style={s(d3)} /></View>)
}

export const PulseBackground = () => {
  const p = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(p, { toValue: 1, duration: 1500, useNativeDriver: true }), Animated.timing(p, { toValue: 0, duration: 1500, useNativeDriver: true })])).start() }, [])
  return (<Animated.View style={[styles.pulseBg, { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.02] }) }] }]} />)
}

export const ShimmerLine = ({ w = '80%' }: { w?: any }) => {
  const s = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.loop(Animated.timing(s, { toValue: 1, duration: 1200, useNativeDriver: true })).start() }, [])
  return (<View style={{ width: w, height: 14, borderRadius: 7, backgroundColor: '#e8e8e8', overflow: 'hidden', marginBottom: 10 }}><Animated.View style={{ width: 120, height: '100%', borderRadius: 7, backgroundColor: '#d0d0d0', transform: [{ translateX: s.interpolate({ inputRange: [0, 1], outputRange: [-300, 300] }) }] }} /></View>)
}

export const CollapsibleSection = ({ title, icon, items, isStep }: { title: string; icon: string; items: string[]; isStep?: boolean }) => {
  const [exp, setExp] = useState(false)
  const limit = 3
  const show = exp ? items : items.slice(0, limit)
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color="#333" />
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.itemCount}>{items.length}</Text>
      </View>
      {show.map((item: string, idx: number) => (
        <View key={idx} style={styles.itemRow}>
          <Text style={styles.itemBullet}>{isStep ? `${idx + 1}.` : '•'}</Text>
          <Text style={styles.textRow}>{item}</Text>
        </View>
      ))}
      {items.length > limit && (
        <TouchableOpacity style={styles.showMoreBtn} onPress={() => setExp(!exp)} activeOpacity={0.7}>
          <Text style={styles.showMoreText}>{exp ? 'Show less' : `+ ${items.length - limit} more`}</Text>
          <Ionicons name={exp ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ==========================================
// MAIN SCREEN
// ==========================================
export default function HomeScreen({ setScreen }: any) {
  const [email, setEmail] = useState('')
  const [input, setInput] = useState('')
  const [imageReq, setImageReq] = useState('')
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [liveDishImage, setLiveDishImage] = useState<string | null>(null)
  const [thinkStage, setThinkStage] = useState(0)

  useEffect(() => { getUser(); loadData() }, [])
  useEffect(() => {
    const u1 = StorageSync.subscribe('history', loadData)
    return () => { u1() }
  }, [])

  useEffect(() => {
    if (!loading) { setThinkStage(0); return }
    setThinkStage(0); let i = 0
    const iv = setInterval(() => { i = (i + 1) % 5; setThinkStage(i) }, 2200)
    return () => clearInterval(iv)
  }, [loading])

  const thinkMsgs = ['Understanding your craving...', 'Crafting the perfect recipe...', 'Selecting fresh ingredients...', 'Writing step-by-step instructions...', 'Plating up your recipe...']

  const getUser = async () => {
    try { const { data: { user } } = await supabase.auth.getUser(); setEmail(user?.email || '') } catch { setEmail('') }
  }

  const firstLetter = email ? email[0].toUpperCase() : '?'

  const loadData = useCallback(async () => {
    try {
      const h = await StorageSync.getItem('history')
      const arr = h ? JSON.parse(h) : []
      setRecipes(arr)
      arr.forEach((item: any) => fetchAndCacheImage(item, setRecipes))
    } catch (err) { console.warn('loadData err:', err) }
  }, [])

  const fetchAndCacheImage = async (item: any, setter: any) => {
    if (item.image && !item.image.startsWith('https://placehold')) {
      setter((prev: any[]) => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: item.image } : r))
      return
    }
    if (imageCache.has(item.createdAt)) {
      setter((prev: any[]) => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: imageCache.get(item.createdAt) } : r))
      return
    }
    try {
      const uri = await generateFoodImage(item.title, item.title, undefined)
      const finalUri = uri || placeholderFoodImageUrl(item.title, item.title)
      imageCache.set(item.createdAt, finalUri)
      setter((prev: any[]) => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: finalUri } : r))
    } catch {
      const fallback = placeholderFoodImageUrl(item.title, item.title)
      imageCache.set(item.createdAt, fallback)
      setter((prev: any[]) => prev.map(r => r.createdAt === item.createdAt ? { ...r, image: fallback } : r))
    }
  }

  const generateRecipe = async () => {
    const food = input.trim()
    if (!food) return Alert.alert('Missing input', 'Enter a food name')
    if (!model) return Alert.alert('Error', 'Gemini API key missing')

    setLoading(true); setLiveDishImage(null)

    try {
      const imagePromise = generateFoodImage(food, food, imageReq.trim() || undefined, (uri) => setLiveDishImage(uri))
      const textPromise = model.generateContent(`Give recipe for "${food}" in JSON: {"title":"Name","ingredients":["item 1"],"steps":["step 1"]}. ONLY JSON.`)
      const [imgRes, txtRes] = await Promise.allSettled([imagePromise, textPromise])

      if (txtRes.status === 'rejected') { Alert.alert('Error', 'Failed text gen'); return }
      let parsed: any
      try { parsed = JSON.parse(extractJsonObject(txtRes.value.response.text())) } catch { Alert.alert('Error', 'Bad format'); return }
      if (!parsed.title || !parsed.ingredients?.length || !parsed.steps?.length) { Alert.alert('Error', 'Incomplete recipe'); return }

      const aiImage = imgRes.status === 'fulfilled' ? imgRes.value : null
      const image = aiImage || placeholderFoodImageUrl(parsed.title, food)

      const newRecipe = { title: parsed.title, ingredients: parsed.ingredients, steps: parsed.steps, image, isFav: false, createdAt: new Date().toISOString() }
      imageCache.set(newRecipe.createdAt, image)

      const updatedList = [newRecipe, ...(recipes || [])]
      setRecipes(updatedList)

      try {
        const safeList = updatedList.map(({ image: _, ...rest }: any) => rest)
        await StorageSync.setItem('history', JSON.stringify(safeList))
      } catch (err) { console.warn(err) }

      setInput(''); setImageReq('')
    } catch (e) { console.error(e); Alert.alert('Error', 'Something went wrong') }
    finally { setLiveDishImage(null); setLoading(false) }
  }

  const toggleFavorite = async (index: number) => {
    const item = { ...recipes[index] }; item.isFav = !item.isFav;
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    setRecipes(prev => prev.map((r, i) => i === index ? item : r));
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

      let history: any[] = JSON.parse((await StorageSync.getItem('history')) || '[]');
      history = history.map(h => (h.createdAt || h.title) === itemId ? { ...h, isFav: item.isFav } : h);
      await StorageSync.setItem('history', JSON.stringify(history));
    } catch (err) { console.warn(err); }
  }

  const removeRecipe = async (index: number) => {
    const item = recipes[index]
    const itemId = item.createdAt || item.title;
    setRecipes(prev => prev.filter((_, i) => i !== index))
    try {
      let history: any[] = JSON.parse((await StorageSync.getItem('history')) || '[]')
      history = history.filter(h => (h.createdAt || h.title) !== itemId)
      await StorageSync.setItem('history', JSON.stringify(history))
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
          <Text style={styles.title}>ChefGPT🍳</Text>
          <TouchableOpacity style={styles.profileCircle} onPress={() => setScreen('profile')} accessibilityRole="button">
            <Text style={styles.profileText}>{firstLetter}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.inputWrap}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput placeholder="What are you craving?" placeholderTextColor="#888" style={styles.input} value={input} onChangeText={setInput} returnKeyType="done" editable={!loading} />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="color-palette-outline" size={20} color="#888" />
            <TextInput placeholder="Image style (e.g. moody, vibrant)" placeholderTextColor="#888" style={styles.input} value={imageReq} onChangeText={setImageReq} returnKeyType="done" editable={!loading} />
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={generateRecipe} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : (
              <><Text style={styles.buttonText}>Generate Recipe</Text><Ionicons name="sparkles" size={20} color="#fff" style={{ marginLeft: 8 }} /></>
            )}
          </TouchableOpacity>

          {loading && (
            <View style={styles.thinkingCard}>
              <PulseBackground />
              <View style={styles.thinkingContent}>
                <View style={styles.thinkingIconWrap}>
                  <Ionicons name="restaurant" size={32} color="#000" />
                  <View style={styles.thinkingBadge}><ThinkingDots /></View>
                </View>
                <Text style={styles.thinkingTitle}>{input.trim() || 'Your dish'}</Text>
                <View style={styles.thinkingStageWrap}>
                  <Ionicons name="flash" size={16} color="#666" />
                  <Text style={styles.thinkingStageText}>{thinkMsgs[thinkStage]}</Text>
                </View>
                <View style={styles.shimmerBlock}>
                  <ShimmerLine w="60%" /><ShimmerLine w="85%" /><ShimmerLine w="75%" /><ShimmerLine w="90%" /><ShimmerLine w="50%" />
                </View>
                <View style={styles.imageStatusRow}>
                  <ActivityIndicator size="small" color="#888" />
                  <Text style={styles.imageStatusText}>Generating image with Stability AI...</Text>
                </View>
              </View>
            </View>
          )}

          {loading && liveDishImage && (
            <View style={styles.liveImageWrap}>
              <View style={styles.liveImageHeader}>
                <Text style={styles.liveImageLabel}>✨ AI-Generated Preview</Text>
                <View style={styles.liveImageBadge}><ActivityIndicator size="small" color="#000" /><Text style={styles.liveImageBadgeText}>Processing</Text></View>
              </View>
              <RecipeCardImage uri={liveDishImage} style={styles.liveImage} />
            </View>
          )}

          {recipes.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}><Ionicons name="restaurant-outline" size={56} color="#bbb" /></View>
              <Text style={styles.emptyTitle}>No recipes yet</Text>
              <Text style={styles.emptySubtitle}>Enter a dish name above to generate your first recipe!</Text>
            </View>
          )}

          {recipes.map((item, i) => (
            <View key={item.createdAt || i} style={styles.card}>
              <RecipeCardImage uri={item.image || placeholderFoodImageUrl(item.title, '')} style={styles.image} />
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleLeft}>
                  <Ionicons name="pricetag" size={16} color="#333" />
                  <Text style={styles.recipeTitle}>{item.title}</Text>
                </View>
                <Text style={styles.cardTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.cardDivider} />
              <CollapsibleSection title="Ingredients" icon="list-outline" items={item.ingredients || []} />
              <CollapsibleSection title="Steps" icon="book-outline" items={item.steps || []} isStep />
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, item.isFav && styles.actionBtnFav]} onPress={() => toggleFavorite(i)}>
                  <Ionicons name={item.isFav ? 'heart' : 'heart-outline'} size={22} color={item.isFav ? '#FF3B30' : '#555'} />
                  <Text style={[styles.actionText, item.isFav && styles.actionTextFav]}>{item.isFav ? 'Saved' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => removeRecipe(i)}>
                  <Ionicons name="trash-outline" size={22} color="#555" />
                  <Text style={styles.actionText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={styles.tabItem}><Ionicons name="home" size={26} color="#000" /><Text style={styles.tabTextActive}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('favorites')}><Ionicons name="heart-outline" size={26} color="#888" /><Text style={styles.tabText}>Saved</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('history')}><Ionicons name="time-outline" size={26} color="#888" /><Text style={styles.tabText}>History</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('profile')}><Ionicons name="person-outline" size={26} color="#888" /><Text style={styles.tabText}>Profile</Text></TouchableOpacity>
      </View>
    </GlassBackground>
  )
}

const IPHONE_FONT = Platform.OS === 'ios' ? 'System' : 'sans-serif'

// ==========================================
// COMPLETELY FIXED STYLES (No warnings)
// ==========================================
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '700', fontFamily: IPHONE_FONT, color: '#000', letterSpacing: 0.5 },
  profileCircle: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 
  },
  profileText: { color: '#fff', fontSize: 18, fontWeight: '600', fontFamily: IPHONE_FONT },
  container: { padding: 20, paddingBottom: 130 },
  inputWrap: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 
  },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, fontFamily: IPHONE_FONT, marginLeft: 10, color: '#000' },
  button: { 
    flexDirection: 'row', justifyContent: 'center', backgroundColor: '#000', padding: 16, borderRadius: 18, alignItems: 'center', marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600', fontFamily: IPHONE_FONT },
  
  thinkingCard: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  pulseBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f5f5f0' },
  thinkingContent: { padding: 24, alignItems: 'center', position: 'relative' },
  thinkingIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 16, position: 'relative' },
  thinkingBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', borderRadius: 12, padding: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  thinkingTitle: { fontSize: 22, fontWeight: '700', fontFamily: IPHONE_FONT, color: '#111', marginBottom: 8, textTransform: 'capitalize' },
  thinkingStageWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
  thinkingStageText: { fontSize: 14, fontFamily: IPHONE_FONT, color: '#666', fontWeight: '500' },
  shimmerBlock: { width: '100%', alignSelf: 'flex-start', marginTop: 4 },
  imageStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8e8e8' },
  imageStatusText: { fontSize: 13, fontFamily: IPHONE_FONT, color: '#888' },

  liveImageWrap: { marginBottom: 20, backgroundColor: '#fff', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  liveImageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  liveImageLabel: { fontSize: 15, fontWeight: '600', fontFamily: IPHONE_FONT, color: '#333' },
  liveImageBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 6 },
  liveImageBadgeText: { fontSize: 12, fontFamily: IPHONE_FONT, color: '#666', fontWeight: '500' },
  liveImage: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#f5f5f5' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '600', fontFamily: IPHONE_FONT, color: '#333', marginTop: 8 },
  emptySubtitle: { fontSize: 15, fontFamily: IPHONE_FONT, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  card: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#f9f9f9', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 6 },
  image: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  recipeTitle: { fontSize: 21, fontWeight: '700', fontFamily: IPHONE_FONT, color: '#111', flex: 1 },
  cardTime: { fontSize: 12, fontFamily: IPHONE_FONT, color: '#999', marginTop: 4 },
  cardDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 14 },

  sectionBlock: { marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 10, gap: 6 },
  heading: { fontSize: 16, fontWeight: '600', fontFamily: IPHONE_FONT, color: '#222' },
  itemCount: { fontSize: 12, fontFamily: IPHONE_FONT, color: '#aaa', fontWeight: '500', backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 'auto' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: 10 },
  itemBullet: { fontSize: 15, fontFamily: IPHONE_FONT, color: '#999', width: 24, textAlign: 'right', paddingTop: 2, marginRight: 6 },
  textRow: { fontSize: 15, fontFamily: IPHONE_FONT, color: '#444', lineHeight: 22, flex: 1 },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f8f8f8', gap: 4 },
  showMoreText: { fontSize: 14, fontFamily: IPHONE_FONT, color: '#666', fontWeight: '500' },

  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14 },
  actionBtnFav: { backgroundColor: '#FFF0F0' },
  actionText: { marginLeft: 6, fontSize: 15, fontWeight: '500', fontFamily: IPHONE_FONT, color: '#555' },
  actionTextFav: { color: '#FF3B30', fontWeight: '600' },

  tabContainer: { 
    position: 'absolute', bottom: 25, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  tabTextActive: { fontSize: 12, fontWeight: '600', fontFamily: IPHONE_FONT, color: '#000', marginTop: 4 },
  tabText: { fontSize: 12, fontWeight: '500', fontFamily: IPHONE_FONT, color: '#888', marginTop: 4 },
})