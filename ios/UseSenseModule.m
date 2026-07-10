#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Objective-C bridge declarations for the Swift `UseSenseModule` (an
// RCTEventEmitter). Each RCT_EXTERN_METHOD selector MUST match a Swift @objc
// method signature exactly, or the method is not exposed to JS.
//
// This file previously drifted from the Swift: it declared startSession /
// cancelSession / getSessionStatus / subscribeToEvents / unsubscribeFromEvents /
// getSdkVersion (none of which exist in UseSenseModule.swift) and OMITTED the
// methods JS actually calls (startVerification / reset / isInitialized), plus
// declared `initialize` without its resolver/rejecter. The result was that
// `UseSense.startVerification()` / `reset()` / `isInitialized()` silently failed
// on iOS. These declarations now mirror the Swift 1:1.
//
// addListener:/removeListeners: are provided by RCTEventEmitter itself and are
// intentionally not declared here.
@interface RCT_EXTERN_MODULE(UseSenseModule, RCTEventEmitter)

RCT_EXTERN_METHOD(initialize:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startVerification:(NSDictionary *)request
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// LiveSense v4 passthrough (R-1)
RCT_EXTERN_METHOD(startV4Verification:(NSDictionary *)request
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reset:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isInitialized:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
