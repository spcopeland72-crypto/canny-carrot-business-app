# Canny Carrot Business Mobile App

Business management app for Canny Carrot rewards platform.

## Features

### Home Screen
- View all reward programs and campaigns
- Quick access to customer and product management
- Create new reward programs and campaigns

### Customer Management
- List all customers with search functionality
- Add new customers
- Edit existing customer details
- Manually adjust customer rewards/stamps
- Delete customers

### Reward Programs Management
- Create new reward programs
- Edit existing rewards
- Delete rewards
- Define reward types:
  - Product-based (purchases)
  - Action-based (reviews, social shares, check-ins, etc.)
- Set requirements (number of purchases/actions)
- Define reward types (free product, discount, other)
- Select products from product list
- Select actions (write review, share on socials, check in, follow, post mentioning business)

### Campaigns Management
- List all active campaigns
- Create new campaigns
- Edit existing campaigns
- Set campaign duration (start and end dates from calendar)
- Same workflow as rewards but with time-based duration

### Business Profile
- Edit all business details
- Upload business logo
- Upload 2 additional files (flyers, menus, etc.) with thumbnails

## Navigation

Bottom Navigation:
- Home
- Business (Profile)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on device/emulator:
```bash
npm run android
# or
npm run ios
```

## Project Structure

```
src/
  components/
    HomeScreen.tsx
    CustomersPage.tsx
    AddEditCustomerPage.tsx
    RewardsManagementPage.tsx
    CreateEditRewardPage.tsx
    CampaignsPage.tsx
    BusinessProfilePage.tsx
    BottomNavigation.tsx
    PageTemplate.tsx
  constants/
    Colors.ts
```

## Communication

The business app communicates with:
- Customer Mobile App (for reward/campaign data)
- Administrator App (for business management and content updates)





