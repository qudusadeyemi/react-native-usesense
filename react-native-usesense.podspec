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

  s.platforms    = { :ios => "14.0" }
  s.swift_version = "5.9"

  s.source_files = "ios/**/*.{swift,h,m}"

  # React Native dependency (supports both old and new architecture)
  install_modules_dependencies(s)

  # Native UseSense iOS SDK
  s.dependency "UseSenseSDK", "~> 1.0"
end
