import UpdateModule, { ENABLE_SELF_UPDATE } from './UpdateModule';

/**
 * Auto-actualización al arrancar (fork Somelier).
 *
 * Chequea la última release de nuestro repo y, si hay una versión más nueva
 * que la instalada, la descarga e instala. En dispositivos con Device Owner la
 * instalación es silenciosa; en el resto, Android muestra el diálogo de
 * instalación estándar. Best-effort: cualquier fallo (sin red, sin permiso) se
 * ignora y el kiosko sigue funcionando con la versión actual.
 */

// Compara dos versiones "a.b.c". Devuelve true si `remote` es mayor que `local`.
function isNewer(remote: string, local: string): boolean {
  const toParts = (v: string) => v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const r = toParts(remote);
  const l = toParts(local);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

export async function runAutoUpdate(): Promise<void> {
  if (!ENABLE_SELF_UPDATE) return;
  try {
    const current = await UpdateModule.getCurrentVersion();
    const latest = await UpdateModule.checkForUpdates();
    if (!latest?.downloadUrl || !isNewer(latest.version, current.versionName)) return;
    // Hay una version mas nueva con APK publicado: descargar e instalar.
    await UpdateModule.downloadAndInstall(latest.downloadUrl, latest.version);
  } catch {
    // Sin red / sin permiso / sin releases: se ignora, se sigue con la actual.
  }
}
