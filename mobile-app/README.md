# UsStory Android app

This folder contains the Android-only Capacitor project. The Next.js website remains at the repository root. The APK opens the deployed UsStory website, so login, products, favorites, customizer, and checkout use the existing backend.

## Configure the website

Set `CAPACITOR_SERVER_URL` to the deployed HTTPS address. Copy `.env.example` to `.env` in this folder, or set the variable in your shell. The Capacitor config also reads `APP_URL` from the repository root `.env` when no mobile URL is set.

For Android emulator development, `http://10.0.2.2:3000` points to the web server on the development computer. For a physical phone, use a deployed HTTPS address reachable from the phone.

## Google sign-in setup

Create both OAuth clients in the same Google Cloud project as the website's existing `AUTH_GOOGLE_ID`:

1. Keep the **Web application** OAuth client ID in the website's `AUTH_GOOGLE_ID` setting. The Android app uses this ID as the expected ID-token audience; do not use the Android client ID here. Keep `AUTH_GOOGLE_SECRET` on the server only.
2. Add the website callback URL `https://<your-site-host>/api/auth/callback/google` to the Web client’s **Authorized redirect URIs**.
3. Create an **Android** OAuth client with package name `com.usstory.mobile` and the SHA-1 certificate fingerprint for each installed build. Get the local debug fingerprint with `cd android` and `./gradlew signingReport` (Windows: `gradlew.bat signingReport`). For Play Store builds, also register the Play App Signing SHA-1 from Play Console → App integrity.
4. If the consent screen is in **Testing**, add each tester account under **Audience → Test users**.

The login button uses Google Credential Manager in Android and sends its ID token to the website, which verifies Google's signature, issuer, expiry and the Web client audience before creating the existing app session. Google Cloud can take a while to apply OAuth client changes.

## Build an installable APK

Requirements: Node.js 22+, Android Studio with Android SDK, and Java provided by Android Studio.

```bash
npm install
npx cap add android
npm run assets
npm run apk:debug
```

The debug APK is created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Copy that APK to the Android phone and open it to install. Android may ask to allow installation from that file source. The APK needs internet access and the configured website must remain deployed for the app's features to work.

Open the native project in Android Studio with `npm run open:android`. The icon and splash-screen source files are in `assets/`; regenerate Android assets with `npm run assets`.

## Notes

- This project generates Android APKs only; it contains no iOS target.
- The website and database are still hosted by the existing Next.js deployment.
- `app-debug.apk` is for direct installation and development. A public release APK should be signed with the app owner's release keystore.
- App identifier: `com.usstory.mobile`.
