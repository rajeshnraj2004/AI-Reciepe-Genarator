import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native'
import GlassBackground from '../components/GlassBackground'
import { supabase } from '../../lib/supabase'

export default function LoginScreen({ setScreen }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) Alert.alert(error.message)
  }

  return (
    <GlassBackground>

      {/* 🔙 Back */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => setScreen('onboarding')}
      >
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <View style={styles.container}>

        <Text style={styles.title}>Welcome Back 👋</Text>

        {/* ✅ CLEAN CARD (NO BLUR) */}
        <View style={styles.card}>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#888"
            style={styles.input}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
            onChangeText={setPassword}
          />

        </View>

        {/* Button */}
        <TouchableOpacity style={styles.button} onPress={login}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>

        {/* Link */}
        <TouchableOpacity onPress={() => setScreen('signup')}>
          <Text style={styles.link}>
            Don’t have an account? Sign up
          </Text>
        </TouchableOpacity>

      </View>

    </GlassBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 25,
    color: '#111',
  },

  /* ✅ SIMPLE CARD */
  card: {
    borderRadius: 25,
    padding: 20,
    backgroundColor: '#fff',

    // soft shadow
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },

    elevation: 4,
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 15,
    paddingVertical: 12,
    fontSize: 16,
  },

  button: {
    marginTop: 25,
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
  },

  btnText: {
    color: '#fff',
    fontWeight: '600',
  },

  link: {
    textAlign: 'center',
    marginTop: 20,
    color: '#555',
  },

  backBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },

  backText: {
    fontSize: 24,
  },
})