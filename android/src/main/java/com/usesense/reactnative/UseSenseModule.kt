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

        val config = UseSenseConfig(
            apiKey = apiKey,
            environment = environment,
            baseUrl = configMap.getString("baseUrl") ?: UseSenseConfig.DEFAULT_BASE_URL,
            gatewayKey = configMap.getString("gatewayKey"),
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
