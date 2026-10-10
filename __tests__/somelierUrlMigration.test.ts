import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SOMELIER_BASE_URL,
  buildSomelierUrl,
  extractSomelierToken,
  migrateSomelierUrl,
} from '../src/config/somelier';
import { StorageService } from '../src/utils/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const OLD_HTTPS = 'https://somelier-kioskclient-hkrwfq-d87803-51-222-158-5.sslip.io';
const OLD_HTTP = 'http://somelier-kioskclient-hkrwfq-d87803-51-222-158-5.sslip.io';

describe('migrateSomelierUrl', () => {
  it('pasa el dominio viejo al actual conservando el token', () => {
    const migrated = migrateSomelierUrl(`${OLD_HTTPS}/?token=abc%2B123`);
    expect(migrated).toBe(`${SOMELIER_BASE_URL}/?token=abc%2B123`);
    expect(extractSomelierToken(migrated)).toBe('abc+123');
  });

  it('también migra la URL http:// de antes del TLS', () => {
    expect(migrateSomelierUrl(`${OLD_HTTP}/?token=t1`)).toBe(`${SOMELIER_BASE_URL}/?token=t1`);
  });

  it('conserva ruta, parámetros y hash, y no distingue mayúsculas en el dominio', () => {
    expect(migrateSomelierUrl(`${OLD_HTTPS.toUpperCase()}/diag.html?token=t1&x=2#a`)).toBe(
      `${SOMELIER_BASE_URL}/diag.html?token=t1&x=2#a`,
    );
    expect(migrateSomelierUrl(OLD_HTTPS)).toBe(SOMELIER_BASE_URL);
  });

  it('deja igual cualquier otra URL', () => {
    const others = [
      buildSomelierUrl('t1'),
      'https://example.com/?token=t1',
      `${OLD_HTTPS}.evil.com/?token=t1`,
      'https://somelier-adminapi-ikhwzx-59e83c-51-222-158-5.sslip.io/health',
      '',
    ];
    for (const url of others) expect(migrateSomelierUrl(url)).toBe(url);
  });
});

describe('StorageService: URL guardada con el dominio viejo', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('getUrl la devuelve migrada y la deja guardada así', async () => {
    await AsyncStorage.setItem('@kiosk_url', `${OLD_HTTPS}/?token=t1`);
    expect(await StorageService.getUrl()).toBe(`${SOMELIER_BASE_URL}/?token=t1`);
    expect(await AsyncStorage.getItem('@kiosk_url')).toBe(`${SOMELIER_BASE_URL}/?token=t1`);
  });

  it('getAllSettings (lo que lee el kiosko al arrancar) la devuelve migrada', async () => {
    await AsyncStorage.setItem('@kiosk_url', `${OLD_HTTP}/?token=t2`);
    const settings = await StorageService.getAllSettings();
    expect(settings.get(StorageService.KEYS.URL)).toBe(`${SOMELIER_BASE_URL}/?token=t2`);
    expect(await AsyncStorage.getItem('@kiosk_url')).toBe(`${SOMELIER_BASE_URL}/?token=t2`);
  });

  it('no toca una URL ajena ni la ausencia de URL', async () => {
    expect(await StorageService.getUrl()).toBeNull();
    expect((await StorageService.getAllSettings()).get(StorageService.KEYS.URL)).toBeNull();

    await AsyncStorage.setItem('@kiosk_url', 'https://example.com/');
    expect(await StorageService.getUrl()).toBe('https://example.com/');
  });
});
