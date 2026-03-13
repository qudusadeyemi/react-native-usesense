import 'package:flutter/material.dart';
import 'package:usesense_flutter/usesense_flutter.dart';

import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const UseSenseExampleApp());
}

class UseSenseExampleApp extends StatefulWidget {
  const UseSenseExampleApp({super.key});

  @override
  State<UseSenseExampleApp> createState() => _UseSenseExampleAppState();
}

class _UseSenseExampleAppState extends State<UseSenseExampleApp> {
  final _useSense = UseSenseFlutter();
  bool _initialized = false;
  String? _initError;

  @override
  void initState() {
    super.initState();
    _initSdk();
  }

  Future<void> _initSdk() async {
    try {
      await _useSense.initialize(
        const UseSenseConfig(
          // TODO: Replace with your sandbox API key from https://app.usesense.ai
          apiKey: 'sk_test_YOUR_SANDBOX_API_KEY',
          environment: UseSenseEnvironment.sandbox,
        ),
      );
      setState(() => _initialized = true);
    } on UseSenseError catch (e) {
      setState(() => _initError = e.message);
    }
  }

  @override
  void dispose() {
    _useSense.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'UseSense Example',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF4F46E5),
        useMaterial3: true,
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        colorSchemeSeed: const Color(0xFF4F46E5),
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      home: HomeScreen(
        useSense: _useSense,
        initialized: _initialized,
        initError: _initError,
      ),
    );
  }
}
