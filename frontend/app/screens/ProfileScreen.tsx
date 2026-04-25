import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import GlassBackground from '../components/GlassBackground'
import BackButton from '../components/BackButton'
import { supabase } from '../../lib/supabase'
import { StorageSync } from './HomeScreen' // Import sync manager

const IPHONE_FONT = Platform.OS === 'ios' ? 'System' : 'sans-serif'

export default function ProfileScreen({ setScreen }: any) {
  const [email, setEmail] = useState('')
  const [favCount, setFavCount] = useState(0)
  const [recipeCount, setRecipeCount] = useState(0)

  const loadStats = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? '')

      const f = await StorageSync.getItem('favorites')
      setFavCount(f ? JSON.parse(f).length : 0)

      // Changed from 'recipes' to 'history' to match our new storage logic
      const h = await StorageSync.getItem('history')
      setRecipeCount(h ? JSON.parse(h).length : 0)
    } catch (err) {
      console.warn('Profile load err:', err)
    }
  }, [])

  useEffect(() => {
    loadStats()
    
    // Subscribe to changes so stats update instantly when you remove things on other screens
    const unsubFav = StorageSync.subscribe('favorites', loadStats)
    const unsubHist = StorageSync.subscribe('history', loadStats)
    
    return () => {
      unsubFav()
      unsubHist()
    }
  }, [loadStats])

  const logout = async () => {
    await supabase.auth.signOut()
    setScreen('login')
  }

  const letter = email ? email[0].toUpperCase() : '?'

  return (
    <GlassBackground>
      <BackButton onPress={() => setScreen('home')} />

      <SafeAreaView style={styles.safe}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Profile</Text>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{letter}</Text>
          </View>
          <Text style={styles.email}>{email || 'Signed in'}</Text>

          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => setScreen('favorites')}
            activeOpacity={0.7}
          >
            <View style={styles.cardRowLeft}>
              <Ionicons name="heart" size={22} color="#FF3B30" />
              <Text style={styles.cardRowTitle}>Favorites</Text>
            </View>
            <View style={styles.cardRowRight}>
              <Text style={styles.badge}>{favCount}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => setScreen('history')}
            activeOpacity={0.7}
          >
            <View style={styles.cardRowLeft}>
              <Ionicons name="time" size={22} color="#007AFF" />
              <Text style={styles.cardRowTitle}>History</Text>
            </View>
            <View style={styles.cardRowRight}>
              <Text style={styles.badge}>{recipeCount}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Recipes Generated</Text>
            <Text style={styles.statValue}>{recipeCount}</Text>
          </View>

          <TouchableOpacity style={styles.logout} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('home')}>
          <Ionicons name="home-outline" size={26} color="#888" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('favorites')}>
          <Ionicons name="heart-outline" size={26} color="#888" />
          <Text style={styles.tabText}>Saved</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setScreen('history')}>
          <Ionicons name="time-outline" size={26} color="#888" />
          <Text style={styles.tabText}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="person" size={26} color="#000" />
          <Text style={styles.tabTextActive}>Profile</Text>
        </TouchableOpacity>
      </View>
    </GlassBackground>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContainer: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingTop: 100, paddingBottom: 140 },
  
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: IPHONE_FONT,
    color: '#000',
    marginBottom: 24,
  },
  
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#111',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  
  avatarText: { 
    color: '#fff', 
    fontSize: 36, 
    fontWeight: '600', 
    fontFamily: IPHONE_FONT 
  },
  
  email: {
    textAlign: 'center',
    fontSize: 15,
    fontFamily: IPHONE_FONT,
    color: '#444',
    marginBottom: 28,
  },
  
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  
  cardRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardRowTitle: { 
    fontSize: 17, 
    fontWeight: '600', 
    fontFamily: IPHONE_FONT,
    color: '#111' 
  },
  
  badge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    fontWeight: '700',
    fontFamily: IPHONE_FONT,
    textAlign: 'center',
    overflow: 'hidden',
    color: '#333',
    fontSize: 14,
  },
  
  statCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  
  statLabel: { 
    fontSize: 14, 
    fontFamily: IPHONE_FONT,
    color: '#666', 
    marginBottom: 6 
  },
  
  statValue: { 
    fontSize: 28, 
    fontWeight: '700', 
    fontFamily: IPHONE_FONT,
    color: '#000' 
  },
  
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  
  logoutText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16,
    fontFamily: IPHONE_FONT,
    marginLeft: 10 
  },
  
  tabContainer: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  
  tabTextActive: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: IPHONE_FONT,
    color: '#000',
    marginTop: 4,
  },
  
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: IPHONE_FONT,
    color: '#888',
    marginTop: 4,
  },
})