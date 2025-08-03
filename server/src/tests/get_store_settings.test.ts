
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeSettingsTable } from '../db/schema';
import { getStoreSettings } from '../handlers/get_store_settings';

describe('getStoreSettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no store settings exist', async () => {
    const result = await getStoreSettings();
    expect(result).toBeNull();
  });

  it('should return store settings when they exist', async () => {
    // Create test store settings
    const testSettings = await db.insert(storeSettingsTable)
      .values({
        store_name: 'Test Store',
        address: '123 Test Street',
        phone: '555-0123'
      })
      .returning()
      .execute();

    const result = await getStoreSettings();

    expect(result).not.toBeNull();
    expect(result!.id).toBe(testSettings[0].id);
    expect(result!.store_name).toBe('Test Store');
    expect(result!.address).toBe('123 Test Street');
    expect(result!.phone).toBe('555-0123');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return first store settings when multiple exist', async () => {
    // Create multiple store settings
    await db.insert(storeSettingsTable)
      .values([
        {
          store_name: 'First Store',
          address: '123 First Street',
          phone: '555-0001'
        },
        {
          store_name: 'Second Store',
          address: '456 Second Street',
          phone: '555-0002'
        }
      ])
      .execute();

    const result = await getStoreSettings();

    expect(result).not.toBeNull();
    expect(result!.store_name).toBe('First Store');
    expect(result!.address).toBe('123 First Street');
    expect(result!.phone).toBe('555-0001');
  });

  it('should return store settings with null optional fields', async () => {
    // Create store settings with only required fields
    await db.insert(storeSettingsTable)
      .values({
        store_name: 'Minimal Store'
        // address and phone are nullable and omitted
      })
      .execute();

    const result = await getStoreSettings();

    expect(result).not.toBeNull();
    expect(result!.store_name).toBe('Minimal Store');
    expect(result!.address).toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});
