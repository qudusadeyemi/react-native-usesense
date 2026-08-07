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
  # 4.6.1 raised the floor: earlier 4.6.x tore the runner down on a failed
  # document upload, ejecting the subject mid-flow, and cancelling the
  # scanner or photo picker cancelled the whole verification.
  # 4.6.2 is the floor: below it an upload that arrived incomplete was reported
  # as `provider`, so the runner told a subject holding a perfectly good
  # document that verification was "temporarily unavailable" and offered a
  # retry that re-sent identical bytes.
  # 4.6.3 is the floor: from it the runner reports whether the subject scanned
  # the document or chose a file, so failure guidance can name an action they
  # can actually take. Below it the server has to guess from the step config.
  # 4.7.0 is the floor: below it the signals upload could not complete on a
  # slow connection. Frames were encoded at the camera's full 1080x1920 with no
  # downscale, so a session put 12.9 MB on the wire, against a 30s request
  # timeout and a 120s URLSession resource timeout. A measured production
  # session uploaded at 14.6 KB/s, so the transfer was cancelled every time and
  # the subject just saw a spinner. 4.7.0 caps frames at 960, raises both
  # timeouts to 300s, gzips the metadata, and emits real upload progress.
  #
  # Note `~> 4.7.0` means >= 4.7.0, < 4.8.0. The previous `~> 4.6.3` excluded
  # 4.7.0 outright, so this pin has to be raised by hand for every native fix.
  s.dependency "UseSenseSDK", "~> 4.7.0"
end
