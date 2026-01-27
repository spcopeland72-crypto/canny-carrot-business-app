const fs = require('fs');
const path = require('path');
const os = require('os');
const { Level } = require('level');

const leveldbPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb');

(async () => {
  try {
    const db = new Level(leveldbPath, { valueEncoding: 'json' });
    await db.open();
    
    console.log('REWARDS:');
    try {
      const rewards = await db.get('local_repo:rewards');
      console.log(JSON.stringify(rewards, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }
    
    console.log('\n\nCAMPAIGNS:');
    try {
      const campaigns = await db.get('local_repo:campaigns');
      console.log(JSON.stringify(campaigns, null, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }
    
    await db.close();
  } catch (e) {
    console.log('Database locked, reading from browser console messages instead');
    console.log('REWARDS: Check browser console for [HomeScreen] Reward details logs');
    console.log('CAMPAIGNS: Check browser console for [HomeScreen] campaigns logs');
  }
})();
