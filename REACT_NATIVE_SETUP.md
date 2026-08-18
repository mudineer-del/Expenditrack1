# React Native Mobile App Setup

## Prerequisites
- Node.js 18+ and npm/yarn
- Xcode 14+ (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS dependencies)

## Quick Start

### 1. Create React Native App
```bash
# Install Expo CLI (easiest option)
npm install -g expo-cli

# Create new React Native project
expo init expenditrack-mobile
cd expenditrack-mobile
```

### 2. Project Structure
```
expenditrack-mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── invoices/
│   │   ├── vendors/
│   │   └── reports/
│   └── _layout.tsx
├── components/
│   ├── ui/              # Shared from web (with mobile tweaks)
│   ├── forms/
│   └── shared/
├── hooks/               # Shared from web
├── lib/                 # Shared from web
├── store/               # Zustand stores (shared)
├── services/            # API calls (shared)
└── app.json             # Expo config
```

### 3. Install Dependencies
```bash
npm install
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install zustand react-hook-form zod
npm install @supabase/supabase-js
npm install axios
```

### 4. Setup Supabase Integration
Create `services/supabase.ts` (shared with web):
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 5. Update `app.json` for Mobile
```json
{
  "expo": {
    "name": "Expenditrack",
    "slug": "expenditrack",
    "version": "1.0.0",
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.ogdcl.expenditrack"
    },
    "android": {
      "package": "com.ogdcl.expenditrack"
    },
    "plugins": [
      "expo-camera",
      "expo-file-system",
      "expo-notifications"
    ]
  }
}
```

### 6. Bottom Tab Navigation
Create `app/(app)/_layout.tsx`:
```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Dashboard } from './dashboard'
import { Invoices } from './invoices'
import { Vendors } from './vendors'
import { Reports } from './reports'
import { Settings } from './settings'

const Tab = createBottomTabNavigator()

export function AppLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabel: { fontSize: 12 },
        tabBarActiveTintColor: '#0A86C8',
      }}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Invoices" component={Invoices} />
      <Tab.Screen name="Vendors" component={Vendors} />
      <Tab.Screen name="Reports" component={Reports} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  )
}
```

### 7. Run on Device/Simulator

**iOS:**
```bash
expo run:ios
```

**Android:**
```bash
expo run:android
```

**Web (for testing):**
```bash
expo run:web
```

## Build for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

### Both Platforms
```bash
eas build --platform all
```

## Share Code Between Web & Mobile

### Structure
```
src/
├── components/shared/   ← Both web and mobile
├── hooks/               ← Both web and mobile
├── lib/                 ← Both web and mobile
├── store/               ← Both web and mobile (Zustand)
├── services/            ← Both web and mobile (API)
└── types/               ← Both web and mobile

web/                     ← Web-specific
├── components/ui/       ← shadcn/ui components

mobile/                  ← Mobile-specific
├── components/ui/       ← React Native components
```

### Example Shared Hook
```typescript
// hooks/useInvoices.ts (used by both)
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
      if (error) throw error
      return data
    },
  })
}
```

## Features to Implement

- [x] Authentication (Supabase)
- [x] Dashboard
- [x] Invoice management
- [x] Vendor/Contracts
- [x] Reports
- [ ] Offline sync
- [ ] Push notifications
- [ ] Camera for invoice scanning
- [ ] File uploads
- [ ] Dark mode

## Testing

```bash
# Unit tests
npm run test

# E2E tests (Detox)
npm install detox-cli --global
detox build-framework-cache
detox build-framework-cache --ios
detox test
```

## Troubleshooting

**Metro bundler errors:**
```bash
npx expo start --clear
```

**Dependency issues:**
```bash
npm install && npx expo prebuild --clean
```

**Build failures:**
```bash
eas build --platform ios --clear-cache
```

## Next Steps

1. Set up EAS (Expo Application Services) account
2. Configure code signing for iOS/Android
3. Set up CI/CD pipeline
4. Submit to App Store and Google Play
