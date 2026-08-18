# App Store Assets Checklist

Complete guide for all images, graphics, and files needed for app store submission.

## 📦 Required Assets

### 1. App Icon

| Property | Specification |
|----------|---------------|
| **Format** | PNG |
| **Dimensions** | 512×512 px (for both stores) |
| **Color Space** | RGB or RGBA |
| **Transparency** | No transparent background |
| **Rounded Corners** | None (stores will add) |
| **Safe Area** | Keep content within 450×450 px center |

**Create Icon:**
```
Options:
1. Use Figma template
2. Hire designer ($50-200)
3. Use icon generator:
   - https://icon.kitchen/
   - https://appicon.co/
   - https://www.favicon-generator.org/

Requirements:
- Must be unique & recognizable
- Works at small sizes
- Scalable to all resolutions
```

### 2. App Screenshots

#### iOS App Store Screenshots

**Required Dimensions:**
- iPhone 6.5": 1242×2208 px (2x)
- iPhone 5.5": 1125×2436 px (2x)
- iPad Pro 12.9": 2048×2732 px (optional)

**Minimum Requirements:**
- 2 screenshots per device type
- Maximum 10 screenshots per language
- Landscape orientation optional

**What to Show:**
1. **Screen 1** - Dashboard/Overview
   - Show main metrics
   - Highlight key features
   - Add text: "Track all expenses"

2. **Screen 2** - Invoice Management
   - Show invoice list
   - Demonstrate filtering
   - Add text: "Manage invoices easily"

3. **Screen 3** - Reports
   - Show analytics/charts
   - Highlight insights
   - Add text: "Get detailed insights"

4. **Screen 4** - Mobile Features
   - Show offline support
   - Demonstrate sync
   - Add text: "Works offline"

5. **Screen 5** - Call to Action
   - Show app logo
   - Add text: "Download now"

**Pro Tips:**
- Use device frames (not screenshots)
- Add text overlays explaining features
- Use consistent fonts & colors
- Keep text readable at small sizes
- Show actual app UI, not mockups

#### Android Google Play Screenshots

**Required Dimensions:**
- Phone: 1080×1920 px or 1440×2560 px
- Tablet: 1200×1920 px (optional)
- Portrait orientation

**Requirements:**
- Minimum 2, maximum 8 screenshots
- Same content as iOS but Android-specific UI

### 3. Feature Graphic (Android Only)

| Property | Specification |
|----------|---------------|
| **Format** | PNG or JPG |
| **Dimensions** | 1024×500 px |
| **Purpose** | Featured on Play Store home |
| **Content** | App logo + key feature text |

**Create Feature Graphic:**
```
Layout:
┌─────────────────────────────────┐
│                                 │
│   Logo (left)  Text (right)     │
│                                 │
│   [APP ICON]   Expenditrack     │
│                Invoice Tracker  │
│                                 │
└─────────────────────────────────┘

Best Practices:
- High contrast
- Readable at small sizes
- Include app name
- Show key feature
- Professional design
```

### 4. Preview Video (Optional but Recommended)

**Specifications:**
- Length: 15-30 seconds
- Format: MP4 or MOV
- Resolution: 1080p minimum
- Platform: YouTube (link to video)

**Content Suggestions:**
1. App opening animation
2. Dashboard walkthrough
3. Create invoice demo
4. Report generation
5. Call to action

---

## 📱 Graphics Files Needed

### iOS App Store

```
expenditrack-ios/
├── Icon.png (512×512)
├── Screenshots/
│   ├── iPhone 6.5/
│   │   ├── screen-1.png (1242×2208)
│   │   ├── screen-2.png (1242×2208)
│   │   └── screen-3.png (1242×2208)
│   └── iPhone 5.5/
│       ├── screen-1.png (1125×2436)
│       ├── screen-2.png (1125×2436)
│       └── screen-3.png (1125×2436)
└── AppPreview.mp4 (optional)
```

### Android Google Play

```
expenditrack-android/
├── Icon.png (512×512)
├── FeatureGraphic.png (1024×500)
├── Screenshots/
│   ├── screen-1.png (1080×1920)
│   ├── screen-2.png (1080×1920)
│   ├── screen-3.png (1080×1920)
│   └── screen-4.png (1080×1920)
└── Preview.mp4 (YouTube link)
```

---

## 🎨 Design Resources

### Free Tools

| Tool | Purpose | Link |
|------|---------|------|
| **Figma** | Design screenshots | https://figma.com |
| **Canva** | Create graphics | https://canva.com |
| **Adobe Express** | Quick designs | https://express.adobe.com |
| **Screenshot Tools** | Capture app | Native app tools |
| **Icon Kitchen** | Generate icons | https://icon.kitchen |

### Design Templates

**Figma Templates:**
- iOS App Store screenshots
- Google Play assets
- App icon templates

**Download:**
1. Create free Figma account
2. Search "App Store Assets"
3. Duplicate template
4. Customize with your app

