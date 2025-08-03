
import { db } from '../db';
import { storeSettingsTable } from '../db/schema';
import { type StoreSettings } from '../schema';

export const getStoreSettings = async (): Promise<StoreSettings | null> => {
  try {
    // Get the first store settings record
    const results = await db.select()
      .from(storeSettingsTable)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const settings = results[0];
    return {
      ...settings,
      // No numeric conversions needed - all fields are text/integer/timestamp
    };
  } catch (error) {
    console.error('Failed to get store settings:', error);
    throw error;
  }
};
