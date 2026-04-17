# Synapse AI - Android Native Code Guide

Since this preview environment only generates Web Applications, I have prepared the exact native Android (Kotlin) code you need to convert this Web App into a real Android App that can draw over other apps and write to them using AccessibilityServices.

## Step 1: Create the Android Project
1. Open Android Studio.
2. Select **New Project** > **Empty Activity**.
3. Name it "Synapse AI", Language: **Kotlin**.

## Step 2: Implement WebView (Optional but recommended)
To keep the beautiful UI we just built, you can export this React code, build it (`npm run build`), and place the contents of the `/dist/` folder inside your Android project's `app/src/main/assets/www/` folder. Load it inside a standard Android WebView.

## Step 3: Implement The Core Native Files

### 1. `AndroidManifest.xml`
You must request the correct permissions so Android allows you to float a window (`SYSTEM_ALERT_WINDOW`) and type into other apps (`BIND_ACCESSIBILITY_SERVICE`).

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.synapse.ai">

    <!-- Permissions Required -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Synapse AI"
        android:theme="@style/Theme.SynapseAI">
        
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Floating Overlay Service -->
        <service android:name=".FloatingWidgetService" />

        <!-- Accessibility Service for code injection -->
        <service
            android:name=".SynapseAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>
    </application>
</manifest>
```

### 2. `res/xml/accessibility_service_config.xml`
Create `res/xml/` if it doesn't exist. This configuring the accessibility service to observe text fields globally.
```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeViewFocused|typeViewClicked"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_desc" />
```

### 3. `SynapseAccessibilityService.kt`
This is where the magic happens. It accesses the currently focused text box (in Dcoder, HopWeb, etc) and pastes the generated code.

```kotlin
package com.synapse.ai

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.content.Intent

class SynapseAccessibilityService : AccessibilityService() {

    companion object {
        var instance: SynapseAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    // Function to inject generating code
    fun injectCode(code: String) {
        val rootNode = rootInActiveWindow ?: return
        val focusNode = rootNode.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)

        if (focusNode != null && focusNode.isEditable) {
            val args = Bundle()
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, code)
            focusNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) { }
    
    override fun onInterrupt() { }
    
    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        return super.onUnbind(intent)
    }
}
```

### 4. `FloatingWidgetService.kt`
This service creates the actual 2x2 widget that hovers over all other apps.

```kotlin
package com.synapse.ai

import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText

class FloatingWidgetService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var floatingView: View

    override fun onCreate() {
        super.onCreate()
        
        floatingView = LayoutInflater.from(this).inflate(R.layout.layout_floating_widget, null)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.TOP or Gravity.START
        params.x = 0
        params.y = 100

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        windowManager.addView(floatingView, params)

        // Find views and set listeners
        val btnInject = floatingView.findViewById<Button>(R.id.btn_inject)
        val etPrompt = floatingView.findViewById<EditText>(R.id.et_prompt)

        btnInject.setOnClickListener {
            // Get prompt from edit text
            val prompt = etPrompt.text.toString()
            
            // NOTE: Here you would call your API (OpenAI/Gemini) to get the code string.
            val generatedCode = "// Simulated Code generated from: $prompt"

            // Call the Accessibility Service to inject!
            SynapseAccessibilityService.instance?.injectCode(generatedCode)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::floatingView.isInitialized) {
            windowManager.removeView(floatingView)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
```
