const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

// 1. Inject PWA meta tags into Expo's generated index.html
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Find the <head> tag and inject PWA meta tags right after it
  const pwaMetaTags = `
  <meta name="theme-color" content="#2D5A27" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="CC Business" />
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" type="image/png" href="/icon-192.png" />
  <link rel="apple-touch-icon" href="/icon-192.png" />`;
  
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
const logoFile = 'canny-carrot-logo.png';
const logoSrc = path.join(assetsDir, logoFile);

if (fs.existsSync(logoSrc)) {
  // Copy as both 192 and 512 (browser will scale as needed)
  const icon192Dst = path.join(distDir, 'icon-192.png');
  const icon512Dst = path.join(distDir, 'icon-512.png');
  fs.copyFileSync(logoSrc, icon192Dst);
  fs.copyFileSync(logoSrc, icon512Dst);
  console.log(`✅ Copied ${logoFile} as icon-192.png and icon-512.png`);
} else {
  console.warn(`⚠️  ${logoFile} not found in assets/`);
}

console.log('✅ PWA injection complete');

