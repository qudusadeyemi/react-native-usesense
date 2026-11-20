package com.usesense.reactnative

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.usesense.sdk.*
import com.usesense.sdk.flows.FlowAppearance
import com.usesense.sdk.flows.FlowCopy
import org.json.JSONObject

class UseSenseModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "UseSenseModule"

    private var eventUnsubscribe: (() -> Unit)? = null

    @ReactMethod
    fun initialize(configMap: ReadableMap) {
        // Blank when the app only starts from client tokens (no key on the
        // device); the SDK then fails startVerification with INVALID_CONFIG.
        val apiKey = configMap.optString("apiKey")?.trim() ?: ""

        val branding = if (configMap.hasKey("branding")) {
            val b = configMap.getMap("branding")
            BrandingConfig(
                displayName = b?.optString("displayName"),
                logoUrl = b?.optString("logoUrl"),
                // Unset stays null so the dashboard (Flow, then org) value applies:
                // code wins only for fields the app actually set.
                primaryColor = b?.optString("primaryColor"),
                redirectUrl = b?.optString("redirectUrl"),
                buttonRadius = if (b?.hasKey("buttonRadius") == true && !b.isNull("buttonRadius")) b.getInt("buttonRadius") else null,
                fontFamily = b?.optString("fontFamily"),
                // BRAND-v1: the full appearance / copy for every capture screen.
                // Forwarded raw (camelCase, as in the web contract) and decoded by
                // the SDK; a malformed map degrades to null (inherit) rather than
                // failing initialize.
                appearance = b?.optMap("appearance")?.let {
                    runCatching { FlowAppearance.decode(it.toJSONObject()) }.getOrNull()
                },
                copy = b?.optMap("copy")?.let {
                    runCatching { FlowCopy.decode(it.toJSONObject()) }.getOrNull()
                },
            )
        } else null

        val environment = when (configMap.getString("environment")) {
            "sandbox" -> UseSenseEnvironment.SANDBOX
            "production" -> UseSenseEnvironment.PRODUCTION
            else -> UseSenseEnvironment.AUTO
        }

        // `gatewayKey` is intentionally NOT passed to UseSenseConfig.
        // It existed on the v1.x Android SDK but was removed in v4.0
        // when the Cloudflare Worker proxy took over gateway
        // responsibilities server-side. The JS API no longer exposes
        // the field; any stale JS callers that still pass it will
        // have the key silently ignored.
        // v4.2: Optional on-device antispoof classifier flag.
        val antispoofOnDeviceEnabled = configMap.hasKey("antispoofOnDeviceEnabled") &&
            configMap.getBoolean("antispoofOnDeviceEnabled")
        // LiveSense v4 capture flow opt-in.
        val liveSenseV4Enabled = configMap.hasKey("liveSenseV4Enabled") &&
            configMap.getBoolean("liveSenseV4Enabled")

        val config = UseSenseConfig(
            apiKey = apiKey,
            environment = environment,
            // The documented JS field is `apiEndpoint` (iOS reads the same one).
            // The SDK drops a trailing `/v1` itself, so either form works.
            // `baseUrl` is still read for callers that passed it directly.
            baseUrl = configMap.optString("apiEndpoint")?.takeIf { it.isNotBlank() }
                ?: configMap.optString("baseUrl")?.takeIf { it.isNotBlank() }
                ?: UseSenseConfig.DEFAULT_BASE_URL,
            branding = branding,
            googleCloudProjectNumber = if (configMap.hasKey("googleCloudProjectNumber"))
                configMap.getDouble("googleCloudProjectNumber").toLong()
            else UseSenseConfig.DEFAULT_GOOGLE_CLOUD_PROJECT_NUMBER,
            antispoofOnDeviceEnabled = antispoofOnDeviceEnabled,
            liveSenseV4Enabled = liveSenseV4Enabled,
        )

        val context = reactContext.applicationContext
        UseSense.initialize(context, config)
    }

    @ReactMethod
    fun startVerification(requestMap: ReadableMap, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity available")
            return
        }

        val sessionType = sessionTypeOf(requestMap.optString("sessionType"))

        val metadata: Map<String, Any>? = if (requestMap.hasKey("metadata")) {
            requestMap.getMap("metadata")?.toHashMap()
        } else null

        val request = VerificationRequest(
            sessionType = sessionType,
            externalUserId = requestMap.getString("externalUserId"),
            identityId = requestMap.getString("identityId"),
            metadata = metadata,
        )

        UseSense.startVerification(activity, request, promiseCallback(promise))
    }

    /**
     * Server-side init: the app holds a single-use client token from the
     * integrator's `POST /v1/sessions/create-token`, never an API key. Same
     * capture, result and error mapping as [startVerification].
     */
    @ReactMethod
    fun startVerificationWithToken(requestMap: ReadableMap, promise: Promise) {
        val activity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "No current activity available")
            return
        }
        val clientToken = requestMap.optString("clientToken") ?: ""
        UseSense.startVerificationWithToken(
            activity,
            clientToken,
            sessionTypeOf(requestMap.optString("sessionType")),
            promiseCallback(promise),
        )
    }

    /** Hosted remote enrollment by ID; resolves `{ decision }`. */
    @ReactMethod
    fun startRemoteEnrollment(remoteEnrollmentId: String, promise: Promise) {
        val activity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "No current activity available")
            return
        }
        if (!UseSense.isInitialized) {
            promise.reject("sdk_not_initialized", "UseSense SDK is not initialized. Call initialize() first.")
            return
        }
        UseSense.startRemoteEnrollment(activity, remoteEnrollmentId, remoteCallback(promise))
    }

    /** Hosted remote verification by ID; resolves `{ decision }` (DISPUTED included). */
    @ReactMethod
    fun startRemoteVerification(remoteSessionId: String, promise: Promise) {
        val activity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "No current activity available")
            return
        }
        if (!UseSense.isInitialized) {
            promise.reject("sdk_not_initialized", "UseSense SDK is not initialized. Call initialize() first.")
            return
        }
        UseSense.startRemoteVerification(activity, remoteSessionId, remoteCallback(promise))
    }

    private fun promiseCallback(promise: Promise) = object : UseSenseCallback {
        override fun onSuccess(result: UseSenseResult) = promise.resolve(resultMap(result))
        override fun onError(error: UseSenseError) = rejectWith(promise, error)
        override fun onCancelled() = promise.reject("CANCELLED", "Verification was cancelled by the user")
    }

    private fun remoteCallback(promise: Promise) = object : UseSenseCallback {
        override fun onSuccess(result: UseSenseResult) {
            promise.resolve(Arguments.createMap().apply { putString("decision", result.decision) })
        }
        override fun onError(error: UseSenseError) = rejectWith(promise, error)
        override fun onCancelled() = promise.reject("CANCELLED", "Verification was cancelled by the user")
    }

    /**
     * Phase 1 ticket R-1: passthrough to UseSense.startV4Verification.
     *
     * The native SDK validates the request, launches the v4 capture
     * activity, and resolves the promise with the opaque verdict.
     */
    @ReactMethod
    fun startV4Verification(requestMap: ReadableMap, promise: Promise) {
        val activity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "No current activity available")
            return
        }
        val sessionId = requestMap.getString("sessionId")
            ?: return promise.reject("INVALID_REQUEST", "sessionId is required")
        val sessionToken = requestMap.getString("sessionToken")
            ?: return promise.reject("INVALID_REQUEST", "sessionToken is required")
        val nonce = requestMap.getString("nonce")
            ?: return promise.reject("INVALID_REQUEST", "nonce is required")
        val apiBaseUrl = requestMap.getString("apiBaseUrl")
            ?: return promise.reject("INVALID_REQUEST", "apiBaseUrl is required")
        val environment = requestMap.getString("environment") ?: "production"
        val displayName = if (requestMap.hasKey("displayName")) requestMap.getString("displayName") else null
        val brandColor = if (requestMap.hasKey("brandPrimaryColor"))
            runCatching { android.graphics.Color.parseColor(requestMap.getString("brandPrimaryColor")) }.getOrNull()
        else null

        val request = com.usesense.sdk.api.V4VerificationRequest(
            sessionId = sessionId,
            sessionToken = sessionToken,
            nonce = nonce,
            apiBaseUrl = apiBaseUrl,
            environment = environment,
            brandPrimaryColor = brandColor,
            displayName = displayName
        )

        UseSense.startV4Verification(activity, request, object : com.usesense.sdk.api.V4VerificationCallback {
            override fun onComplete(verdict: com.usesense.sdk.api.V4Verdict) {
                val map = Arguments.createMap().apply {
                    putString("session_id", verdict.sessionId)
                    putString("verdict", verdict.verdict.name.lowercase())
                    putString("confidence", verdict.confidence.name.lowercase())
                    putString("assurance_level_achieved", verdict.assuranceLevelAchieved)
                    putString("capture_channel", "rn")
                    if (verdict.matchSenseEmbeddingId != null) {
                        putString("match_sense_embedding_id", verdict.matchSenseEmbeddingId)
                    } else {
                        putNull("match_sense_embedding_id")
                    }
                    putString("timestamp", verdict.timestamp)
                }
                promise.resolve(map)
            }
            override fun onFailure(error: Throwable) {
                promise.reject("V4_FAILED", error.message ?: "v4 verification failed", error)
            }
            override fun onPhaseChange(phase: com.usesense.sdk.api.V4Phase) {
                val map = Arguments.createMap().apply {
                    putString("type", "V4_PHASE_CHANGE")
                    putString("phase", phase.name.lowercase())
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }
                sendEvent("UseSenseEvent", map)
            }
        })
    }

    @ReactMethod
    fun subscribeToEvents() {
        eventUnsubscribe?.invoke()
        eventUnsubscribe = UseSense.onEvent { event ->
            val map = Arguments.createMap().apply {
                putString("type", event.type.name)
                putDouble("timestamp", event.timestamp.toDouble())
                if (event.data != null) {
                    putMap("data", Arguments.makeNativeMap(event.data as Map<String, Any>))
                }
            }
            sendEvent("UseSenseEvent", map)
        }
    }

    @ReactMethod
    fun unsubscribeFromEvents() {
        eventUnsubscribe?.invoke()
        eventUnsubscribe = null
    }

    @ReactMethod
    fun reset() {
        eventUnsubscribe?.invoke()
        eventUnsubscribe = null
        UseSense.reset()
    }

    @ReactMethod
    fun isInitialized(promise: Promise) {
        promise.resolve(UseSense.isInitialized)
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun addListener(eventType: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    companion object {
        fun sessionTypeOf(value: String?): SessionType = when (value) {
            "authentication" -> SessionType.AUTHENTICATION
            "liveness" -> SessionType.LIVENESS
            else -> SessionType.ENROLLMENT
        }

        /** The redacted result: the only shape that crosses the bridge. */
        fun resultMap(result: UseSenseResult): WritableMap = Arguments.createMap().apply {
            putString("sessionId", result.sessionId)
            putString("sessionType", result.sessionType)
            putString("identityId", result.identityId)
            putString("decision", result.decision)
            putString("timestamp", result.timestamp)
            putBoolean("isApproved", result.isApproved)
            putBoolean("isRejected", result.isRejected)
            putBoolean("isPendingReview", result.isPendingReview)
        }

        fun errorMap(error: UseSenseError): WritableMap = Arguments.createMap().apply {
            putInt("code", error.code)
            putString("serverCode", error.serverCode)
            putString("message", error.message)
            putBoolean("isRetryable", error.isRetryable)
        }

        fun rejectWith(promise: Promise, error: UseSenseError) {
            promise.reject(error.code.toString(), error.message, Exception(error.message), errorMap(error))
        }
    }

    private fun ReadableMap.optString(key: String): String? =
        if (hasKey(key) && !isNull(key)) getString(key) else null

    private fun ReadableMap.optMap(key: String): ReadableMap? =
        if (hasKey(key) && !isNull(key) && getType(key) == ReadableType.Map) getMap(key) else null

    /** Nested HashMap / ArrayList values from `toHashMap()`; `JSONObject(Map)` walks them. */
    private fun ReadableMap.toJSONObject(): JSONObject = JSONObject(this.toHashMap() as Map<*, *>)
}
