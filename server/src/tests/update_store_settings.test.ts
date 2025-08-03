
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeSettingsTable } from '../db/schema';
import { type UpdateStoreSettingsInput } from '../schema';
import { updateStoreSettings } from '../handlers/update_store_settings';
import { eq } from 'drizzle-orm';

describe('updateStoreSettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new store settings when none exist', async () => {
    const input: UpdateStoreSettingsInput = {
      store_name: 'My Store',
      address: '123 Main St',
      phone: '555-1234'
    };

    const result = await updateStoreSettings(input);

    expect(result.store_name).toEqual('My Store');
    expect(result.address).toEqual('123 Main St');
    expect(result.phone).toEqual('555-1234');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create settings with defaults when no store_name provided', async () => {
    const input: UpdateStoreSettingsInput = {
      address: '456 Oak Ave',
      phone: '555-5678'
    };

    const result = await updateStoreSettings(input);

    expect(result.store_name).toEqual('General Store');
    expect(result.address).toEqual('456 Oak Ave');
    expect(result.phone).toEqual('555-5678');
  });

  it('should update existing store settings', async () => {
    // First, create initial settings
    await db.insert(storeSettingsTable)
      .values({
        store_name: 'Old Store',
        address: 'Old Address',
        phone: 'Old Phone'
      })
      .execute();

    const input: UpdateStoreSettingsInput = {
      store_name: 'New Store Name',
      address: 'New Address'
    };

    const result = await updateStoreSettings(input);

    expect(result.store_name).toEqual('New Store Name');
    expect(result.address).toEqual('New Address');
    expect(result.phone).toEqual('Old Phone'); // Should keep existing phone
    expect(result.id).toBeDefined();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // Create initial settings
    await db.insert(storeSettingsTable)
      .values({
        store_name: 'Initial Store',
        address: 'Initial Address',
        phone: 'Initial Phone'
      })
      .execute();

    const input: UpdateStoreSettingsInput = {
      store_name: 'Updated Store'
    };

    const result = await updateStoreSettings(input);

    expect(result.store_name).toEqual('Updated Store');
    expect(result.address).toEqual('Initial Address');
    expect(result.phone).toEqual('Initial Phone');
  });

  it('should handle null values correctly', async () => {
    // Create initial settings
    await db.insert(storeSettingsTable)
      .values({
        store_name: 'Test Store',
        address: 'Some Address',
        phone: 'Some Phone'
      })
      .execute();

    const input: UpdateStoreSettingsInput = {
      address: null,
      phone: null
    };

    const result = await updateStoreSettings(input);

    expect(result.store_name).toEqual('Test Store');
    expect(result.address).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('should save settings to database correctly', async () => {
    const input: UpdateStoreSettingsInput = {
      store_name: 'Database Test Store',
      address: '789 Test St',
      phone: '555-TEST'
    };

    const result = await updateStoreSettings(input);

    // Verify in database
    const settings = await db.select()
      .from(storeSettingsTable)
      .where(eq(storeSettingsTable.id, result.id))
      .execute();

    expect(settings).toHaveLength(1);
    expect(settings[0].store_name).toEqual('Database Test Store');
    expect(settings[0].address).toEqual('789 Test St');
    expect(settings[0].phone).toEqual('555-TEST');
    expect(settings[0].created_at).toBeInstanceOf(Date);
    expect(settings[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp on existing settings', async () => {
    // Create initial settings
    const initialResult = await db.insert(storeSettingsTable)
      .values({
        store_name: 'Time Test Store',
        address: 'Time Address',
        phone: 'Time Phone'
      })
      .returning()
      .execute();

    const initialUpdatedAt = initialResult[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateStoreSettingsInput = {
      store_name: 'Updated Time Store'
    };

    const result = await updateStoreSettings(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });
});
