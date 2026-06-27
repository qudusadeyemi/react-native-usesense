require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-usesense"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = { :type => "Proprietary", :file => "LICENSE" }
  s.authors      = { "UseSense Technologies Ltd." => "support@usesense.ai" }
  s.source       = { :git => package["repository"]["url"], :tag => "v#{s.version}" }

  # Minimum iOS 15.0 to match the native UseSense iOS SDK's floor
  # (v4.x uses SwiftUI features that require iOS 15.0 and up).
  s.platforms    = { :ios => "15.0" }
  s.swift_version = "5.9"

  s.source_files = "ios/**/*.{swift,h,m}"

  # React Native dependency (supports both old and new architecture)
  install_modules_dependencies(s)

  # Native UseSense iOS SDK. Minimum 4.2.2 — earlier 4.x releases had
  # terminal-screen centering bugs, and the 1.x series used a pre-
  # redaction result type with a completely different UseSenseConfig
  # init signature. See CHANGELOG [2.0.0] for the full rewrite
  # rationale.
  s.dependency "UseSenseSDK", "~> 4.5"
end
