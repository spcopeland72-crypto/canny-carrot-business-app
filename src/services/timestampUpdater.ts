/**
 * Update business.updatedAt timestamp in Redis
 * This is the top-level repository timestamp that indicates when ANY part of the repository was updated
 * Should be called after any sync operation (full sync, individual saves, etc.)
 */

const API_BASE_URL = 'https://api.cannycarrot.com';

export const updateBusinessTimestamp = async (businessId: string): Promise<void> => {
  try {
    const now = new Date().toISOString();
    
    // Fetch current business record
    const businessResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (businessResponse.ok) {
      const businessResult = await businessResponse.json();
      if (businessResult.success && businessResult.data) {
        const existingBusiness = businessResult.data;
        
        // Update business.updatedAt to reflect repository update
        const updatedBusiness = {
          ...existingBusiness,
          updatedAt: now, // Update timestamp to reflect repository sync
        };
        
        // Write updated business record back to Redis
        const updateResponse = await fetch(`${API_BASE_URL}/api/v1/businesses/${businessId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedBusiness),
        });
        
        if (updateResponse.ok) {
          console.log(`✅ [TIMESTAMP] Business repository timestamp updated to ${now}`);
        } else {
          const errorText = await updateResponse.text();
          console.warn(`⚠️ [TIMESTAMP] Failed to update business timestamp: ${updateResponse.status} ${errorText.substring(0, 100)}`);
        }
      }
    } else {
      console.warn(`⚠️ [TIMESTAMP] Failed to fetch business record: ${businessResponse.status}`);
    }
  } catch (error: any) {
    console.warn(`⚠️ [TIMESTAMP] Error updating business timestamp: ${error.message || error}`);
    // Don't throw - timestamp update failure shouldn't break the operation
  }
};

