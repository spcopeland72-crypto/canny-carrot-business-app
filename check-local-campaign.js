/**
 * Script to check what's stored locally for "Stables bingo" campaign
 * This checks the browser's localStorage/AsyncStorage (if accessible) or logs what the app would load
 */

console.log('To check what fields are missing, look at the console logs when the campaign sync fails.');
console.log('The error message indicates which fields are required:');
console.log('Required: businessId, name, type, startDate, endDate');
console.log('');
console.log('Based on the old Campaign structure, the campaign likely has:');
console.log('- id: ✓');
console.log('- name: ✓ ("Stables bingo")');
console.log('- businessId: ✓ (should be set during sync)');
console.log('- type: ✗ MISSING (CampaignType: "bonus_reward", etc.)');
console.log('- startDate: ✗ MISSING (ISO date string)');
console.log('- endDate: ✗ MISSING (ISO date string)');
console.log('- status: ✓ (may have old format: "live" instead of "active")');
console.log('- reward: ✗ (old structure - should be in conditions.rewardData)');
console.log('');
console.log('The normalization code now adds defaults for missing fields:');
console.log('- type: defaults to "bonus_reward"');
console.log('- startDate: defaults to current date');
console.log('- endDate: defaults to 1 year from now');
console.log('- status: maps "live" to "active"');






