#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(UseSenseModule, RCTEventEmitter)

RCT_EXTERN_METHOD(initialize:(NSDictionary *)config)

RCT_EXTERN_METHOD(startSession:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cancelSession:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSessionStatus:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(subscribeToEvents)

RCT_EXTERN_METHOD(unsubscribeFromEvents)

// LiveSense v4 passthrough (R-1)
RCT_EXTERN_METHOD(startV4Verification:(NSDictionary *)request
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSdkVersion)

@end
