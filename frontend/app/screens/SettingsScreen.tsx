import React from 'react'
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../../lib/supabase'

export default function SettingsScreen({ goBack }: any) {
  const { dark, toggleTheme, colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <View style={[styles.row, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text }}>Dark Mode</Text>
        <Switch value={dark} onValueChange={toggleTheme} />
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goBack}>
        <Text style={{ color: colors.subtext, marginTop:20 }}>Back</Text>
      </TouchableOpacity>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex:1, padding:20 },
  row: {
    padding:20,
    borderRadius:12,
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    marginBottom:20,
  },
  button: { padding:15, borderRadius:12, alignItems:'center' },
  buttonText: { color:'#fff', fontWeight:'bold' },
})