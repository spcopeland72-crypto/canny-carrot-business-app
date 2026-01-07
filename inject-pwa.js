const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

// 1. Inject PWA meta tags into Expo's generated index.html
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Find the <head> tag and inject PWA meta tags right after it
  // iOS requires specific icon sizes and splash screens
  const pwaMetaTags = `
  <meta name="theme-color" content="#2D5A27" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="CC Business" />
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="manifest" href="/manifest.json" />
  <!-- Standard icons -->
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
  <!-- iOS Apple Touch Icons - multiple sizes for different devices -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
  <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png" />
  <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167.png" />
  <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120.png" />
  <!-- iOS Splash Screens for different device sizes -->
  <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/splash-iphone-14-pro-max.png" />
  <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/splash-iphone-14-pro.png" />
  <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" href="/splash-iphone-13-pro-max.png" />
  <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/splash-iphone-13-pro.png" />
  <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/splash-iphone-x.png" />`;
  
  html = html.replace('<head>', `<head>${pwaMetaTags}`);
  
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✅ Injected PWA meta tags into index.html');
} else {
  console.warn('⚠️  index.html not found in dist/');
}

// 2. Copy manifest.json
const manifestSrc = path.join(publicDir, 'manifest.json');
const manifestDst = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDst);
  console.log('✅ Copied manifest.json');
} else {
  console.warn('⚠️  manifest.json not found in public/');
}

// 3. Copy logo files from assets to dist as PWA icons
const assetsDir = path.join(__dirname, 'assets');
const logoFile = 'canny-carrot-logo.png'; // Business app specific logo
const logoSrc = path.join(assetsDir, logoFile);

// Verify we're using the correct business app logo (not customer app logo)
if (!fs.existsSync(logoSrc)) {
  console.error(`❌ ERROR: Business app logo file not found: ${logoSrc}`);
  console.error(`   Expected: canny-carrot-logo.png`);
  console.error(`   This should be different from customer app logo (cropped-cc-app-logo.png)`);
  process.exit(1);
}
console.log(`✅ Using business app logo: ${logoFile}`);

if (fs.existsSync(logoSrc)) {
  // Copy as standard PWA icons (192 and 512)
  const icon192Dst = path.join(distDir, 'icon-192.png');
  const icon512Dst = path.join(distDir, 'icon-512.png');
  fs.copyFileSync(logoSrc, icon192Dst);
  fs.copyFileSync(logoSrc, icon512Dst);
  console.log(`✅ Copied ${logoFile} as icon-192.png and icon-512.png`);
  
  // Copy as iOS Apple Touch Icons (specific sizes iOS expects)
  // iOS will use the closest size, so we copy the logo for all sizes
  const iosSizes = [
    { size: 180, name: 'apple-touch-icon-180.png' }, // iPhone standard
    { size: 152, name: 'apple-touch-icon-152.png' }, // iPad
    { size: 167, name: 'apple-touch-icon-167.png' }, // iPad Pro
    { size: 120, name: 'apple-touch-icon-120.png' }  // iPhone (older)
  ];
  
  iosSizes.forEach(({ size, name }) => {
    const iosIconDst = path.join(distDir, name);
    fs.copyFileSync(logoSrc, iosIconDst);
    console.log(`✅ Copied ${logoFile} as ${name} (iOS ${size}x${size})`);
  });
  
  // Create splash screens (iOS startup images)
  // For now, use the logo as splash - ideally should be full-screen with logo centered
  const splashSizes = [
    { name: 'splash-iphone-14-pro-max.png', width: 1290, height: 2796 }, // iPhone 14 Pro Max
    { name: 'splash-iphone-14-pro.png', width: 1179, height: 2556 },     // iPhone 14 Pro
    { name: 'splash-iphone-13-pro-max.png', width: 1284, height: 2778 }, // iPhone 13 Pro Max
    { name: 'splash-iphone-13-pro.png', width: 1170, height: 2532 },     // iPhone 13 Pro
    { name: 'splash-iphone-x.png', width: 1125, height: 2436 }            // iPhone X/11/12
  ];
  
  splashSizes.forEach(({ name }) => {
    const splashDst = path.join(distDir, name);
    // Use logo as splash for now (browser will scale)
    fs.copyFileSync(logoSrc, splashDst);
    console.log(`✅ Created ${name} (splash screen)`);
  });
} else {
  console.warn(`⚠️  ${logoFile} not found in assets/`);
}

console.log('✅ PWA injection complete');

