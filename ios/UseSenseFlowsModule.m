#import <React/RCTBridgeModule.h>

// Bridging header for the Flows runner module. Single JS-callable method:
// runFlow(flowRunId, sdkToken, apiBaseUrl?, appearance?, copy?). The apiBaseUrl
// parameter is nullable from JS — pass `null` (or omit, since the JS wrapper
// supplies a default) and the native side falls back to https://api.usesense.ai.
// `appearance` / `copy` are nullable JS objects (the white-label contract);
// when non-null they're decoded by FlowAppearance/FlowCopy.decodeFromJSONObject.
@interface RCT_EXTERN_MODULE(UseSenseFlowsModule, NSObject)

RCT_EXTERN_METHOD(runFlow:(NSString *)flowRunId
                  sdkToken:(NSString *)sdkToken
                  apiBaseUrl:(NSString * _Nullable)apiBaseUrl
                  appearance:(NSDictionary * _Nullable)appearance
                  copy:(NSDictionary * _Nullable)copy
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
