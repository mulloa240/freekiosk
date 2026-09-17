/**
 * Pantalla de auto-diagnóstico de compatibilidad, accesible desde el
 * emparejamiento (antes de tener token) para evaluar un equipo nuevo. Reusa la
 * misma sección que Ajustes → Avanzado.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { DiagnosticsSection } from '../components/DiagnosticsSection';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Diagnostics'>;

const DiagnosticsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hasTVPreferredFocus style={styles.back}>
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Diagnóstico de compatibilidad</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <DiagnosticsSection />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12151c' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  back: { paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: '#8b93a7', fontSize: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
});

export default DiagnosticsScreen;
