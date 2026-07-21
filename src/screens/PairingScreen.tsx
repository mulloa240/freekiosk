import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { StorageService } from '../utils/storage';
import { buildSomelierUrl } from '../config/somelier';
import {
  initPairing,
  validatePairing,
  type PairingError,
  type PairingSession,
} from '../utils/somelierPairing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Pairing'>;

// mm:ss restante hasta expiresAt (o 0).
function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

const PairingScreen: React.FC<{ navigation: Nav }> = ({ navigation }) => {
  const [step, setStep] = useState<'tenant' | 'code'>('tenant');
  const [tenantId, setTenantId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [codeLength, setCodeLength] = useState<6 | 8>(6);
  const [session, setSession] = useState<PairingSession | undefined>(undefined);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const codeInputRef = useRef<TextInput>(null);

  // Cuenta regresiva de expiración del código.
  useEffect(() => {
    if (step !== 'code' || !session) return;
    const tick = () => {
      const s = secondsLeft(session.expiresAt);
      setRemaining(s);
      if (s <= 0) setExpired(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [step, session]);

  const start = async () => {
    setError(undefined);
    setBusy(true);
    try {
      const s = await initPairing(tenantId, codeLength, deviceName);
      setSession(s);
      setCode('');
      setExpired(false);
      setStep('code');
      setTimeout(() => codeInputRef.current?.focus(), 300);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!session || code.length !== session.codeLength) return;
    setError(undefined);
    setBusy(true);
    try {
      const { deviceToken } = await validatePairing(session.sessionId, code);
      // Éxito: se guarda el token como URL del kiosko y se entra al kiosko.
      await StorageService.saveUrl(buildSomelierUrl(deviceToken));
      navigation.reset({ index: 0, routes: [{ name: 'Kiosk' }] });
    } catch (e) {
      const err = e as PairingError;
      if (err.kind === 'expired') {
        setExpired(true);
        setError(err.message);
      } else {
        setError(err.message);
        setCode('');
        codeInputRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  };

  const boxes = Array.from({ length: session?.codeLength ?? codeLength });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emparejar dispositivo</Text>

      {step === 'tenant' ? (
        <View style={styles.card}>
          <Text style={styles.label}>ID de la cuenta (tenant)</Text>
          <TextInput
            style={styles.input}
            value={tenantId}
            onChangeText={setTenantId}
            placeholder="Ej: mi-empresa (o dejar vacío)"
            placeholderTextColor="#8b93a7"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Nombre del equipo (opcional)</Text>
          <TextInput
            style={styles.input}
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Ej: Tablet Barra"
            placeholderTextColor="#8b93a7"
          />
          <Text style={styles.label}>Largo del código</Text>
          <View style={styles.row}>
            {[6, 8].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.choice, codeLength === n && styles.choiceActive]}
                onPress={() => setCodeLength(n as 6 | 8)}
              >
                <Text style={styles.choiceText}>{n} dígitos</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.primary} onPress={start} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Continuar</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.help}>
            Pedile el código al administrador (lo ve en el portal) e ingresalo acá antes de que expire.
          </Text>

          {/* Casillas visibles; el input real es invisible y captura el código. */}
          <Pressable style={styles.boxes} onPress={() => codeInputRef.current?.focus()}>
            {boxes.map((_, i) => (
              <View key={i} style={[styles.box, code.length === i && styles.boxActive]}>
                <Text style={styles.boxText}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={codeInputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={(t) =>
              setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, session?.codeLength ?? 6))
            }
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="visible-password"
            maxLength={session?.codeLength ?? 6}
            editable={!expired}
          />

          {!expired ? (
            <Text style={styles.timer}>
              Expira en {String(Math.floor(remaining / 60)).padStart(2, '0')}:
              {String(remaining % 60).padStart(2, '0')}
            </Text>
          ) : (
            <Text style={styles.expired}>El código expiró.</Text>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          {expired ? (
            <TouchableOpacity style={styles.primary} onPress={start} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Generar nuevo código</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primary, code.length !== (session?.codeLength ?? 6) && styles.disabled]}
              onPress={submitCode}
              disabled={busy || code.length !== (session?.codeLength ?? 6)}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Validar</Text>}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setStep('tenant')}>
            <Text style={styles.link}>‹ Volver</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12151c', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 20 },
  card: { width: '100%', maxWidth: 460, backgroundColor: '#1b1f2a', borderRadius: 14, padding: 22, gap: 12 },
  label: { color: '#8b93a7', fontSize: 13, marginTop: 6 },
  help: { color: '#c3c9d6', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  input: {
    backgroundColor: '#12151c', color: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2a2f3a', fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2a2f3a', alignItems: 'center' },
  choiceActive: { borderColor: '#6ea8fe', backgroundColor: 'rgba(110,168,254,0.12)' },
  choiceText: { color: '#fff', fontSize: 14 },
  boxes: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 10 },
  box: {
    width: 40, height: 52, borderRadius: 8, borderWidth: 1, borderColor: '#2a2f3a', backgroundColor: '#12151c',
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: { borderColor: '#6ea8fe' },
  boxText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  timer: { color: '#7bd88f', textAlign: 'center', fontVariant: ['tabular-nums'] },
  expired: { color: '#ff9d9d', textAlign: 'center' },
  error: { color: '#ff9d9d', textAlign: 'center', fontSize: 13 },
  primary: { backgroundColor: '#3b6fd4', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  link: { color: '#8b93a7', textAlign: 'center', marginTop: 18, fontSize: 14 },
});

export default PairingScreen;
