package com.usesense.reactnative

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class UseSensePackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            UseSenseModule(reactContext),
            // Slice 5d: Flows runner module (parallel surface to Sessions, not
            // a replacement). Host apps pick one per call.
            UseSenseFlowsModule(reactContext),
            // Headless silent device check for Your KYC (no UI).
            UseSenseDeviceCheckModule(reactContext),
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        // <UseSenseView />: the embedded capture (UseSenseFragment).
        return listOf(UseSenseViewManager())
    }
}
