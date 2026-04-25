import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { supabase } from './lib/supabase'

import OnboardingScreen from './app/screens/OnboardingScreen'
import LoginScreen from './app/screens/LoginScreen'
import SignupScreen from './app/screens/SignupScreen'
import HomeScreen from './app/screens/HomeScreen'
import ProfileScreen from './app/screens/ProfileScreen'
import FavoritesScreen from './app/screens/FavoritesScreen'
import HistoryScreen from './app/screens/HistoryScreen'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState<
    'onboarding' | 'login' | 'signup' | 'home' | 'profile' | 'favorites' | 'history'
  >('onboarding')

  useEffect(() => {
    // get session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // listen auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)

        if (session) {
          setScreen('home') // auto redirect after login
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  // 🔐 NOT LOGGED IN
  if (!session) {
    if (screen === 'login') return <LoginScreen setScreen={setScreen} />
    if (screen === 'signup') return <SignupScreen setScreen={setScreen} />

    return <OnboardingScreen setScreen={setScreen} />
  }

  // ✅ LOGGED IN
  if (screen === 'profile') return <ProfileScreen setScreen={setScreen} />
  if (screen === 'favorites') return <FavoritesScreen setScreen={setScreen} />
  if (screen === 'history') return <HistoryScreen setScreen={setScreen} />

  return <HomeScreen setScreen={setScreen} />
}