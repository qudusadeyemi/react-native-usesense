const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const packageLock = require(path.join(root, 'package-lock.json'));
const packDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'usesense-pack-'));

try {
  assert.equal(packageLock.version, packageJson.version, 'package-lock.json version must match package.json');
  assert.equal(
    packageLock.packages[''].version,
    packageJson.version,
    "package-lock.json root package version must match package.json"
  );

  execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', packDirectory], {
    cwd: root,
    stdio: 'pipe',
  });
  const tarballs = fs.readdirSync(packDirectory).filter((file) => file.endsWith('.tgz'));
  assert.equal(tarballs.length, 1, 'npm pack must produce exactly one tarball');
  const filename = tarballs[0];
  const tarball = path.join(packDirectory, filename);
  const entries = execFileSync('tar', ['-tf', tarball], { encoding: 'utf8' }).trim().split('\n');
  const readPackedFile = (file) =>
    execFileSync('tar', ['-xOf', tarball, `package/${file}`], { encoding: 'utf8' });

  for (const required of [
    'package/package.json',
    'package/android/build.gradle',
    'package/react-native-usesense.podspec',
    'package/lib/commonjs/index.js',
    'package/lib/module/index.js',
    'package/lib/typescript/src/index.d.ts',
  ]) {
    assert(entries.includes(required), `packed artifact is missing ${required}`);
  }
  assert(!entries.some((entry) => entry.includes('/build/')), 'packed artifact must exclude native build output');
  assert(!entries.some((entry) => /(__tests__|\.test\.)/.test(entry)), 'packed artifact must exclude tests');

  const packedPackage = JSON.parse(readPackedFile('package.json'));
  assert.equal(packedPackage.version, packageJson.version, 'packed package version must match source');
  assert.match(
    readPackedFile('android/build.gradle'),
    /implementation\s+["']ai\.usesense:sdk:4\.7\.1["']/,
    'packed Android bridge must resolve ai.usesense:sdk:4.7.1 exactly'
  );
  assert.match(
    readPackedFile('react-native-usesense.podspec'),
    /s\.dependency\s+["']UseSenseSDK["'],\s*["']~> 4\.7\.1["']/,
    'packed iOS bridge must require UseSenseSDK ~> 4.7.1 exactly'
  );

  console.log(
    `Verified ${filename}: Android 4.7.1 and iOS ~> 4.7.1 contracts are packaged.`
  );
} finally {
  fs.rmSync(packDirectory, { recursive: true, force: true });
}
