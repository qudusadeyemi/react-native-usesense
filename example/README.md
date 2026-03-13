# UseSense React Native Example

Demonstrates plugin initialization, enrollment, authentication, event listening, and error handling.

## Setup

1. Clone this repository
2. `cd example/`
3. `npm install`
4. `cd ios && pod install && cd ..`
5. Replace the API key placeholder in `src/App.tsx`
6. `npx react-native run-ios` (or `run-android`) on a physical device

## What This Demonstrates

- Plugin initialization with sandbox configuration
- Enrollment session (first-time face registration)
- Authentication session (returning user verification)
- Real-time event streaming via `addListener()`
- Error handling for all error codes
- Three-pillar score breakdown with MatchSense risk display

## Screens

### Home
- Enroll button for enrollment sessions
- Identity ID input + Authenticate button for authentication sessions
- Link to event log

### Result
- Decision badge (green = approved, red = rejected, amber = manual review)
- Presence confidence score
- Three score cards: Channel Trust (DeepSense), Liveness (LiveSense), MatchSense Risk
- Reasons list and session details

### Event Log
- Real-time scrolling event feed
- Start/stop listening controls
- Inline session launch for testing
- Timestamped entries with event type indicators
