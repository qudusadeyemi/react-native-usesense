package com.usesense.reactnative

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native package that registers [UseSenseModule].
 *
 * On React Native 0.60+ with autolinking this is discovered automatically.
 * For manual linking, add `UseSensePackage()` to your `getPackages()` list.
 */
class UseSensePackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> {
        return listOf(UseSenseModule(reactContext))
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> {
        return emptyList()
    }
}
