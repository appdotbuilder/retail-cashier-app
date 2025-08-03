
import { db } from '../db';
import { storeSettingsTable } from '../db/schema';
import { type UpdateStoreSettingsInput, type StoreSettings } from '../schema';
import { eq } from 'drizzle-orm';

export const updateStoreSettings = async (input: UpdateStoreSettingsInput): Promise<StoreSettings> => {
  try {
    // First, check if any store settings exist
    const existingSettings = await db.select()
      .from(storeSettingsTable)
      .limit(1)
      .execute();

    if (existingSettings.length === 0) {
      // No settings exist, create new record
      const result = await db.insert(storeSettingsTable)
        .values({
          store_name: input.store_name || 'General Store',
          address: input.address || null,
          phone: input.phone || null
        })
        .returning()
        .execute();

      return result[0];
    } else {
      // Settings exist, update the first record
      const settingsId = existingSettings[0].id;
      
      // Build update object with only provided fields
      const updateData: any = {
        updated_at: new Date()
      };
      
      if (input.store_name !== undefined) {
        updateData.store_name = input.store_name;
      }
      if (input.address !== undefined) {
        updateData.address = input.address;
      }
      if (input.phone !== undefined) {
        updateData.phone = input.phone;
      }

      const result = await db.update(storeSettingsTable)
        .set(updateData)
        .where(eq(storeSettingsTable.id, settingsId))
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Store settings update failed:', error);
    throw error;
  }
};
