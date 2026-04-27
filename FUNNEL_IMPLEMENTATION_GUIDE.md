# Pehchaan App - Funnel Tracking Implementation Guide

## 🎯 Key User Funnels to Track

Based on the Pehchaan app structure, here are the critical funnels that will provide valuable insights:

### 1. **Onboarding Funnel** 
`app_launch → language_selection → onboarding_complete → registration_start → registration_complete`

### 2. **Aadhaar Update Funnel**
`home_screen → update_service → document_upload → payment_initiated → payment_success → update_submitted`

### 3. **Payment Funnel** 
`payment_screen → payment_method_selected → payment_initiated → payment_success`

### 4. **QR Code Scan Funnel**
`scan_initiated → qr_detected → qr_processed → verification_complete`

### 5. **eKYC Download Funnel**
`ekyc_request → authentication → download_initiated → download_complete`

---

## 📱 Implementation Code

### Step 1: Add Funnel Tracking to Application Class

Add this to `PehchaanApplication.kt` after DroidPulse initialization:

```kotlin
// Add this import
import com.yourcompany.optimizer.core.DroidPulse

// Add this method after initializeDroidPulse()
private fun setupFunnelTracking() {
    // Initialize user session for funnel tracking
    val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
    DroidPulse.identify(deviceId, mapOf(
        "app_version" to BuildConfig.VERSION_NAME,
        "device_model" to "${Build.MANUFACTURER} ${Build.MODEL}",
        "os_version" to "Android ${Build.VERSION.RELEASE}"
    ))
}

// Call it in onCreate() after initializeDroidPulse()
if (BuildConfig.DEBUG) {
    initializeDroidPulse()
    setupFunnelTracking()
}
```

### Step 2: Onboarding Funnel

**File:** `app/src/main/java/in/gov/uidai/pehchaan/onboarding/SplashActivity.kt`

Add after `super.onCreate(savedInstanceState)`:

```kotlin
// Import
import com.yourcompany.optimizer.core.DroidPulse

// In onCreate()
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Track app launch
    DroidPulse.funnel("app_launched", "onboarding_flow")
    
    // ... existing code
}
```

**File:** `app/src/main/java/in/gov/uidai/pehchaan/language/LanguageSelectionActivity.kt`

Add when language is selected:

```kotlin
// When user selects language (in the selection handler)
DroidPulse.funnel("language_selected", "onboarding_flow", mapOf(
    "selected_language" to selectedLanguage
))
```

**File:** `app/src/main/java/in/gov/uidai/pehchaan/onboarding/OnboardingActivity.kt`

Add in the navigation handlers:

```kotlin
// Import
import com.yourcompany.optimizer.core.DroidPulse

// In onCreate() after setContent
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Track onboarding screen view
    DroidPulse.funnel("onboarding_viewed", "onboarding_flow")
    
    // ... existing setContent code with these additions:
    
    OnboardingScreen(
        selectedLanguage = lang,
        onSkip = {
            DroidPulse.funnel("onboarding_skipped", "onboarding_flow")
            registrationResultLauncher.launch(
                Intent(this, RegistrationActivity::class.java)
            )
        },
        navigateToRegistration = {
            DroidPulse.funnel("onboarding_completed", "onboarding_flow")
            val bundle = Bundle().apply {
                putBoolean("firsttime", true)
            }
            val intent = Intent(this, RegistrationActivity::class.java).apply {
                putExtras(bundle)
            }
            registrationResultLauncher.launch(intent)
        },
        // ... rest of existing code
    )
}
```

### Step 3: Payment Funnel

**File:** `app/src/main/java/in/gov/uidai/pehchaan/home/PaymentActivity.kt`

Add these tracking calls:

```kotlin
// Import
import com.yourcompany.optimizer.core.DroidPulse

class PaymentActivity : ComponentActivity(), PaymentResultWithDataListener {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Track payment screen view
        DroidPulse.funnel("payment_screen_viewed", "payment_flow", mapOf(
            "amount" to amountInRupees,
            "service_type" to updateType
        ))
        
        // ... existing code
    }
    
    // Add when payment method is selected (in your payment method selection logic)
    private fun onPaymentMethodSelected(method: String) {
        DroidPulse.funnel("payment_method_selected", "payment_flow", mapOf(
            "payment_method" to method,
            "amount" to amountInRupees
        ))
    }
    
    // Add when payment is initiated
    private fun initiatePayment() {
        DroidPulse.funnel("payment_initiated", "payment_flow", mapOf(
            "amount" to amountInRupees,
            "payment_gateway" to "razorpay" // or "payu" based on selection
        ))
        // ... existing payment initiation code
    }
    
    // In payment success callback
    override fun onPaymentSuccess(razorpayPaymentId: String?, paymentData: PaymentData?) {
        DroidPulse.funnel("payment_success", "payment_flow", mapOf(
            "payment_id" to (razorpayPaymentId ?: "unknown"),
            "amount" to amountInRupees
        ))
        
        // Track revenue
        DroidPulse.revenue(amountInRupees, "INR", "aadhaar_update_payment")
        
        // ... existing success handling
    }
    
    // In payment failure callback
    override fun onPaymentError(errorCode: Int, response: String?, paymentData: PaymentData?) {
        DroidPulse.funnel("payment_failed", "payment_flow", mapOf(
            "error_code" to errorCode,
            "error_message" to (response ?: "unknown"),
            "amount" to amountInRupees
        ))
        
        // ... existing error handling
    }
}
```

