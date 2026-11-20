#!/usr/bin/env python3
"""
native_pins.py -- keep this wrapper pinned to the latest native UseSense SDKs.

The Flutter and React Native packages are thin wrappers over the native Android
(Maven Central `ai.usesense:sdk`) and iOS (CocoaPods `UseSenseSDK`) SDKs. Every
place this repo names a native version is listed in PINS below.

  python3 scripts/native_pins.py check            fail if any pin is behind
  python3 scripts/native_pins.py bump             move every pin to the latest
  python3 scripts/native_pins.py bump --android 4.17.0 --ios 4.15.0
  python3 scripts/native_pins.py latest           print the latest versions
  python3 scripts/native_pins.py bump-patch       bump this package's patch
                                                  version if the current one
                                                  is already released (tagged)
  python3 scripts/native_pins.py wait             wait until the latest native
                                                  versions are installable
                                                  (Maven Central + the CocoaPods
                                                  CDN version index)
  python3 scripts/native_pins.py changelog        record the native bump in
                                                  CHANGELOG.md

`check` fails by default. To ship a wrapper that intentionally lags a native
release, set NATIVE_PINS_ALLOW_LAG=1 (CI sets it when the PR carries the
`native-pins-lag-ok` label); the report still prints.

Standard library only, so it runs on any CI runner.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAVEN_METADATA = "https://repo1.maven.org/maven2/ai/usesense/sdk/maven-metadata.xml"
TRUNK_POD = "https://trunk.cocoapods.org/api/v1/pods/UseSenseSDK"

V = r"(?P<v>\d+\.\d+\.\d+)"


@dataclass(frozen=True)
class Pin:
    path: str
    pattern: str
    platform: str  # "android" | "ios"
    mode: str  # "exact" | "tilde" (CocoaPods ~> A.B.C: >= A.B.C, < A.(B+1))
    bump: bool = True  # False: checked only (e.g. a lock file updated by `pod update`)


def detect() -> str:
    if (ROOT / "pubspec.yaml").exists():
        return "flutter"
    pkg = ROOT / "package.json"
    if pkg.exists() and json.loads(pkg.read_text()).get("name") == "react-native-usesense":
        return "react-native"
    sys.exit("native_pins.py: run from the Flutter or React Native wrapper repo")


PINS = {
    "flutter": [
        Pin("android/build.gradle.kts", r'implementation\("ai\.usesense:sdk:' + V + r'"\)', "android", "exact"),
        Pin("ios/usesense_flutter.podspec", r"s\.dependency 'UseSenseSDK', '~> " + V + "'", "ios", "tilde"),
    ],
    "react-native": [
        Pin("android/build.gradle", r'implementation "ai\.usesense:sdk:' + V + '"', "android", "exact"),
        Pin("react-native-usesense.podspec", r's\.dependency "UseSenseSDK", "~> ' + V + '"', "ios", "tilde"),
        Pin("README.md", r"pinned to\s+`~> " + V + "`", "ios", "tilde"),
        # The example's committed lock is regenerated with `pod update`, never edited.
        Pin("example/ios/Podfile.lock", r"^  - UseSenseSDK \(" + V + r"\)", "ios", "exact", bump=False),
        Pin("example/ios/Podfile.lock", r"^  - UseSenseMediaPipe \(" + V + r"\)", "ios", "exact", bump=False),
        Pin("example/ios/Podfile.lock", r"^    - UseSenseSDK \(~> " + V + r"\)", "ios", "tilde", bump=False),
    ],
}


def vt(v: str) -> tuple[int, ...]:
    return tuple(int(x) for x in v.split("."))


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "usesense-native-pins"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode()


def latest() -> dict[str, str]:
    m = re.search(r"<release>([^<]+)</release>", fetch(MAVEN_METADATA))
    if not m:
        sys.exit("native_pins.py: could not read the latest ai.usesense:sdk from Maven Central")
    pod = json.loads(fetch(TRUNK_POD))
    ios = [v["name"] for v in pod.get("versions", []) if re.fullmatch(r"\d+\.\d+\.\d+", v.get("name", ""))]
    if not ios:
        sys.exit("native_pins.py: could not read UseSenseSDK versions from CocoaPods trunk")
    return {"android": m.group(1), "ios": max(ios, key=vt)}


def satisfied(pin: Pin, found: str, want: str) -> bool:
    if pin.mode == "exact":
        return found == want
    # ~> A.B.C resolves the latest only when it is A.B.x with x >= C.
    return vt(want)[:2] == vt(found)[:2] and vt(want) >= vt(found)


def scan() -> list[tuple[Pin, list[str]]]:
    out = []
    for pin in PINS[detect()]:
        path = ROOT / pin.path
        if not path.exists():
            out.append((pin, []))
            continue
        found = [m.group("v") for m in re.finditer(pin.pattern, path.read_text(), re.M)]
        out.append((pin, found))
    return out


def cmd_check() -> int:
    want = latest()
    print(f"Latest native SDKs: Android {want['android']}, iOS {want['ios']}")
    problems = []
    for pin, found in scan():
        label = f"{pin.path} ({pin.platform}, {pin.mode})"
        if not found:
            problems.append(f"  MISSING  {label}: pattern not found; update PINS in scripts/native_pins.py")
            continue
        for f in found:
            ok = satisfied(pin, f, want[pin.platform])
            print(f"  {'ok      ' if ok else 'BEHIND  '} {label}: {f}")
            if not ok:
                problems.append(f"  BEHIND   {label}: {f}, latest is {want[pin.platform]}")
    if not problems:
        print("All native pins are on the latest native SDKs.")
        return 0
    print("\nNative pins are behind the latest native SDK releases:")
    print("\n".join(problems))
    print(
        "\nFix: python3 scripts/native_pins.py bump  (then, for React Native, "
        "`cd example/ios && pod update UseSenseSDK UseSenseMediaPipe`)."
    )
    if os.environ.get("NATIVE_PINS_ALLOW_LAG") == "1":
        print("NATIVE_PINS_ALLOW_LAG=1: reporting only (PR labelled native-pins-lag-ok).")
        return 0
    return 1


def cmd_bump(args: list[str]) -> int:
    want = latest()
    for flag in ("--android", "--ios"):
        if flag in args:
            want[flag[2:]] = args[args.index(flag) + 1]
    changed = False
    for pin in PINS[detect()]:
        if not pin.bump:
            continue
        path = ROOT / pin.path
        text = path.read_text()

        def repl(m: re.Match) -> str:
            s, e = m.span("v")
            return m.group(0)[: s - m.start()] + want[pin.platform] + m.group(0)[e - m.start():]

        new, n = re.subn(pin.pattern, repl, text, flags=re.M)
        if n == 0:
            sys.exit(f"native_pins.py: {pin.path}: pattern not found")
        if new != text:
            path.write_text(new)
            changed = True
            print(f"  bumped {pin.path} -> {pin.platform} {want[pin.platform]}")
    print("Pins changed." if changed else "Pins already on the requested versions.")
    return 0


VERSION_FILES = {
    "flutter": [
        ("pubspec.yaml", r"^version: (?P<v>\d+\.\d+\.\d+)$"),
        ("ios/usesense_flutter.podspec", r"s\.version\s+= '(?P<v>\d+\.\d+\.\d+)'"),
        ("android/build.gradle.kts", r'^version = "(?P<v>\d+\.\d+\.\d+)"'),
        ("README.md", r"usesense_flutter: \^(?P<v>\d+\.\d+\.\d+)"),
    ],
    "react-native": [
        ("package.json", r'^  "version": "(?P<v>\d+\.\d+\.\d+)"'),
    ],
}


def cmd_bump_patch() -> int:
    """Bump this package's patch version once, only if the current one is tagged."""
    kind = detect()
    files = VERSION_FILES[kind]
    first = (ROOT / files[0][0]).read_text()
    cur = re.search(files[0][1], first, re.M).group("v")
    tags = subprocess.run(["git", "tag", "-l", f"v{cur}"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    if not tags:
        print(f"{cur} is not released yet (no tag v{cur}); keeping it.")
        print(cur)
        return 0
    a, b, c = vt(cur)
    nxt = f"{a}.{b}.{c + 1}"
    for rel, pattern in files:
        p = ROOT / rel
        t = p.read_text()
        p.write_text(re.sub(pattern, lambda m: m.group(0).replace(m.group("v"), nxt), t, count=1, flags=re.M))
    if kind == "react-native":
        subprocess.run(["npm", "version", nxt, "--no-git-tag-version", "--allow-same-version"], cwd=ROOT, check=True)
    print(nxt)
    return 0


def cdn_index_has(pod: str, version: str) -> bool:
    """CocoaPods resolves from a per-pod index file, which lags the trunk push."""
    import hashlib
    h = hashlib.md5(pod.encode()).hexdigest()
    url = f"https://cdn.cocoapods.org/all_pods_versions_{h[0]}_{h[1]}_{h[2]}.txt?t={int(__import__('time').time())}"
    try:
        for line in fetch(url).splitlines():
            parts = line.split("/")
            if parts and parts[0] == pod:
                return version in parts[1:]
    except Exception:
        return False
    return False


def maven_has(version: str) -> bool:
    try:
        fetch(f"https://repo1.maven.org/maven2/ai/usesense/sdk/{version}/sdk-{version}.pom")
        return True
    except Exception:
        return False


def cmd_wait(args: list[str]) -> int:
    import time
    minutes = int(args[args.index("--minutes") + 1]) if "--minutes" in args else 45
    want = latest()
    deadline = time.time() + minutes * 60
    while True:
        ready = {
            "Maven Central ai.usesense:sdk " + want["android"]: maven_has(want["android"]),
            "CocoaPods UseSenseSDK " + want["ios"]: cdn_index_has("UseSenseSDK", want["ios"]),
            "CocoaPods UseSenseMediaPipe " + want["ios"]: cdn_index_has("UseSenseMediaPipe", want["ios"]),
        }
        missing = [k for k, ok in ready.items() if not ok]
        if not missing:
            print("Installable: " + ", ".join(ready))
            return 0
        if time.time() > deadline:
            print("Still not installable after %d min: %s" % (minutes, ", ".join(missing)))
            return 1
        print("Waiting for: " + ", ".join(missing))
        time.sleep(60)


def cmd_changelog() -> int:
    """Add a 'Native SDKs' line under the top version heading (adding one if new)."""
    import datetime
    kind = detect()
    files = VERSION_FILES[kind]
    cur = re.search(files[0][1], (ROOT / files[0][0]).read_text(), re.M).group("v")
    want = {}
    for pin, found in scan():
        if found and pin.mode == "exact":
            want.setdefault(pin.platform, found[0])
        elif found:
            want.setdefault(pin.platform, found[0])
    line = f"- Native SDKs: Android `ai.usesense:sdk` {want.get('android')}, iOS `UseSenseSDK` {want.get('ios')}.\n"
    p = ROOT / "CHANGELOG.md"
    text = p.read_text()
    m = re.search(r"^## \[(?P<v>[^\]]+)\][^\n]*\n", text, re.M)
    if m and m.group("v") == cur:
        if line.strip() in text[m.end(): m.end() + 4000]:
            print("CHANGELOG already records these native versions.")
            return 0
        insert = m.end()
        block = "\n### Changed\n" + line if "### Changed" not in text[m.end(): text.find("\n## [", m.end()) if text.find("\n## [", m.end()) > 0 else len(text)] else line
        if block == line:
            idx = text.index("### Changed", m.end())
            insert = text.index("\n", idx) + 1
        text = text[:insert] + block + text[insert:]
    else:
        today = datetime.date.today().isoformat()
        head = f"## [{cur}] - {today}\n\n### Changed\n{line}\n"
        insert = m.start() if m else len(text)
        text = text[:insert] + head + text[insert:]
    p.write_text(text)
    print(f"CHANGELOG: {line.strip()}")
    return 0


def main(argv: list[str]) -> int:
    cmd = argv[0] if argv else "check"
    if cmd == "check":
        return cmd_check()
    if cmd == "bump":
        return cmd_bump(argv[1:])
    if cmd == "latest":
        w = latest()
        print(f"android={w['android']}\nios={w['ios']}")
        return 0
    if cmd == "bump-patch":
        return cmd_bump_patch()
    if cmd == "wait":
        return cmd_wait(argv[1:])
    if cmd == "changelog":
        return cmd_changelog()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
