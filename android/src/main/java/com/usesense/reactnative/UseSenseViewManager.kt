package com.usesense.reactnative

import android.annotation.SuppressLint
import android.view.View
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.usesense.sdk.UseSense
import com.usesense.sdk.UseSenseCallback
import com.usesense.sdk.UseSenseError
import com.usesense.sdk.UseSenseResult
import com.usesense.sdk.VerificationRequest
import com.usesense.sdk.ui.UseSenseFragment

/**
 * `<UseSenseView />` on Android: hosts the SDK's embedded [UseSenseFragment]
 * (the same capture Fragment the full-screen Activity uses) inside a React
 * Native view. A legacy view manager, so it also runs under the New
 * Architecture through RN's interop layer.
 */
class UseSenseViewManager : SimpleViewManager<UseSenseHostView>() {

    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): UseSenseHostView = UseSenseHostView(context)

    @ReactProp(name = "launch")
    fun setLaunch(view: UseSenseHostView, launch: ReadableMap?) {
        view.launch = launch?.toHashMap()
    }

    override fun onAfterUpdateTransaction(view: UseSenseHostView) {
        super.onAfterUpdateTransaction(view)
        view.maybeStart()
    }

    override fun onDropViewInstance(view: UseSenseHostView) {
        view.dispose()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> = mapOf(
        EVENT_COMPLETE to mapOf("registrationName" to "onUseSenseComplete"),
        EVENT_ERROR to mapOf("registrationName" to "onUseSenseError"),
        EVENT_CANCEL to mapOf("registrationName" to "onUseSenseCancel"),
    )

    companion object {
        const val NAME = "RNUseSenseView"
        const val EVENT_COMPLETE = "topUseSenseComplete"
        const val EVENT_ERROR = "topUseSenseError"
        const val EVENT_CANCEL = "topUseSenseCancel"
    }
}

/**
 * The React view. Its own id is React's tag, so the Fragment goes into a
 * child container with a generated id. React Native does not lay out native
 * children, so the view measures and lays them out itself.
 */
@SuppressLint("ViewConstructor")
class UseSenseHostView(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {

    /** Set once from JS: `{ kind: "request" | "token", ... }`. */
    var launch: Map<String, Any?>? = null

    private val container = FrameLayout(reactContext).apply { id = View.generateViewId() }
    private val fragmentTag = "usesense.embedded.${container.id}"
    private var fragment: UseSenseFragment? = null
    private var started = false
    /** A callback fired or the view was dropped: nothing more reaches JS. */
    private var settled = false

    init {
        addView(container, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    private val measureAndLayout = Runnable {
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
        )
        layout(left, top, right, bottom)
    }

    override fun requestLayout() {
        super.requestLayout()
        // The capture screens change layout on their own (camera preview,
        // overlays); React Native would never re-run layout for them.
        post(measureAndLayout)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        maybeStart()
    }

    /** Starts once: when the launch prop is set and the view is in the window. */
    fun maybeStart() {
        val launch = launch ?: return
        if (started || settled || !isAttachedToWindow) return
        started = true

        val activity = reactContext.currentActivity as? FragmentActivity ?: run {
            emitError("no_activity", "UseSenseView needs a FragmentActivity (ReactActivity is one)")
            return
        }
        // The FragmentManager looks the container up in the Activity's own
        // window; a view inside a React Native <Modal> (its own dialog window)
        // is not found there and would crash the commit.
        if (activity.findViewById<View>(container.id) == null) {
            emitError(
                "unsupported_container",
                "UseSenseView must be in the Activity's window, not inside a React Native <Modal>",
            )
            return
        }

        val newFragment = try {
            createFragment(launch)
        } catch (e: IllegalStateException) {
            emitError("sdk_not_initialized", e.message ?: "UseSense SDK is not initialized. Call initialize() first.")
            return
        } ?: return

        newFragment.setCallback(object : UseSenseCallback {
            override fun onSuccess(result: UseSenseResult) =
                finish { emit(UseSenseViewManager.EVENT_COMPLETE, UseSenseModule.resultMap(result)) }

            override fun onError(error: UseSenseError) =
                finish { emit(UseSenseViewManager.EVENT_ERROR, nativeErrorMap(error)) }

            override fun onCancelled() =
                finish { emit(UseSenseViewManager.EVENT_CANCEL, Arguments.createMap()) }
        })
        fragment = newFragment
        activity.supportFragmentManager.beginTransaction()
            .replace(container.id, newFragment, fragmentTag)
            .commitAllowingStateLoss()
    }

    private fun createFragment(launch: Map<String, Any?>): UseSenseFragment? {
        val sessionType = UseSenseModule.sessionTypeOf(launch["sessionType"] as? String)
        return when (launch["kind"]) {
            "token" -> UseSenseFragment.newInstanceWithToken(
                (launch["clientToken"] as? String).orEmpty(),
                sessionType,
            )
            "request" -> {
                if (!UseSense.isInitialized) {
                    emitError("sdk_not_initialized", "UseSense SDK is not initialized. Call initialize() first.")
                    return null
                }
                @Suppress("UNCHECKED_CAST")
                UseSenseFragment.newInstance(
                    VerificationRequest(
                        sessionType = sessionType,
                        externalUserId = launch["externalUserId"] as? String,
                        identityId = launch["identityId"] as? String,
                        metadata = launch["metadata"] as? Map<String, Any>,
                    ),
                )
            }
            else -> {
                emitError("INVALID_CONFIG", "UseSenseView launch has no kind")
                null
            }
        }
    }

    /** The capture ended: remove the Fragment (the SDK asks the host to) and report once. */
    private fun finish(report: () -> Unit) {
        if (settled) return
        settled = true
        removeFragment()
        report()
    }

    /** Unmounted. Removing the Fragment ends the capture; its onCancelled is not forwarded. */
    fun dispose() {
        settled = true
        removeFragment()
        removeCallbacks(measureAndLayout)
    }

    private fun removeFragment() {
        val f = fragment ?: return
        fragment = null
        val fm = f.parentFragmentManager.takeIf { f.isAdded } ?: return
        if (fm.isDestroyed) return
        fm.beginTransaction().remove(f).commitAllowingStateLoss()
    }

    private fun emitError(code: String, message: String) {
        if (settled) return
        settled = true
        emit(
            UseSenseViewManager.EVENT_ERROR,
            Arguments.createMap().apply {
                putString("code", code)
                putString("message", message)
                putBoolean("isRetryable", false)
            },
        )
    }

    /** Same fields the promise rejection carries, with the code as a string. */
    private fun nativeErrorMap(error: UseSenseError): WritableMap = Arguments.createMap().apply {
        putString("code", error.code.toString())
        putString("message", error.message)
        putBoolean("isRetryable", error.isRetryable)
        putString("serverCode", error.serverCode)
    }

    private fun emit(name: String, payload: WritableMap) {
        val ctx = context as? ReactContext ?: return
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(ctx, id) ?: return
        dispatcher.dispatchEvent(UseSenseViewEvent(UIManagerHelper.getSurfaceId(this), id, name, payload))
    }
}

private class UseSenseViewEvent(
    surfaceId: Int,
    viewId: Int,
    private val name: String,
    private val payload: WritableMap,
) : Event<UseSenseViewEvent>(surfaceId, viewId) {
    override fun getEventName(): String = name
    override fun canCoalesce(): Boolean = false
    override fun getEventData(): WritableMap = payload
}
