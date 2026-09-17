package com.freekiosk

import android.app.ActivityManager
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.provider.Settings
import android.view.InputDevice
import android.webkit.WebSettings
import android.webkit.WebView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

/**
 * Datos del equipo compartidos entre el servidor REST (`/api/memory`,
 * `/api/storage`), MQTT, la telemetría y el auto-diagnóstico (Somelier).
 * Un solo lugar para no tener tres copias de la misma lectura de
 * ActivityManager / StatFs / proveedor de WebView.
 */
object DeviceStats {

    data class MemoryStats(
        val totalMB: Long,
        val availableMB: Long,
        val usedMB: Long,
        val usedPercent: Int,
        val lowMemory: Boolean,
        // Heap que Android le da a esta app (normal y con largeHeap). En
        // Android 7 el renderer del WebView corre DENTRO del proceso de la app,
        // así que este número acota lo que Chromium puede usar.
        val memoryClassMB: Int,
        val largeMemoryClassMB: Int,
    ) {
        fun toJson(): JSONObject = JSONObject().apply {
            put("totalMB", totalMB)
            put("availableMB", availableMB)
            put("usedMB", usedMB)
            put("usedPercent", usedPercent)
            put("lowMemory", lowMemory)
            put("memoryClassMB", memoryClassMB)
            put("largeMemoryClassMB", largeMemoryClassMB)
        }

        fun toMap(): WritableMap = Arguments.createMap().apply {
            putDouble("totalMB", totalMB.toDouble())
            putDouble("availableMB", availableMB.toDouble())
            putDouble("usedMB", usedMB.toDouble())
            putInt("usedPercent", usedPercent)
            putBoolean("lowMemory", lowMemory)
            putInt("memoryClassMB", memoryClassMB)
            putInt("largeMemoryClassMB", largeMemoryClassMB)
        }
    }

    data class StorageStats(
        val totalMB: Long,
        val availableMB: Long,
        val usedMB: Long,
        val usedPercent: Int,
    ) {
        fun toJson(): JSONObject = JSONObject().apply {
            put("totalMB", totalMB)
            put("availableMB", availableMB)
            put("usedMB", usedMB)
            put("usedPercent", usedPercent)
        }

        fun toMap(): WritableMap = Arguments.createMap().apply {
            putDouble("totalMB", totalMB.toDouble())
            putDouble("availableMB", availableMB.toDouble())
            putDouble("usedMB", usedMB.toDouble())
            putInt("usedPercent", usedPercent)
        }
    }

    /**
     * Proveedor de WebView REAL del sistema. `source` dice de dónde salió la
     * identificación: `current` (API 26+), `loaded` (reflexión, API < 26),
     * `setting` (Settings.Global.webview_provider), `candidate` (paquete
     * conocido instalado) o `none`. `chromeMajor` sale del User-Agent por
     * defecto del WebView, que NO se ve afectado por el UA que la app
     * sobrescribe en su propia instancia: es el dato más fiable en Android
     * viejo, donde el paquete puede no identificarse.
     */
    data class WebViewProvider(
        val packageName: String?,
        val versionName: String?,
        val chromeMajor: Int?,
        val source: String,
        val defaultUserAgent: String?,
        val candidates: List<String>,
    )

    private val KNOWN_WEBVIEW_PACKAGES = listOf(
        "com.google.android.webview",
        "com.google.android.webview.beta",
        "com.android.webview",
        "com.android.chrome",
        "com.chrome.beta",
        "com.huawei.webview",
        "com.amazon.webview.chromium",
        "com.samsung.android.sbrowser",
    )

