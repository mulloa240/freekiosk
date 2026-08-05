/*
 * Copia DURADERA del contenido asignado (plataforma Somelier).
 *
 * El kiosk-client guarda el contenido que debe mostrar en el `localStorage` de
 * su WebView. Eso no es duradero de verdad: Android puede evacuarlo por presión
 * de almacenamiento, se pierde al limpiar los datos del WebView y no sobrevive
 * un cambio de origen de la URL. Cuando eso pasaba, el equipo quedaba en blanco
 * y había que re-asignarle el contenido a mano desde el portal.
 *
 * Acá se guarda una copia en el almacenamiento NATIVO de la app (AsyncStorage):
 * son datos de la app, así que sobreviven a todo lo anterior, a reinicios y a
 * actualizaciones del APK. Al arrancar, el kiosk-client la pide y restaura su
 * contenido — incluso SIN RED, sin esperar a que el servidor se lo reenvíe.
 *
 * La copia solo cambia cuando cambia el contenido asignado, o se borra cuando
 * el contenido se da de baja (snapshot vacío). Nunca caduca.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTENT_KEY = '@somelier_content_snapshot';

/** Guarda el contenido vigente. Un snapshot vacío borra la copia. */
export async function saveSomelierContent(snapshot: unknown): Promise<void> {
  try {
    const isEmpty =
      !snapshot ||
      typeof snapshot !== 'object' ||
      Object.values(snapshot as Record<string, unknown>).every((v) => v === undefined || v === null);

    if (isEmpty) {
      await AsyncStorage.removeItem(CONTENT_KEY);
      return;
    }
    await AsyncStorage.setItem(CONTENT_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('[Somelier] no se pudo guardar el contenido duradero:', e);
  }
}

/** Devuelve el contenido guardado como JSON, o null si no hay. */
export async function loadSomelierContent(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CONTENT_KEY);
  } catch (e) {
    console.warn('[Somelier] no se pudo leer el contenido duradero:', e);
    return null;
  }
}
