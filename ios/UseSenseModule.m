#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// ---------------------------------------------------------------------------
// ObjC interface declaration for the Swift-implemented UseSenseModule.
// This file is required so that React Native's bridge can discover the module
// at runtime on both the old and new architectures.
// ---------------------------------------------------------------------------

@interface RCT_EXTERN_MODULE(UseSenseModule, RCTEventEmitter)

RCT_EXTERN_METHOD(initialize:(NSDictionary *)config)

RCT_EXTERN_METHOD(startVerification:(NSDictionary *)request
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isInitialized:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reset)

RCT_EXTERN_METHOD(subscribeToEvents)

RCT_EXTERN_METHOD(unsubscribeFromEvents)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