    fun memory(ctx: Context): MemoryStats {
        val activityManager = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memInfo)
        val totalMB = memInfo.totalMem / (1024 * 1024)
        val availableMB = memInfo.availMem / (1024 * 1024)
        val usedMB = totalMB - availableMB
        val usedPercent = if (totalMB > 0) ((usedMB.toDouble() / totalMB) * 100).toInt() else 0
        return MemoryStats(
            totalMB = totalMB,
            availableMB = availableMB,
            usedMB = usedMB,
            usedPercent = usedPercent,
            lowMemory = memInfo.lowMemory,
            memoryClassMB = activityManager.memoryClass,
            largeMemoryClassMB = activityManager.largeMemoryClass,
        )
    }

    fun storage(): StorageStats {
        val stat = StatFs(Environment.getDataDirectory().path)
        val blockSize = stat.blockSizeLong
        val totalBytes = stat.blockCountLong * blockSize
        val availableBytes = stat.availableBlocksLong * blockSize
        val usedBytes = totalBytes - availableBytes
        val usedPercent = if (totalBytes > 0) ((usedBytes.toDouble() / totalBytes) * 100).toInt() else 0
        return StorageStats(
            totalMB = totalBytes / (1024 * 1024),
            availableMB = availableBytes / (1024 * 1024),
            usedMB = usedBytes / (1024 * 1024),
            usedPercent = usedPercent,
        )
    }

    /**
     * Debe llamarse desde el hilo UI: `WebSettings.getDefaultUserAgent` puede
     * disparar la inicialización del proveedor de WebView, y versiones viejas
     * de Chromium exigen que eso pase en el hilo principal.
     */
    fun webViewProvider(ctx: Context): WebViewProvider {
        val pm = ctx.packageManager
        var packageName: String? = null
        var versionName: String? = null
        var source = "none"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                WebView.getCurrentWebViewPackage()?.let {
                    packageName = it.packageName
                    versionName = it.versionName
                    source = "current"
                }
            } catch (ignored: Throwable) {}
        }

        if (packageName == null && Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // API 21-25: WebViewFactory.getLoadedPackageInfo() es oculta pero
            // sin restricciones antes de Android 9. Solo se intenta ahí.
            try {
                val factory = Class.forName("android.webkit.WebViewFactory")
                val method = factory.getDeclaredMethod("getLoadedPackageInfo")
                method.isAccessible = true
                val info = method.invoke(null) as? android.content.pm.PackageInfo
                if (info != null) {
                    packageName = info.packageName
                    versionName = info.versionName
                    source = "loaded"
                }
            } catch (ignored: Throwable) {}
        }

        if (packageName == null) {
            try {
                val configured = Settings.Global.getString(ctx.contentResolver, "webview_provider")
                if (!configured.isNullOrBlank()) {
                    val info = pm.getPackageInfo(configured, 0)
                    packageName = info.packageName
                    versionName = info.versionName
                    source = "setting"
                }
            } catch (ignored: Throwable) {}
        }

        val candidates = KNOWN_WEBVIEW_PACKAGES.mapNotNull { candidate ->
            try {
                val info = pm.getPackageInfo(candidate, 0)
                "$candidate ${info.versionName ?: "?"}"
            } catch (ignored: Throwable) {
                null
            }
        }

        if (packageName == null && candidates.isNotEmpty()) {
            val first = candidates.first().split(" ")
            packageName = first[0]
            versionName = first.getOrNull(1)?.takeIf { it != "?" }
            source = "candidate"
        }

        val defaultUa = try {
            WebSettings.getDefaultUserAgent(ctx)
        } catch (ignored: Throwable) {
            null
        }
        val chromeMajor = defaultUa?.let { Regex("Chrome/(\\d+)").find(it)?.groupValues?.get(1)?.toIntOrNull() }

        return WebViewProvider(packageName, versionName, chromeMajor, source, defaultUa, candidates)
    }

    /** Versión del WebView en el formato que ya usa la telemetría (`paquete versión`). */
    fun webViewVersionLabel(ctx: Context): String {
        val provider = webViewProvider(ctx)
        return when {
            provider.packageName != null && provider.versionName != null -> "${provider.packageName} ${provider.versionName}"
            provider.chromeMajor != null -> "Chrome/${provider.chromeMajor}"
            else -> "unknown"
        }
    }

    fun isTv(ctx: Context): Boolean {
        val uiMode = ctx.resources.configuration.uiMode and Configuration.UI_MODE_TYPE_MASK
        if (uiMode == Configuration.UI_MODE_TYPE_TELEVISION) return true
        val pm = ctx.packageManager
        @Suppress("DEPRECATION")
        val legacyTv = pm.hasSystemFeature(PackageManager.FEATURE_TELEVISION)
        return pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK) || legacyTv
    }

    fun hasTouchscreen(ctx: Context): Boolean =
        ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_TOUCHSCREEN)

    fun hasDpad(ctx: Context): Boolean {
        if (ctx.resources.configuration.navigation == Configuration.NAVIGATION_DPAD) return true
        return try {
            InputDevice.getDeviceIds().any { id ->
                val device = InputDevice.getDevice(id) ?: return@any false
                (device.sources and InputDevice.SOURCE_DPAD) == InputDevice.SOURCE_DPAD && !device.isVirtual
            }
        } catch (ignored: Throwable) {
            false
        }
    }
}
