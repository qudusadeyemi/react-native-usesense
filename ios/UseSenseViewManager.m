#import <React/RCTViewManager.h>

// Objective-C bridge declarations for the Swift `RNUseSenseViewManager`
// (`<UseSenseView />`). Each property must match an @objc property on
// `UseSenseHostView`.
@interface RCT_EXTERN_MODULE(RNUseSenseViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(launch, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onUseSenseComplete, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onUseSenseError, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onUseSenseCancel, RCTDirectEventBlock)

@end
