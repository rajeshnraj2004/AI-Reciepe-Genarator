import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native'
import GlassBackground from '../components/GlassBackground'
import { supabase } from '../../lib/supabase'

export default function SignupScreen({ setScreen }: any) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const signUp = async () => {
    if (!email || !password) {
      return Alert.alert('Error', 'Enter email & password')
    }

    if (password.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters')
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      Alert.alert('Signup Failed', error.message)
    } else {
      Alert.alert('Success', 'Check your email')
      setScreen('login')
    }
  }

  return (
    <GlassBackground>

      {/* 🔙 Back */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => setScreen('login')}
      >
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <View style={styles.container}>

        <Text style={styles.title}>Create Account ✨</Text>

        {/* SAME CARD AS LOGIN */}
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

        {/* SAME BUTTON STYLE */}
        <TouchableOpacity style={styles.button} onPress={signUp}>
          <Text style={styles.btnText}>
            {loading ? 'Creating...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        {/* SAME LINK STYLE */}
        <TouchableOpacity onPress={() => setScreen('login')}>
          <Text style={styles.link}>
            Already have an account? Login
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

  /* SAME CARD */
  card: {
    borderRadius: 25,
    padding: 20,
    backgroundColor: '#fff',

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
    color: '#000',
  },
})