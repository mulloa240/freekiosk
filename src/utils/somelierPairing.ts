/*
 * Emparejamiento de dispositivos (plataforma Somelier, ADR 0005 — Fase C).
 *
 * El equipo inicia el emparejamiento contra admin-api, muestra casillas para el
 * código que entrega el admin (visible en el portal) y, al validarlo, recibe el
 * device-JWT. Ese token se guarda como la URL del kiosko (misma clave que la
 * config manual), así el resto del flujo del shell no cambia.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOMELIER_ADMIN_API_URL } from '../config/somelier';

const INSTALL_ID_KEY = '@somelier_install_id';

// UUID v4 simple (suficiente para un identificador de instalación persistente).
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** ID de instalación persistente del equipo (se crea una vez). */
export async function getInstallId(): Promise<string> {
  let id = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (!id) {
    id = uuidv4();
    await AsyncStorage.setItem(INSTALL_ID_KEY, id);
  }
  return id;
}

export interface DeviceIdentity {
  deviceName: string;
  model: string;
  installId: string;
}

/** Identidad del equipo para que el admin lo reconozca en el portal. */
export async function getDeviceIdentity(defaultName?: string): Promise<DeviceIdentity> {
  const constants = (Platform as unknown as { constants?: Record<string, string> }).constants ?? {};
  const brand = constants.Brand ?? constants.Manufacturer ?? '';
  const model = [brand, constants.Model].filter(Boolean).join(' ') || 'Android';
  return {
    deviceName: defaultName?.trim() || model,
    model,
    installId: await getInstallId(),
  };
}

export interface PairingSession {
  sessionId: string;
  codeLength: number;
  expiresAt: string;
}

function apiUrl(path: string): string {
  return `${SOMELIER_ADMIN_API_URL.replace(/\/$/, '')}${path}`;
}

/** Inicia una sesión de emparejamiento; devuelve sessionId + largo del código. */
export async function initPairing(
  tenantId: string,
  codeLength: 6 | 8,
  deviceName?: string,
): Promise<PairingSession> {
  if (!SOMELIER_ADMIN_API_URL) {
    throw new Error('La URL del servidor no está configurada en la app.');
  }
  const identity = await getDeviceIdentity(deviceName);
  const res = await fetch(apiUrl('/pairing/sessions'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: tenantId.trim() || undefined, codeLength, ...identity }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo iniciar el emparejamiento (${res.status}).`);
  }
  return (await res.json()) as PairingSession;
}

export interface PairingResult {
  deviceToken: string;
  deviceId: string;
}

export type PairingError =
  | { kind: 'invalid'; message: string }
  | { kind: 'expired'; message: string }
  | { kind: 'network'; message: string };

/**
 * Valida el código. Lanza un PairingError tipado:
 * - 'invalid' (400): código incorrecto, quedan intentos.
 * - 'expired' (410): sesión expirada o sin intentos → hay que generar otro.
 * - 'network': error de red / servidor.
 */
export async function validatePairing(sessionId: string, code: string): Promise<PairingResult> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`/pairing/sessions/${sessionId}/validate`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
  } catch {
    throw { kind: 'network', message: 'Sin conexión con el servidor. Reintentá.' } as PairingError;
  }
  if (res.ok) {
    return (await res.json()) as PairingResult;
  }
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  const message = body.message ?? `Error ${res.status}`;
  if (res.status === 410) throw { kind: 'expired', message } as PairingError;
  if (res.status === 400) throw { kind: 'invalid', message } as PairingError;
  throw { kind: 'network', message } as PairingError;
}
