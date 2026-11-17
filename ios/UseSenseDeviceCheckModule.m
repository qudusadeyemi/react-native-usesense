#import <React/RCTBridgeModule.h>

// Bridging header for the headless silent device check module.
// start(handle, config) and finish(handle, config) always resolve with
// {ok, phase, error?}; dispose(handle) releases the native check.
@interface RCT_EXTERN_MODULE(UseSenseDeviceCheckModule, NSObject)

RCT_EXTERN_METHOD(start:(NSString * _Nullable)handle
                  config:(NSDictionary * _Nullable)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(finish:(NSString * _Nullable)handle
                  config:(NSDictionary * _Nullable)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(dispose:(NSString * _Nullable)handle)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
