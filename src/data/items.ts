export type ItemKey = 'salt' | 'water' | 'charcoal' | 'lighter' | 'hummus';

export const essentials: ItemKey[] = ['salt', 'water', 'charcoal', 'lighter'];

export const itemMeta: Record<ItemKey, { label: string; textureKey: string; isEssential: boolean }> = {
  salt: { label: 'ملح', textureKey: 'item_salt', isEssential: true },
  water: { label: 'موية', textureKey: 'item_water', isEssential: true },
  charcoal: { label: 'فحم', textureKey: 'item_charcoal', isEssential: true },
  lighter: { label: 'ولاعة', textureKey: 'item_lighter', isEssential: true },
  hummus: { label: 'حمص', textureKey: 'item_hummus', isEssential: false }
};

export const getMissingEssentials = (collected: Set<ItemKey>) =>
  essentials.filter((e) => !collected.has(e));
