package com.usesense.reactnative

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.usesense.sdk.*

class UseSenseModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "UseSenseModule"

    private var eventUnsubscribe: (() -> Unit)? = null

    @ReactMethod
    fun initialize(configMap: ReadableMap) {
        val apiKey = configMap.getString("apiKey")
            ?: throw IllegalArgumentException("apiKey is required")

        val branding = if (configMap.hasKey("branding")) {
            val b = configMap.getMap("branding")
            BrandingConfig(
                logoUrl = b?.getString("logoUrl"),
                primaryColor = b?.getString("primaryColor") ?: "#4F63F5",
                buttonRadius = if (b?.hasKey("buttonRadius") == true) b.getInt("buttonRadius") else 12,
                fontFamily = b?.getString("fontFamily"),
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
        val config = UseSenseConfig(
            apiKey = apiKey,
            environment = environment,
            baseUrl = configMap.getString("baseUrl") ?: UseSenseConfig.DEFAULT_BASE_URL,
            branding = branding,
            googleCloudProjectNumber = if (configMap.hasKey("googleCloudProjectNumber"))
                configMap.getDouble("googleCloudProjectNumber").toLong()
            else UseSenseConfig.DEFAULT_GOOGLE_CLOUD_PROJECT_NUMBER,
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

        val sessionType = when (requestMap.getString("sessionType")) {
            "authentication" -> SessionType.AUTHENTICATION
            else -> SessionType.ENROLLMENT
        }

        val metadata: Map<String, Any>? = if (requestMap.hasKey("metadata")) {
            requestMap.getMap("metadata")?.toHashMap()
        } else null

        val request = VerificationRequest(
            sessionType = sessionType,
            externalUserId = requestMap.getString("externalUserId"),
            identityId = requestMap.getString("identityId"),
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
                    putString("message", error.message)
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
                promise.reject("CANCELLED", "Verification was cancelled by the user")
            }
        })
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
}