### Step 4: Aadhaar Update Funnel

**File:** `app/src/main/java/in/gov/uidai/pehchaan/home/MainActivity.kt`

Add when user selects update service:

```kotlin
// Import
import com.yourcompany.optimizer.core.DroidPulse

// In your service selection handler (wherever user chooses update type)
private fun onUpdateServiceSelected(serviceType: String) {
    DroidPulse.funnel("update_service_selected", "aadhaar_update_flow", mapOf(
        "service_type" to serviceType
    ))
}
```

**File:** `app/src/main/java/in/gov/uidai/pehchaan/home/AadhaarDetailsUpdateActivity.kt`

Add document upload tracking:

```kotlin
// Import
import com.yourcompany.optimizer.core.DroidPulse

// When document upload starts
private fun onDocumentUploadStart() {
    DroidPulse.funnel("document_upload_started", "aadhaar_update_flow")
}

// When document upload completes
private fun onDocumentUploadComplete(success: Boolean) {
    if (success) {
        DroidPulse.funnel("document_upload_completed", "aadhaar_update_flow")
    } else {
        DroidPulse.funnel("document_upload_failed", "aadhaar_update_flow")
    }
}
```

### Step 5: QR Code Scan Funnel

**File:** `app/src/main/java/in/gov/uidai/pehchaan/ScanCodeActivity.kt`

Add QR scanning tracking:

```kotlin
// Import
import com.yourcompany.optimizer.core.DroidPulse

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Track scan initiation
    DroidPulse.funnel("qr_scan_initiated", "qr_scan_flow")
    
    // ... existing code
}

// In your QR detection callback
private fun onQRDetected(qrData: String) {
    DroidPulse.funnel("qr_detected", "qr_scan_flow", mapOf(
        "qr_type" to getQRType(qrData)
    ))
}

// When QR processing completes
private fun onQRProcessed(success: Boolean) {
    if (success) {
        DroidPulse.funnel("qr_processed_success", "qr_scan_flow")
    } else {
        DroidPulse.funnel("qr_processed_failed", "qr_scan_flow")
    }
}
```

### Step 6: eKYC Download Funnel

**File:** `app/src/main/java/in/gov/uidai/pehchaan/home/DownloadEKycActivity.kt`

Add eKYC download tracking:

```kotlin
// Import
import com.yourcompany.optimizer.core.DroidPulse

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Track eKYC request initiation
    DroidPulse.funnel("ekyc_request_initiated", "ekyc_download_flow")
    
    // ... existing code
}

// When authentication starts
private fun onAuthenticationStart() {
    DroidPulse.funnel("ekyc_authentication_started", "ekyc_download_flow")
}

// When authentication completes
private fun onAuthenticationComplete(success: Boolean) {
    if (success) {
        DroidPulse.funnel("ekyc_authentication_success", "ekyc_download_flow")
    } else {
        DroidPulse.funnel("ekyc_authentication_failed", "ekyc_download_flow")
    }
}

// When download starts
private fun onDownloadStart() {
    DroidPulse.funnel("ekyc_download_started", "ekyc_download_flow")
}

// When download completes
private fun onDownloadComplete(success: Boolean) {
    if (success) {
        DroidPulse.funnel("ekyc_download_completed", "ekyc_download_flow")
    } else {
        DroidPulse.funnel("ekyc_download_failed", "ekyc_download_flow")
    }
}
```

---

## 📊 Dashboard Funnel Analysis

Once implemented, you'll see these funnels in the DroidPulse dashboard:

### Analytics Tab → Funnel Analysis
- **Onboarding Conversion:** `app_launch` → `registration_complete`
- **Payment Success Rate:** `payment_initiated` → `payment_success`
- **Update Completion Rate:** `update_service_selected` → `update_submitted`
- **QR Scan Success Rate:** `qr_scan_initiated` → `qr_processed_success`
- **eKYC Success Rate:** `ekyc_request_initiated` → `ekyc_download_completed`

### Key Metrics You'll Get
- **Drop-off points:** Where users abandon each flow
- **Performance correlation:** How API latency affects conversion
- **Device impact:** Which devices have better conversion rates
- **Time-based analysis:** Conversion rates by hour/day
- **Version comparison:** How app updates affect funnels

---

## 🚀 Implementation Priority

### Week 1 (High Impact)
1. **Payment Funnel** — Critical for revenue tracking
2. **Onboarding Funnel** — User acquisition insights

### Week 2 (Medium Impact)  
3. **Aadhaar Update Funnel** — Core service completion
4. **QR Scan Funnel** — Feature usage tracking

### Week 3 (Nice to Have)
5. **eKYC Download Funnel** — Service completion tracking

---

## 🧪 Testing Your Implementation

1. **Run the app** with these changes
2. **Go through each flow** (onboarding, payment, etc.)
3. **Check the dashboard** at http://localhost:3002
4. **Navigate to Analytics tab** → Funnel section
5. **Verify events** are appearing in real-time

The funnel data will show up immediately in the dashboard, and you'll start seeing conversion rates, drop-off points, and performance correlations right away.

---

## 💡 Pro Tips

1. **Use consistent funnel names** across related flows
2. **Add relevant properties** to understand drop-off reasons
3. **Track both success and failure** steps for complete visibility
4. **Correlate with performance data** to identify technical issues affecting conversion
5. **Set up alerts** for significant conversion rate drops

This implementation will give you deep insights into user behavior and help optimize the Pehchaan app's critical flows!