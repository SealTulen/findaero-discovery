const transliteration = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function airlineSlug(name) {
  const transliterated = [...name.trim().toLocaleLowerCase("ru")].map((character) => Object.hasOwn(transliteration, character) ? transliteration[character] : character).join("");
  const slug = transliterated.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`Cannot generate a profile slug for airline name: ${name}`);
  return slug;
}

export function registerAirline(airlines, name) {
  const normalizedName = name.trim();
  const key = normalizedName.toLocaleLowerCase("ru");
  const existing = airlines.find((airline) => [airline.name, ...(airline.eventAliases ?? [])].some((alias) => alias.trim().toLocaleLowerCase("ru") === key));
  if (existing) return { airlines, airline: existing, created: false };

  const baseSlug = airlineSlug(normalizedName);
  const existingSlugs = new Set(airlines.map((airline) => airline.slug));
  let slug = baseSlug;
  let suffix = 2;
  while (existingSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
  const airline = { slug, name: normalizedName };
  return { airlines: [...airlines, airline], airline, created: true };
}
