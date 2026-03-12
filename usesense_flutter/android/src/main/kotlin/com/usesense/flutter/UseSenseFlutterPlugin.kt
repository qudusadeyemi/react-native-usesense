package com.usesense.flutter

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import com.usesense.sdk.UseSense
import com.usesense.sdk.UseSenseCallback
import com.usesense.sdk.UseSenseConfig
import com.usesense.sdk.UseSenseResult
import com.usesense.sdk.UseSenseError
import com.usesense.sdk.UseSenseEvent
import com.usesense.sdk.BrandingConfig
import com.usesense.sdk.EventType
import com.usesense.sdk.SessionType
import com.usesense.sdk.UseSenseEnvironment
import com.usesense.sdk.VerificationRequest

/**
 * Flutter plugin that bridges Dart calls to the UseSense Android SDK.
 *
 * Implements [UseSenseHostApi] (Pigeon-generated) for Dart → Native calls and
 * uses [UseSenseFlutterApi] (Pigeon-generated) for Native → Dart callbacks.
 */
class UseSenseFlutterPlugin : FlutterPlugin, ActivityAware, UseSenseHostApi {

    private var context: Context? = null
    private var activity: Activity? = null
    private var flutterApi: UseSenseFlutterApi? = null
    private var eventUnsubscribe: (() -> Unit)? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    // -------------------------------------------------------------------------
    // FlutterPlugin
    // -------------------------------------------------------------------------

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        context = binding.applicationContext
        flutterApi = UseSenseFlutterApi(binding.binaryMessenger)
        UseSenseHostApi.setUp(binding.binaryMessenger, this)
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        UseSenseHostApi.setUp(binding.binaryMessenger, null)
        eventUnsubscribe?.invoke()
        eventUnsubscribe = null
        flutterApi = null
        context = null
    }

    // -------------------------------------------------------------------------
    // ActivityAware
    // -------------------------------------------------------------------------

    override fun onAttachedToActivity(binding: ActivityPluginBinding) {
        activity = binding.activity
    }

    override fun onDetachedFromActivityForConfigChanges() {
        activity = null
    }

    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
        activity = binding.activity
    }

    override fun onDetachedFromActivity() {
        activity = null
    }

    // -------------------------------------------------------------------------
    // UseSenseHostApi implementation
    // -------------------------------------------------------------------------

    override fun initialize(
        config: PigeonUseSenseConfig,
        callback: (Result<Unit>) -> Unit,
    ) {
        val ctx = context
        if (ctx == null) {
            callback(Result.failure(FlutterError("sdk_not_initialized", "Android context is not available.", null)))
            return
        }
        try {
            val brandingConfig = config.branding?.let { b ->
                BrandingConfig(
                    displayName = b.displayName,
                    logoUrl = b.logoUrl,
                    primaryColor = b.primaryColor,
                    redirectUrl = b.redirectUrl,
                    buttonRadius = b.buttonRadius?.toInt() ?: 12,
                    fontFamily = b.fontFamily,
                )
            }
            val environment = when (config.environment) {
                PigeonUseSenseEnvironment.SANDBOX -> UseSenseEnvironment.SANDBOX
                PigeonUseSenseEnvironment.PRODUCTION -> UseSenseEnvironment.PRODUCTION
                PigeonUseSenseEnvironment.AUTO -> UseSenseEnvironment.AUTO
            }
            val nativeConfig = UseSenseConfig(
                apiKey = config.apiKey,
                environment = environment,
                baseUrl = config.baseUrl ?: UseSenseConfig.DEFAULT_BASE_URL,
                gatewayKey = config.gatewayKey,
                branding = brandingConfig,
                googleCloudProjectNumber = config.googleCloudProjectNumber
                    ?: UseSenseConfig.DEFAULT_GOOGLE_CLOUD_PROJECT_NUMBER,
            )
            UseSense.initialize(ctx, nativeConfig)

            // Subscribe to native events and forward them to Dart via FlutterApi.
            eventUnsubscribe?.invoke()
            eventUnsubscribe = UseSense.onEvent { event ->
                mainHandler.post {
                    flutterApi?.onEvent(mapEventToPigeon(event)) {}
                }
            }

            callback(Result.success(Unit))
        } catch (e: Exception) {
            callback(Result.failure(FlutterError("invalid_config", e.message, null)))
        }
    }

    override fun startVerification(
        request: PigeonVerificationRequest,
        callback: (Result<PigeonUseSenseResult>) -> Unit,
    ) {
        val currentActivity = activity
        if (currentActivity == null) {
            callback(Result.failure(FlutterError("sdk_not_initialized", "Activity is not available. Ensure the plugin is attached to an Activity.", null)))
            return
        }
        if (!UseSense.isInitialized) {
            callback(Result.failure(FlutterError("sdk_not_initialized", "UseSense SDK is not initialized. Call initialize() first.", null)))
            return
        }

        val sessionType = when (request.sessionType) {
            PigeonSessionType.ENROLLMENT -> SessionType.ENROLLMENT
            PigeonSessionType.AUTHENTICATION -> SessionType.AUTHENTICATION
        }

        val nativeRequest = VerificationRequest(
            sessionType = sessionType,
            externalUserId = request.externalUserId,
            identityId = request.identityId,
            metadata = request.metadata?.let { map ->
                @Suppress("UNCHECKED_CAST")
                map as Map<String, Any>
            },
        )

        UseSense.startVerification(currentActivity, nativeRequest, object : UseSenseCallback {
            override fun onSuccess(result: UseSenseResult) {
                mainHandler.post {
                    callback(Result.success(mapResultToPigeon(result)))
                }
            }

            override fun onError(error: UseSenseError) {
                mainHandler.post {
                    callback(Result.failure(mapErrorToFlutter(error)))
                }
            }

            override fun onCancelled() {
                mainHandler.post {
                    flutterApi?.onCancelled {}
                    callback(Result.failure(FlutterError("session_cancelled", "User cancelled the verification session.", null)))
                }
            }
        })
    }

    override fun startRemoteEnrollment(
        remoteEnrollmentId: String,
        callback: (Result<PigeonUseSenseResult>) -> Unit,
    ) {
        val ctx = context
        if (ctx == null) {
            callback(Result.failure(FlutterError("sdk_not_initialized", "Android context is not available.", null)))
            return
        }
        if (!UseSense.isInitialized) {
            callback(Result.failure(FlutterError("sdk_not_initialized", "UseSense SDK is not initialized. Call initialize() first.", null)))
            return
        }

        // The native SDK handles the hosted page flow internally.
        // We use startRemoteEnrollment which launches a HostedPageActivity.
        // The callback is handled via the event system – we listen for the
        // DECISION_RECEIVED event to resolve this future.
        try {
            UseSense.startRemoteEnrollment(ctx, remoteEnrollmentId)
            // Remote flows resolve via events – we set up a one-shot listener
            // to capture the result and resolve the callback.
            listenForSessionResult(callback)
        } catch (e: Exception) {
            callback(Result.failure(FlutterError("sdk_error", e.message, null)))
        }
    }

    override fun startRemoteVerification(
        remoteSessionId: String,
        callback: (Result<PigeonUseSenseResult>) -> Unit,
    ) {
        val ctx = context
        if (ctx == null) {
            callback(Result.failure(FlutterError("sdk_not_initialized", "Android context is not available.", null)))
            return
        }
        if (!UseSense.isInitialized) {
            callback(Result.failure(FlutterError("sdk_not_initialized", "UseSense SDK is not initialized. Call initialize() first.", null)))
            return
        }

        try {
            UseSense.startRemoteVerification(ctx, remoteSessionId)
            listenForSessionResult(callback)
        } catch (e: Exception) {
            callback(Result.failure(FlutterError("sdk_error", e.message, null)))
        }
    }

    override fun isInitialized(): Boolean {
        return UseSense.isInitialized
    }

    override fun reset() {
        eventUnsubscribe?.invoke()
        eventUnsubscribe = null
        UseSense.reset()
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private fun listenForSessionResult(callback: (Result<PigeonUseSenseResult>) -> Unit) {
        var unsubscribe: (() -> Unit)? = null
        unsubscribe = UseSense.onEvent { event ->
            when (event.type) {
                EventType.DECISION_RECEIVED -> {
                    unsubscribe?.invoke()
                    val data = event.data ?: emptyMap()
                    val result = PigeonUseSenseResult(
                        sessionId = data["sessionId"]?.toString() ?: "",
                        sessionType = data["sessionType"]?.toString(),
                        identityId = data["identityId"]?.toString(),
                        decision = data["decision"]?.toString() ?: "REJECT",
                        timestamp = data["timestamp"]?.toString() ?: "",
                    )
                    mainHandler.post { callback(Result.success(result)) }
                }
                EventType.ERROR -> {
                    unsubscribe?.invoke()
                    val msg = event.data?.get("message")?.toString() ?: "Session failed."
                    mainHandler.post {
                        callback(Result.failure(FlutterError("session_error", msg, null)))
                    }
                }
                else -> { /* ignore other events */ }
            }
        }
    }

    private fun mapEventToPigeon(event: UseSenseEvent): PigeonUseSenseEvent {
        val pigeonType = when (event.type) {
            EventType.SESSION_CREATED -> PigeonEventType.SESSION_CREATED
            EventType.PERMISSIONS_REQUESTED -> PigeonEventType.PERMISSIONS_REQUESTED
            EventType.PERMISSIONS_GRANTED -> PigeonEventType.PERMISSIONS_GRANTED
            EventType.PERMISSIONS_DENIED -> PigeonEventType.PERMISSIONS_DENIED
            EventType.CAPTURE_STARTED -> PigeonEventType.CAPTURE_STARTED
            EventType.FRAME_CAPTURED -> PigeonEventType.FRAME_CAPTURED
            EventType.CAPTURE_COMPLETED -> PigeonEventType.CAPTURE_COMPLETED
            EventType.AUDIO_RECORD_STARTED -> PigeonEventType.AUDIO_RECORD_STARTED
            EventType.AUDIO_RECORD_COMPLETED -> PigeonEventType.AUDIO_RECORD_COMPLETED
            EventType.CHALLENGE_STARTED -> PigeonEventType.CHALLENGE_STARTED
            EventType.CHALLENGE_COMPLETED -> PigeonEventType.CHALLENGE_COMPLETED
            EventType.UPLOAD_STARTED -> PigeonEventType.UPLOAD_STARTED
            EventType.UPLOAD_PROGRESS -> PigeonEventType.UPLOAD_PROGRESS
            EventType.UPLOAD_COMPLETED -> PigeonEventType.UPLOAD_COMPLETED
            EventType.COMPLETE_STARTED -> PigeonEventType.COMPLETE_STARTED
            EventType.DECISION_RECEIVED -> PigeonEventType.DECISION_RECEIVED
            EventType.IMAGE_QUALITY_CHECK -> PigeonEventType.IMAGE_QUALITY_CHECK
            EventType.ERROR -> PigeonEventType.ERROR
        }

        // Convert data map values to platform-channel-compatible types.
        val safeData = event.data?.mapValues { (_, v) ->
            when (v) {
                is String, is Int, is Long, is Double, is Boolean -> v
                null -> null
                else -> v.toString()
            }
        }

        return PigeonUseSenseEvent(
            type = pigeonType,
            timestamp = event.timestamp,
            data = safeData,
        )
    }

    private fun mapResultToPigeon(result: UseSenseResult): PigeonUseSenseResult {
        return PigeonUseSenseResult(
            sessionId = result.sessionId,
            sessionType = result.sessionType,
            identityId = result.identityId,
            decision = result.decision,
            timestamp = result.timestamp,
        )
    }

    private fun mapErrorToFlutter(error: UseSenseError): FlutterError {
        val code = when (error.code) {
            UseSenseError.CAMERA_UNAVAILABLE -> "camera_unavailable"
            UseSenseError.CAMERA_PERMISSION_DENIED -> "camera_permission_denied"
            UseSenseError.MICROPHONE_PERMISSION_DENIED -> "microphone_permission_denied"
            UseSenseError.NETWORK_ERROR -> "network_error"
            UseSenseError.NETWORK_TIMEOUT -> "network_timeout"
            UseSenseError.SESSION_EXPIRED -> "session_expired"
            UseSenseError.UPLOAD_FAILED -> "upload_failed"
            UseSenseError.CAPTURE_FAILED -> "capture_failed"
            UseSenseError.ENCODING_FAILED -> "encoding_failed"
            UseSenseError.INVALID_CONFIG -> "invalid_config"
            UseSenseError.QUOTA_EXCEEDED -> "quota_exceeded"
            else -> "sdk_error"
        }
        return FlutterError(code, error.message, error.details)
    }
}
