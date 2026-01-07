const fs = require('fs');
const path = require('path');

// Simple SVG icon template
function createSVGIcon(size, bgColor, text) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}"/>
  <text x="50%" y="50%" font-size="${size * 0.35}" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold">CCB</text>
</svg>`;
}

// Create icons
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Business app icons (green)
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), createSVGIcon(192, '#2D5A27', 'CCB'));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), createSVGIcon(512, '#2D5A27', 'CCB'));

console.log('✅ Icons generated in public/ directory');
console.log('Note: SVG icons work for PWA. For PNG, use an image editor or online converter.');

