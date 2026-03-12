require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-usesense"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["repository"]["url"]
  s.license      = package["license"]
  s.authors      = { "UseSense" => "support@usesense.ai" }
  s.source       = { :git => package["repository"]["url"], :tag => s.version }

  s.platforms    = { :ios => "15.0" }
  s.swift_version = "5.9"

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  # UseSense iOS SDK — the native SDK is distributed as a Swift Package.
  # In the consuming app's Podfile, add the SDK via SPM or as a local pod:
  #
  #   Option A (SPM in Xcode): Add package https://github.com/qudusadeyemi/usesense-ios-sdk.git
  #
  #   Option B (local pod):
  #     pod 'UseSenseSDK', :path => '../usesense-ios-sdk'
  #
  # When the SDK publishes a CocoaPod, uncomment:
  # s.dependency "UseSenseSDK", "~> 1.0"

  # --- React Native New Architecture (TurboModules) ---
  install_modules_dependencies(s)
end
