package com.usesense.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.usesense.sdk.flows.FlowAppearance
import com.usesense.sdk.flows.FlowCopy
import com.usesense.sdk.flows.FlowError
import com.usesense.sdk.flows.FlowOutcome
import com.usesense.sdk.flows.FlowRunResult
import com.usesense.sdk.flows.FlowRunState
import com.usesense.sdk.flows.FlowsCallback
import com.usesense.sdk.flows.UseSenseFlows
import org.json.JSONObject

/**
 * React Native bridge for the UseSense Android Flows runner.
 *
 * Exposes a single JS-callable method, `runFlow`, that forwards into the
 * native `UseSenseFlows.run(activity, flowRunId, sdkToken, callback)` entry
 * point and resolves the Promise with a `FlowRunResult` map. On failure the
 * Promise rejects with `FlowError.Code.wire` as the JS error code, mirroring
 * the taxonomy host apps catch on every other surface.
 *
 * Sits alongside `UseSenseModule` (Sessions); the existing module is
 * untouched. Sessions and Flows coexist — host apps pick one per call.
 */
class UseSenseFlowsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "UseSenseFlowsModule"

    @ReactMethod
    fun runFlow(
        flowRunId: String?,
        sdkToken: String?,
        apiBaseUrl: String?,
        appearance: ReadableMap?,
        copy: ReadableMap?,
        promise: Promise,
    ) {
        if (flowRunId.isNullOrEmpty() || sdkToken.isNullOrEmpty()) {
            promise.reject("unknown", "flowRunId and sdkToken are required")
            return
        }
        val activity = reactContext.currentActivity ?: run {
            promise.reject("unknown", "No current activity to launch from")
            return
        }
        val baseUrl = apiBaseUrl ?: "https://api.usesense.ai"

        // White-label maps are forwarded raw from JS (camelCase, matching the
        // web contract). Decode them via the SDK; a malformed payload degrades
        // to null (built-in tokens) rather than failing the run.
        val resolvedAppearance = appearance?.let { runCatching { FlowAppearance.decode(it.toJSONObject()) }.getOrNull() }
        val resolvedCopy = copy?.let { runCatching { FlowCopy.decode(it.toJSONObject()) }.getOrNull() }

        val callback = object : FlowsCallback {
            override fun onResult(result: FlowRunResult) {
                val map = Arguments.createMap().apply {
                    putString("flowRunId", result.flowRunId)
                    putString("state", stateWire(result.state))
                    val outcomeStr = result.outcome?.let { outcomeWire(it) }
                    if (outcomeStr != null) putString("outcome", outcomeStr)
                    else putNull("outcome")
                }
                promise.resolve(map)
            }

            override fun onError(error: FlowError) {
                promise.reject(error.code.wire, error.message)
            }
        }

        UseSenseFlows.run(
            activity = activity,
            flowRunId = flowRunId,
            sdkToken = sdkToken,
            callback = callback,
            apiBaseUrl = baseUrl,
            appearance = resolvedAppearance,
            copy = resolvedCopy,
        )
    }

    private fun stateWire(state: FlowRunState): String = state.wire
    private fun outcomeWire(outcome: FlowOutcome): String = outcome.wire

    /**
     * Convert a React Native [ReadableMap] to an [org.json.JSONObject] so the
     * SDK's `decode(JSONObject)` can read it. `toHashMap()` yields nested
     * HashMap / ArrayList values, which `JSONObject(Map)` walks recursively.
     */
    private fun ReadableMap.toJSONObject(): JSONObject = JSONObject(this.toHashMap() as Map<*, *>)
}