### Hiring a Designer

**Cost:** $300-1000
**Timeline:** 5-10 days

**Find Designers:**
- Fiverr: https://fiverr.com/search/gigs?query=app+store+graphics
- Upwork: https://upwork.com/
- 99designs: https://99designs.com/

**Brief Template:**
```
Looking for someone to create:
- 1x App icon (512×512)
- 5x iOS screenshots (1242×2208)
- 5x Android screenshots (1080×1920)
- 1x Feature graphic (1024×500)

Style: Professional, modern, business-focused
Apps: Dashboard, invoicing, analytics

Budget: $300-500
Timeline: 5 days
```

---

## 📝 Text Assets Needed

### App Description (for both stores)

**Short Description (80 characters max):**
```
Enterprise invoice and expense tracker for businesses
```

**Full Description (4000 characters max):**
```
Expenditrack is a comprehensive enterprise application 
designed to simplify invoice and expense management. 

Perfect for organizations managing multiple departments 
and vendors.

Key Features:
✓ Real-time invoice tracking
✓ Expense categorization
✓ Multi-department support
✓ Financial reports and analytics
✓ Vendor contract management
✓ Offline support
✓ Cloud synchronization
✓ Push notifications
✓ Role-based access control

Works seamlessly across web, mobile, and desktop.
Enterprise-grade security with automatic synchronization.

Download free today!
```

### Keywords (iOS - 100 characters total)

```
invoice, expense, tracker, business, accounting, 
reporting, finance, management, invoicing, budget
```

### Categories

**iOS:**
- Primary: Business
- Secondary: Finance

**Android:**
- Primary: Business

---

## ✅ Checklist for Submission

### Pre-Submission Checklist

- [ ] App icon created (512×512)
- [ ] At least 2 screenshots per device
- [ ] Screenshots are clear and professional
- [ ] All text is readable
- [ ] Feature graphic created (Android)
- [ ] App description written
- [ ] Keywords selected
- [ ] Privacy policy created
- [ ] Support email set up
- [ ] Demo account credentials ready
- [ ] App tested on devices
- [ ] No crashes or major bugs
- [ ] Permissions justified
- [ ] Screenshots match current app UI

### Asset Organization

```
Create folder: expenditrack-store-assets/
├── iOS/
│   ├── icon-512x512.png
│   ├── screenshots-6.5/
│   │   ├── 1-dashboard.png
│   │   ├── 2-invoices.png
│   │   └── 3-reports.png
│   └── screenshots-5.5/
│       ├── 1-dashboard.png
│       ├── 2-invoices.png
│       └── 3-reports.png
├── Android/
│   ├── icon-512x512.png
│   ├── feature-graphic-1024x500.png
│   ├── screenshots/
│   │   ├── 1-dashboard.png
│   │   ├── 2-invoices.png
│   │   ├── 3-reports.png
│   │   └── 4-features.png
│   └── preview.mp4
├── Texts/
│   ├── short-description.txt
│   ├── full-description.txt
│   └── keywords.txt
└── Credentials/
    ├── demo-account.txt
    └── support-email.txt
```

---

## 🎬 Creating Screenshots

### Manual Screenshot Process

**iOS:**
```bash
# Simulator screenshots
xcrun simctl io booted screenshot <filename>

# Or use Xcode:
# Product → Scheme → Edit Scheme
# Set app to simulator
# Product → Build
# Product → Run
# Then: Command + S (Simulator) → Save
```

**Android:**
```bash
# Device/emulator screenshots
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png

# Or Android Studio:
# View → Tool Windows → Logcat
# Right-click → Take Screenshot
```

### Design Tool Method (Recommended)

**Using Figma:**
1. Create new 1242×2208 px artboard (iOS)
2. Import screenshot of your app
3. Add text overlays
4. Add background color
5. Export as PNG

**Using Canva:**
1. Create custom size (1242×2208)
2. Add screenshot
3. Add text (use brand colors)
4. Add icons/graphics
5. Download as PNG

---

## 📸 Screenshot Best Practices

✅ **Do:**
- Use actual app screenshots
- Add clear, readable text
- Keep text to 2-3 lines max
- Use consistent typography
- Show real data/features
- Use consistent color scheme
- Leave breathing room
- Test readability

❌ **Don't:**
- Use low-quality images
- Overload with text
- Use small, unreadable fonts
- Show placeholder content
- Use inconsistent styles
- Cover important UI
- Use watermarks
- Include personal info

---

## 🚀 Ready to Submit?

**Final Check:**
1. ✅ All assets created
2. ✅ Files organized
3. ✅ Text proofread
4. ✅ Screenshots finalized
5. ✅ Credentials ready
6. ✅ Accounts set up
7. ✅ App built & tested

**Next Step:** Follow APP_STORE_SUBMISSION_GUIDE.md

---

**Questions about assets?** See the submission guide for step-by-step instructions!
