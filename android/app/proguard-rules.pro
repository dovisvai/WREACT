# R8 configuration for WREACT.
#
# MASVS-RESILIENCE-1 (obfuscation) and -3 (no debug artefacts in release).
#
# A caveat worth stating up front so nobody over-trusts this file: WREACT is a
# Capacitor app. Every line of game logic, scoring and anti-cheat lives in
# assets/public/*.js and R8 never touches it — anyone can `unzip` the APK and
# read the whole game in plain JavaScript. What R8 protects here is the thin
# Java shell (the Activity, the plugin bridge) and the third-party SDKs, which
# is worth doing but is not what stops cheating. Server-side validation is.
#
# Keep crash reports readable. Without these three, every Play Console stack
# trace is obfuscated noise; with them, upload the mapping.txt that
# `bundleRelease` writes to app/build/outputs/mapping/release/ and Console
# deobfuscates automatically.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# --------------------------------------------------------------------------
# Capacitor
#
# Capacitor resolves plugins by fully-qualified class name, read as a *string*
# from assets/capacitor.plugins.json at runtime. R8 cannot see those references,
# so without a keep rule it renames the classes and every plugin call fails with
# ClassNotFoundException — at runtime, on a release build, which is exactly the
# failure mode that is invisible until users hit it.
#
# @capacitor/android ships consumer rules covering most of this; these are
# explicit so the guarantee does not depend on a transitive dependency's config.
# --------------------------------------------------------------------------
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep class com.wreact.app.** { *; }

# --------------------------------------------------------------------------
# Cordova bridge — OneSignal ships as a Cordova plugin, and res/xml/config.xml
# names com.onesignal.cordova.OneSignalPush as a string. Same reflection
# problem as above.
# --------------------------------------------------------------------------
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin { *; }
-keep class com.onesignal.** { *; }
-dontwarn com.onesignal.**

# --------------------------------------------------------------------------
# RevenueCat and Play Billing. Purchase objects are deserialised reflectively,
# and a renamed field silently breaks entitlement mapping rather than throwing.
# --------------------------------------------------------------------------
-keep class com.revenuecat.purchases.** { *; }
-keep class com.android.billingclient.api.** { *; }
-dontwarn com.revenuecat.purchases.**

# Firebase Cloud Messaging arrives through OneSignal.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# --------------------------------------------------------------------------
# Anything reachable from JavaScript through an @JavascriptInterface must keep
# its method names, or the WebView cannot call it.
# --------------------------------------------------------------------------
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Enum valueOf/values are used reflectively by several of the SDKs above.
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Parcelables keep their CREATOR field or unmarshalling fails.
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# --------------------------------------------------------------------------
# Strip logging from release.
#
# MASVS-STORAGE-3: log output is readable by anyone with adb, and on older
# devices by other apps. These calls are removed entirely rather than silenced,
# so the strings they would have formatted are dropped from the binary too.
#
# assumenosideeffects is safe here only because none of these calls do work that
# matters — do not extend this list to methods whose return value is used.
# --------------------------------------------------------------------------
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
    public static int wtf(...);
}
