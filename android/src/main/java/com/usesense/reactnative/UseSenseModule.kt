package com.usesense.reactnative

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.usesense.sdk.*
import org.json.JSONObject

/**
 * React Native bridge module for the UseSense Android SDK.
 *
 * Supports both TurboModules (New Architecture) and the legacy Bridge.
 * The native SDK manages its own Activity (UseSenseActivity) — this module
 * only marshals data between JS and Kotlin.
 */
class UseSenseModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = MODULE_NAME

    private var eventUnsubscribe: (() -> Unit)? = null

    // -------------------------------------------------------------------------
    // Initialize
    // -------------------------------------------------------------------------

    @ReactMethod
    fun initialize(config: ReadableMap) {
        val apiKey = config.getString("apiKey")
            ?: throw IllegalArgumentException("apiKey is required in initialize()")

        val environment = when (config.getString("environment")) {
            "sandbox"    -> UseSenseEnvironment.SANDBOX
            "production" -> UseSenseEnvironment.PRODUCTION
            else         -> UseSenseEnvironment.AUTO
        }

        // Branding fields are flattened at the top level by the JS layer
        // (codegen does not support nested optional objects).
        val hasBranding = config.hasKey("primaryColor") ||
            config.hasKey("buttonRadius") ||
            config.hasKey("logoUrl") ||
            config.hasKey("fontFamily")

        val branding = if (hasBranding) {
            BrandingConfig(
                logoUrl = if (config.hasKey("logoUrl")) config.getString("logoUrl") else null,
                primaryColor = if (config.hasKey("primaryColor")) config.getString("primaryColor") else null,
                buttonRadius = if (config.hasKey("buttonRadius")) config.getInt("buttonRadius") else 12,
                fontFamily = if (config.hasKey("fontFamily")) config.getString("fontFamily") else null,
            )
        } else null

        val googleCloudProjectNumber = if (config.hasKey("googleCloudProjectNumber")) {
            config.getDouble("googleCloudProjectNumber").toLong()
        } else {
            UseSenseConfig.DEFAULT_GOOGLE_CLOUD_PROJECT_NUMBER
        }

        val sdkConfig = UseSenseConfig(
            apiKey = apiKey,
            environment = environment,
            baseUrl = if (config.hasKey("baseUrl")) {
                config.getString("baseUrl") ?: UseSenseConfig.DEFAULT_BASE_URL
            } else UseSenseConfig.DEFAULT_BASE_URL,
            gatewayKey = if (config.hasKey("gatewayKey")) config.getString("gatewayKey") else null,
            branding = branding,
            googleCloudProjectNumber = googleCloudProjectNumber,
        )

        UseSense.initialize(reactContext.applicationContext, sdkConfig)
    }

    // -------------------------------------------------------------------------
    // Start Verification
    // -------------------------------------------------------------------------

    @ReactMethod
    fun startVerification(requestMap: ReadableMap, promise: Promise) {
        if (!UseSense.isInitialized) {
            promise.reject(
                "NOT_INITIALIZED",
                "UseSense SDK has not been initialized. Call initialize() first.",
            )
            return
        }

        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Could not find current Activity to launch verification.")
            return
        }

        val sessionTypeStr = requestMap.getString("sessionType")
        if (sessionTypeStr == null) {
            promise.reject("INVALID_REQUEST", "sessionType is required.")
            return
        }

        val sessionType = when (sessionTypeStr) {
            "authentication" -> SessionType.AUTHENTICATION
            else             -> SessionType.ENROLLMENT
        }

        val externalUserId = if (requestMap.hasKey("externalUserId")) requestMap.getString("externalUserId") else null
        val identityId = if (requestMap.hasKey("identityId")) requestMap.getString("identityId") else null

        // Metadata arrives as a JSON string from the JS layer
        val metadataJson = if (requestMap.hasKey("metadata")) requestMap.getString("metadata") else null
        var metadata: Map<String, Any>? = null
        if (metadataJson != null) {
            try {
                val map = mutableMapOf<String, Any>()
                val jsonObj = JSONObject(metadataJson)
                val keys = jsonObj.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    map[key] = jsonObj.get(key)
                }
                metadata = map
            } catch (_: Exception) {
                // Ignore malformed metadata
            }
        }

        val request = VerificationRequest(
            sessionType = sessionType,
            externalUserId = externalUserId,
            identityId = identityId,
            metadata = metadata,
        )

        UseSense.startVerification(activity, request, object : UseSenseCallback {
            override fun onSuccess(result: UseSenseResult) {
                val map = Arguments.createMap().apply {
                    putString("sessionId", result.sessionId)
                    putString("sessionType", result.sessionType)
                    putString("identityId", result.identityId)
                    putString("decision", result.decision)
                    putString("timestamp", result.timestamp)
                    putBoolean("isApproved", result.isApproved)
                    putBoolean("isRejected", result.isRejected)
                    putBoolean("isPendingReview", result.isPendingReview)
                }
                promise.resolve(map)
            }

            override fun onError(error: UseSenseError) {
                val details = Arguments.createMap().apply {
                    putInt("code", error.code)
                    putString("serverCode", error.serverCode)
                    putBoolean("isRetryable", error.isRetryable)
                }
                promise.reject(
                    error.code.toString(),
                    error.message,
                    Exception(error.message),
                    details,
                )
            }

            override fun onCancelled() {
                promise.reject("CANCELLED", "User cancelled the verification.")
            }
        })
    }

    // -------------------------------------------------------------------------
    // Is Initialized
    // -------------------------------------------------------------------------

    @ReactMethod
    fun isInitialized(promise: Promise) {
        promise.resolve(UseSense.isInitialized)
    }

    // -------------------------------------------------------------------------
    // Reset
    // -------------------------------------------------------------------------

    @ReactMethod
    fun reset() {
        eventUnsubscribe?.invoke()
        eventUnsubscribe = null
        UseSense.reset()
    }

    // -------------------------------------------------------------------------
    // Event Subscriptions
    // -------------------------------------------------------------------------

    @ReactMethod
    fun subscribeToEvents() {
        eventUnsubscribe?.invoke()

        eventUnsubscribe = UseSense.onEvent { event ->
            val payload = Arguments.createMap().apply {
                putString("type", event.type.name)
                putDouble("timestamp", event.timestamp.toDouble())
                event.data?.let { data ->
                    val dataMap = Arguments.createMap()
                    for ((key, value) in data) {
                        when (value) {
                            is String  -> dataMap.putString(key, value)
                            is Int     -> dataMap.putInt(key, value)
                            is Double  -> dataMap.putDouble(key, value)
                            is Boolean -> dataMap.putBoolean(key, value)
                            is Long    -> dataMap.putDouble(key, value.toDouble())
                            is Float   -> dataMap.putDouble(key, value.toDouble())
                            null       -> dataMap.putNull(key)
                            else       -> dataMap.putString(key, value.toString())
                        }
                    }
                    putMap("data", dataMap)
                }
            }

            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("UseSenseEvent", payload)
        }
    }

    @ReactMethod
    fun unsubscribeFromEvents() {
        eventUnsubscribe?.invoke()
        eventUnsubscribe = null
    }

    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {
        // Required by RN NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {
        // Required by RN NativeEventEmitter
    }

    companion object {
        const val MODULE_NAME = "UseSenseModule"
    }
}
