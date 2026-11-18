package com.usesense.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.usesense.sdk.UseSense
import com.usesense.sdk.devicecheck.DeviceCheck
import com.usesense.sdk.devicecheck.DeviceCheckConfig
import com.usesense.sdk.devicecheck.DeviceCheckResult

/**
 * React Native bridge for the headless silent device check
 * (`UseSense.deviceCheck`). JS methods `start(handle, config)`,
 * `finish(handle, config)` and `dispose(handle)`.
 *
 * The first call for a handle creates the native [DeviceCheck]; later calls
 * reuse it (start and finish must run on the same instance). The Promise
 * always resolves with `{ok, phase, error?}`: the native check never throws
 * and neither does this module.
 */
class UseSenseDeviceCheckModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val checks = mutableMapOf<String, DeviceCheck>()

    override fun getName(): String = "UseSenseDeviceCheckModule"

    @ReactMethod
    fun start(handle: String?, config: ReadableMap?, promise: Promise) = run("start", handle, config, promise)

    @ReactMethod
    fun finish(handle: String?, config: ReadableMap?, promise: Promise) = run("finish", handle, config, promise)

    @ReactMethod
    fun dispose(handle: String?) {
        if (handle == null) return
        synchronized(checks) { checks.remove(handle) }?.cancel()
    }

    override fun invalidate() {
        val all = synchronized(checks) { checks.values.toList().also { checks.clear() } }
        all.forEach { it.cancel() }
        super.invalidate()
    }

    private fun run(phase: String, handle: String?, config: ReadableMap?, promise: Promise) {
        if (handle.isNullOrBlank() || config == null) {
            promise.resolve(failure(phase, "invalid_config", "The device check is not set up (no handle or config)"))
            return
        }
        val check =
            synchronized(checks) {
                checks.getOrPut(handle) {
                    UseSense.deviceCheck(
                        reactContext.applicationContext,
                        DeviceCheckConfig(
                            deviceCheckId = config.str("deviceCheckId") ?: "",
                            token = config.str("token") ?: "",
                            nonce = config.str("nonce") ?: "",
                            baseUrl = config.str("apiBaseUrl"),
                            timeoutMs =
                                if (config.hasKey("timeoutMs") && !config.isNull("timeoutMs")) {
                                    config.getDouble("timeoutMs").toLong()
                                } else {
                                    DeviceCheckConfig.DEFAULT_TIMEOUT_MS
                                },
                        ),
                    )
                }
            }
        val callback = { r: DeviceCheckResult -> promise.resolve(toMap(r)) }
        if (phase == "start") check.start { callback(it) } else check.finish { callback(it) }
    }

    private fun ReadableMap.str(key: String): String? = if (hasKey(key) && !isNull(key)) getString(key) else null

    private fun toMap(r: DeviceCheckResult): WritableMap {
        val map = Arguments.createMap()
        map.putString("phase", r.phase.wire)
        when (r) {
            is DeviceCheckResult.Sent -> map.putBoolean("ok", true)
            is DeviceCheckResult.Failed -> {
                map.putBoolean("ok", false)
                val err = Arguments.createMap()
                err.putString("code", r.error.code.wire)
                err.putString("message", r.error.message)
                err.putBoolean("retryable", r.error.isRetryable)
                r.error.serverCode?.let { err.putString("serverCode", it) }
                r.error.httpStatus?.let { err.putInt("httpStatus", it) }
                map.putMap("error", err)
            }
        }
        return map
    }

    private fun failure(phase: String, code: String, message: String): WritableMap {
        val map = Arguments.createMap()
        map.putBoolean("ok", false)
        map.putString("phase", phase)
        val err = Arguments.createMap()
        err.putString("code", code)
        err.putString("message", message)
        err.putBoolean("retryable", false)
        map.putMap("error", err)
        return map
    }
}
