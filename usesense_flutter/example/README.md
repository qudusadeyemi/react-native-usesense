# UseSense Flutter Example

Demonstrates plugin initialization, enrollment, authentication, event listening,
and error handling.

## Setup

1. Clone this repository
2. `cd usesense_flutter/example`
3. `flutter pub get`
4. Replace the API key placeholder in `lib/main.dart` with your sandbox key from
   [app.usesense.ai](https://app.usesense.ai)
5. `flutter run` on a physical device (camera required)

## What This Demonstrates

- SDK initialization with sandbox configuration
- Enrollment session (first-time face registration)
- Authentication session (returning user verification with identity ID)
- Real-time event streaming via `UseSenseFlutter.onEvent`
- Error handling with retry guidance for all error codes
- Result display with decision badge and session details
- Security reminder that SDK results are for UI feedback only
