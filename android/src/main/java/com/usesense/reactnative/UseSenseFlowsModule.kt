package com.usesense.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.usesense.sdk.flows.FlowError
import com.usesense.sdk.flows.FlowOutcome
import com.usesense.sdk.flows.FlowRunResult
import com.usesense.sdk.flows.FlowRunState
import com.usesense.sdk.flows.FlowsCallback
import com.usesense.sdk.flows.UseSenseFlows

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
    fun runFlow(flowRunId: String?, sdkToken: String?, apiBaseUrl: String?, promise: Promise) {
        if (flowRunId.isNullOrEmpty() || sdkToken.isNullOrEmpty()) {
            promise.reject("unknown", "flowRunId and sdkToken are required")
            return
        }
        val activity = reactContext.currentActivity ?: run {
            promise.reject("unknown", "No current activity to launch from")
            return
        }
        val baseUrl = apiBaseUrl ?: "https://api.usesense.ai"

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
        )
    }

    private fun stateWire(state: FlowRunState): String = state.wire
    private fun outcomeWire(outcome: FlowOutcome): String = outcome.wire
}
