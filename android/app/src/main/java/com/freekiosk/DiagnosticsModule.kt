package com.freekiosk

import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.PowerManager
import android.os.SystemClock
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import java.net.HttpURLConnection
import java.net.URL
import java.util.TimeZone
import javax.net.ssl.SSLException

/**
 * Auto-diagnóstico de compatibilidad (Somelier): recolecta en una sola llamada
 * todo lo que solo la capa nativa puede saber del equipo. La evaluación
 * (checks y veredicto) se hace en JS (`src/utils/selfDiagnostic`), que es
 * donde se puede testear sin dispositivo.
 *
 * Diseño de hilos: la foto del sistema se toma en el hilo UI (la
 * identificación del WebView lo exige); las sondas HTTP van en un hilo aparte
 * porque no pueden ir ni en el UI ni bloquear el hilo de módulos nativos.
 */
class DiagnosticsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DiagnosticsModule"

    /**
     * @param kioskUrl URL del kiosk-client (https) a sondear.
     * @param adminApiHealthUrl URL de salud de admin-api (https) a sondear.
     * @param plainHttpUrl URL http:// (sin TLS) para leer la cabecera Date del
     *   servidor aunque TLS falle (reloj sin RTC en cajas TV).
     */
    @ReactMethod
    fun collect(kioskUrl: String?, adminApiHealthUrl: String?, plainHttpUrl: String?, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            val snapshot: WritableMap = try {
                buildSnapshot()
            } catch (e: Throwable) {
                promise.reject("DIAG_SNAPSHOT", "No se pudo leer el estado del equipo: ${e.message}", e)
                return@runOnUiThread
            }
            Thread {
                try {
                    val network = Arguments.createMap()
                    network.putString("type", activeNetworkType())
                    if (!kioskUrl.isNullOrBlank()) network.putMap("kioskClient", probeUrl(kioskUrl))
                    if (!adminApiHealthUrl.isNullOrBlank()) network.putMap("adminApi", probeUrl(adminApiHealthUrl))
                    if (!plainHttpUrl.isNullOrBlank()) network.putMap("plainHttp", probeUrl(plainHttpUrl))
                    snapshot.putMap("network", network)
                    promise.resolve(snapshot)
                } catch (e: Throwable) {
                    promise.reject("DIAG_NETWORK", "Falló la sonda de red: ${e.message}", e)
                }
            }.start()
        }
    }

    private fun buildSnapshot(): WritableMap {
        val ctx = reactContext
        val pm = ctx.packageManager
        val root = Arguments.createMap()

        // --- device ---
        val device = Arguments.createMap().apply {
            putString("manufacturer", Build.MANUFACTURER)
            putString("brand", Build.BRAND)
            putString("model", Build.MODEL)
            putString("device", Build.DEVICE)
            putString("product", Build.PRODUCT)
            putString("hardware", Build.HARDWARE)
            putString("board", Build.BOARD)
            putString("fingerprint", Build.FINGERPRINT)
            putString("androidVersion", Build.VERSION.RELEASE)
            putInt("apiLevel", Build.VERSION.SDK_INT)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) putString("securityPatch", Build.VERSION.SECURITY_PATCH)
            putString("kernel", System.getProperty("os.version") ?: "")
            systemProperty("ro.product.first_api_level")?.toIntOrNull()?.let { putInt("firstApiLevel", it) }
            val abis = Arguments.createArray()
            Build.SUPPORTED_ABIS.forEach { abis.pushString(it) }
            putArray("abis", abis)
            putInt("cpuCores", Runtime.getRuntime().availableProcessors())
            putDouble("uptimeSec", (SystemClock.elapsedRealtime() / 1000).toDouble())
            putBoolean("isTv", DeviceStats.isTv(ctx))
            putBoolean("leanback", pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK))
            putBoolean("touchscreen", DeviceStats.hasTouchscreen(ctx))
            putBoolean("faketouch", pm.hasSystemFeature(PackageManager.FEATURE_FAKETOUCH))
            putBoolean("hasDpad", DeviceStats.hasDpad(ctx))
            val metrics = ctx.resources.displayMetrics
            putMap("screen", Arguments.createMap().apply {
                putInt("w", metrics.widthPixels)
                putInt("h", metrics.heightPixels)
                putInt("dpi", metrics.densityDpi)
                putDouble("density", metrics.density.toDouble())
            })
        }
        root.putMap("device", device)

        // --- memory / storage ---
        root.putMap("memory", DeviceStats.memory(ctx).toMap())
        root.putMap("storage", DeviceStats.storage().toMap())

        // --- webview ---
        val provider = DeviceStats.webViewProvider(ctx)
        root.putMap("webview", Arguments.createMap().apply {
            provider.packageName?.let { putString("packageName", it) }
            provider.versionName?.let { putString("versionName", it) }
            provider.chromeMajor?.let { putInt("chromeMajor", it) }
            putString("source", provider.source)
            provider.defaultUserAgent?.let { putString("defaultUserAgent", it) }
            putBoolean("gmsPresent", isPackageInstalled("com.google.android.gms"))
            val candidates = Arguments.createArray()
            provider.candidates.forEach { candidates.pushString(it) }
            putArray("candidates", candidates)
        })

        // --- permissions ---
        val dpm = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val pkg = ctx.packageName
        root.putMap("permissions", Arguments.createMap().apply {
            putBoolean("deviceOwner", safe { dpm.isDeviceOwnerApp(pkg) })
            putBoolean("lockTaskPermitted", safe { dpm.isLockTaskPermitted(pkg) })
            putBoolean("accessibility", safe { isAccessibilityServiceEnabled() })
            putBoolean("overlay", safe { Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx) })
            putBoolean("usageStats", safe { hasUsageStatsPermission() })
            putBoolean("installPackages", safe { canInstallPackages() })
            putBoolean("batteryOptimizationIgnored", safe {
                Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                    (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(pkg)
            })
            putBoolean("writeSecureSettings", safe {
                ctx.checkCallingOrSelfPermission(android.Manifest.permission.WRITE_SECURE_SETTINGS) == PackageManager.PERMISSION_GRANTED
            })
        })

        // --- clock ---
        root.putMap("clock", Arguments.createMap().apply {
            putDouble("nowMs", System.currentTimeMillis().toDouble())
            putDouble("buildTimeMs", BuildConfig.BUILD_TIME.toDouble())
            putBoolean("autoTime", safe { Settings.Global.getInt(ctx.contentResolver, Settings.Global.AUTO_TIME, 0) == 1 })
            putString("timezone", TimeZone.getDefault().id)
        })

        // --- app ---
        root.putMap("app", Arguments.createMap().apply {
            try {
                val info = pm.getPackageInfo(pkg, 0)
                putString("versionName", info.versionName ?: "")
                @Suppress("DEPRECATION")
                val legacyCode = info.versionCode
                val code = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode.toInt() else legacyCode
                putInt("versionCode", code)
                putDouble("firstInstallTimeMs", info.firstInstallTime.toDouble())
            } catch (ignored: Throwable) {}
            putBoolean("selfUpdate", BuildConfig.ENABLE_SELF_UPDATE)
            @Suppress("DEPRECATION")
            val installer = safeOrNull { pm.getInstallerPackageName(pkg) }
            installer?.let { putString("installer", it) }
        })

        return root
    }

    // ---- helpers ----

    private inline fun safe(block: () -> Boolean): Boolean = try { block() } catch (ignored: Throwable) { false }
    private inline fun <T> safeOrNull(block: () -> T?): T? = try { block() } catch (ignored: Throwable) { null }

    private fun systemProperty(key: String): String? = try {
        val clazz = Class.forName("android.os.SystemProperties")
        val get = clazz.getMethod("get", String::class.java)
        (get.invoke(null, key) as? String)?.takeIf { it.isNotBlank() }
    } catch (ignored: Throwable) {
        null
    }

    private fun isPackageInstalled(name: String): Boolean = try {
        reactContext.packageManager.getPackageInfo(name, 0)
        true
    } catch (ignored: Throwable) {
        false
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val enabled = Settings.Secure.getInt(reactContext.contentResolver, Settings.Secure.ACCESSIBILITY_ENABLED, 0) == 1
        if (!enabled) return false
        val services = Settings.Secure.getString(reactContext.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        return services.contains("${reactContext.packageName}/")
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.packageName)
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun canInstallPackages(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.packageManager.canRequestPackageInstalls()
        } else {
            // API < 26: es un ajuste global ("orígenes desconocidos").
            @Suppress("DEPRECATION")
            val unknownSources = Settings.Secure.getInt(reactContext.contentResolver, Settings.Secure.INSTALL_NON_MARKET_APPS, 0)
            unknownSources == 1
        }
    }

    private fun activeNetworkType(): String {
        return try {
            val cm = reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return "none"
                when {
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "mobile"
                    else -> "other"
                }
            } else {
                @Suppress("DEPRECATION")
                val info = cm.activeNetworkInfo ?: return "none"
                @Suppress("DEPRECATION")
                val type = info.type
                @Suppress("DEPRECATION")
                val label = when (type) {
                    ConnectivityManager.TYPE_ETHERNET -> "ethernet"
                    ConnectivityManager.TYPE_WIFI -> "wifi"
                    ConnectivityManager.TYPE_MOBILE -> "mobile"
                    else -> "other"
                }
                label
            }
        } catch (ignored: Throwable) {
            "unknown"
        }
    }

    /**
     * GET con timeout corto, sin seguir redirecciones (un 301 http→https ya
     * trae la cabecera Date que se necesita para medir el reloj). Clasifica
     * el fallo con la excepción real de HttpURLConnection, que sí distingue
     * TLS de DNS de timeout (el fetch de JS colapsa todo en "Network request
     * failed").
     */
    private fun probeUrl(url: String): WritableMap {
        val result = Arguments.createMap()
        val started = SystemClock.elapsedRealtime()
        var conn: HttpURLConnection? = null
        try {
            conn = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 5000
                readTimeout = 5000
                instanceFollowRedirects = false
                requestMethod = "GET"
                setRequestProperty("User-Agent", "SomelierKiosk-Diagnostics")
            }
            val status = conn.responseCode
            result.putBoolean("ok", status in 200..399)
            result.putInt("status", status)
            val date = conn.getHeaderFieldDate("Date", 0L)
            if (date > 0L) result.putDouble("serverDateMs", date.toDouble())
        } catch (e: Throwable) {
            result.putBoolean("ok", false)
            result.putString("errorClass", classifyNetworkError(e))
            result.putString("error", "${e.javaClass.simpleName}: ${e.message ?: ""}".take(300))
        } finally {
            result.putDouble("ms", (SystemClock.elapsedRealtime() - started).toDouble())
            try { conn?.disconnect() } catch (ignored: Throwable) {}
        }
        return result
    }

    private fun classifyNetworkError(e: Throwable): String {
        val name = e.javaClass.simpleName
        val message = e.message ?: ""
        return when {
            e is SSLException || name.contains("SSL") || name.contains("CertPath") || message.contains("Trust anchor") || message.contains("certificate", ignoreCase = true) -> "tls"
            e is java.net.UnknownHostException || message.contains("Unable to resolve host") -> "dns"
            e is java.net.SocketTimeoutException || name.contains("Timeout") -> "timeout"
            else -> "other"
        }
    }
}
