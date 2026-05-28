import { toSlug } from "@/lib/slug";

export type FairCategoryMatchInput = {
  description?: string | null;
  fairType?: string | null;
  name?: string | null;
  organizer?: string | null;
  productGroups?: string | null;
  topic?: string | null;
  venue?: string | null;
};

export type FairCategoryMatchResult = {
  matchedFromName: boolean;
  slugs: string[];
};

type CategoryRule = {
  keywords: string[];
  slugs: string[];
};

const categoryRules: CategoryRule[] = [
  {
    slugs: ["sanat-el-sanatlari"],
    keywords: [
      "sanat",
      "art",
      "contemporary art",
      "çağdaş sanat",
      "cagdas sanat",
      "el sanatları",
      "el sanatlari",
      "handicraft",
      "craft",
      "craftistanbul",
      "artankara",
      "artcontact",
      "galeri",
      "gallery",
      "resim",
      "painting",
      "heykel",
      "sculpture",
    ],
  },
  {
    slugs: ["hediyelik-esya"],
    keywords: [
      "hediyelik",
      "hediyelik eşya",
      "hediyelik esya",
      "souvenir",
      "gift",
      "hatıra",
      "hatira",
      "turistik hediyelik",
      "tourist souvenir",
      "dekoratif eşya",
      "dekoratif esya",
      "craftistanbul",
    ],
  },
  {
    slugs: ["ticaret-sanayi"],
    keywords: [
      "ticaret",
      "trade",
      "sanayi",
      "sanayii",
      "sanayileri",
      "industry",
      "yan sanayi",
      "yan sanayii",
      "yan sanayileri",
      "tedarik",
      "supply",
      "supplier",
      "connex",
    ],
  },
  {
    slugs: ["tekstil-moda"],
    keywords: [
      "tekstil",
      "textile",
      "moda",
      "fashion",
      "hazır giyim",
      "hazir giyim",
      "konfeksiyon",
      "kumaş",
      "kumas",
      "deri",
      "kürk",
      "kurk",
      "ayakkabı",
      "ayakkabi",
      "çanta",
      "canta",
      "gelinlik",
      "abiye",
    ],
  },
  {
    slugs: ["ambalaj"],
    keywords: [
      "ambalaj",
      "packaging",
      "pack",
      "plast",
      "plastik",
      "plastic",
      "paketleme",
      "packaging technologies",
    ],
  },
  {
    slugs: ["endustri-makine"],
    keywords: [
      "endüstri",
      "endustri",
      "industry",
      "industrial",
      "makine",
      "makina",
      "machine",
      "machinery",
      "üretim",
      "uretim",
      "manufacturing",
      "metal",
      "kalıp",
      "kalip",
      "plastik endüstrisi",
      "plastik endustrisi",
    ],
  },
  {
    slugs: ["yapi-insaat"],
    keywords: [
      "yapı",
      "yapi",
      "inşaat",
      "insaat",
      "construction",
      "building",
      "yapı malzemeleri",
      "yapi malzemeleri",
      "seramik",
      "ceramic",
      "mermer",
      "marble",
      "taş",
      "tas",
      "doğal taş",
      "dogal tas",
    ],
  },
  {
    slugs: ["evcil-hayvan"],
    keywords: [
      "pet",
      "evcil hayvan",
      "hayvan",
      "kedi",
      "köpek",
      "kopek",
      "veteriner",
      "akvaryum",
      "petzoo",
      "veterinary",
    ],
  },
  {
    slugs: ["enerji"],
    keywords: [
      "enerji",
      "energy",
      "solar",
      "güneş",
      "gunes",
      "yenilenebilir",
      "renewable",
      "elektrik",
      "electricity",
      "power",
      "battery",
      "batarya",
    ],
  },
  {
    slugs: ["denizcilik"],
    keywords: ["deniz", "denizcilik", "marine", "boat", "yacht", "yat", "tekne"],
  },
  {
    slugs: ["spor-outdoor"],
    keywords: [
      "spor",
      "sport",
      "sports",
      "outdoor",
      "kamp",
      "camping",
      "karavan",
      "caravan",
      "doğa",
      "doga",
      "av",
      "hunting",
      "balıkçılık",
      "balikcilik",
      "fitness",
    ],
  },
  {
    slugs: ["gida"],
    keywords: [
      "gıda",
      "gida",
      "food",
      "food product",
      "içecek",
      "icecek",
      "beverage",
      "horeca",
      "restoran",
      "restaurant",
      "otel ekipman",
      "hotel equipment",
      "cafe",
      "kafe",
      "pastacılık",
      "pastacilik",
      "dondurma",
      "unlu mamul",
      "bakery",
    ],
  },
  {
    slugs: ["turizm"],
    keywords: [
      "turizm",
      "tourism",
      "hotel",
      "otel",
      "horeca",
      "konaklama",
      "hospitality",
      "seyahat",
      "travel",
      "turistik",
      "tourist",
      "tourist souvenir",
      "karavan",
      "caravan",
    ],
  },
  {
    slugs: ["mobilite"],
    keywords: [
      "mobilite",
      "mobility",
      "ulaşım",
      "ulasim",
      "transport",
      "transportation",
      "karavan",
      "caravan",
    ],
  },
  {
    slugs: ["mobilya-dekorasyon"],
    keywords: [
      "mobilya",
      "furniture",
      "dekorasyon",
      "decoration",
      "halı",
      "hali",
      "carpet",
      "flooring",
      "zemin",
      "ev tekstili",
      "home textile",
      "iç mimari",
      "ic mimari",
      "interior",
    ],
  },
  {
    slugs: ["kitap-kultur"],
    keywords: [
      "kitap",
      "book",
      "yayın",
      "yayin",
      "publishing",
      "kültür",
      "kultur",
      "edebiyat",
      "literature",
    ],
  },
  {
    slugs: ["tarim"],
    keywords: [
      "tarım",
      "tarim",
      "agriculture",
      "agro",
      "sera",
      "hayvancılık",
      "hayvancilik",
      "livestock",
      "çiftlik",
      "ciftlik",
      "agrotech",
    ],
  },
  {
    slugs: ["saglik"],
    keywords: [
      "sağlık",
      "saglik",
      "health",
      "medical",
      "medikal",
      "dental",
      "diş",
      "dis",
      "hastane",
      "hospital",
      "pharma",
    ],
  },
  {
    slugs: ["kozmetik"],
    keywords: [
      "kozmetik",
      "cosmetic",
      "beauty",
      "güzellik",
      "guzellik",
      "kişisel bakım",
      "kisisel bakim",
      "personal care",
    ],
  },
  {
    slugs: ["otomotiv"],
    keywords: [
      "otomotiv",
      "automotive",
      "auto",
      "araç",
      "arac",
      "vehicle",
      "yedek parça",
      "yedek parca",
      "spare parts",
      "tuning",
      "ticari araç",
      "ticari arac",
      "ticari araçlar",
      "ticari araclar",
      "commercial vehicle",
      "commercial vehicles",
      "van",
      "truck",
      "kamyon",
      "kamyonet",
      "otobüs",
      "otobus",
      "yan sanayi",
      "yan sanayii",
      "yan sanayileri",
    ],
  },
  {
    slugs: ["motosiklet"],
    keywords: ["motosiklet", "motorcycle", "motobike", "scooter", "kask"],
  },
  {
    slugs: ["teknoloji"],
    keywords: [
      "teknoloji",
      "tech",
      "bilisim",
      "bilişim",
      "elektronik",
      "computer",
      "bilgisayar",
      "robot",
      "robotik",
      "digital",
      "dijital",
    ],
  },
  {
    slugs: ["teknoloji", "yazilim"],
    keywords: ["yazılım", "yazilim", "software"],
  },
  {
    slugs: ["yapay-zeka"],
    keywords: [
      "yapay zeka",
      "artificial intelligence",
      "generative ai",
      "otomasyon",
      "automation",
      "ai",
    ],
  },
  {
    slugs: ["oyun"],
    keywords: [
      "oyun",
      "gaming",
      "e-spor",
      "esport",
      "esports",
      "video game",
      "console",
      "konsol",
    ],
  },
  {
    slugs: ["elektrikli-araclar"],
    keywords: [
      "elektrikli araç",
      "elektrikli arac",
      "electric vehicle",
      "e-mobility",
      "emobility",
      "şarj",
      "sarj",
      "charging",
      "ev",
    ],
  },
  {
    slugs: ["egitim"],
    keywords: [
      "eğitim",
      "egitim",
      "education",
      "school",
      "okul",
      "university",
      "üniversite",
      "kariyer",
      "career",
    ],
  },
  {
    slugs: ["savunma-sanayi"],
    keywords: [
      "savunma",
      "defense",
      "defence",
      "military",
      "güvenlik",
      "guvenlik",
      "security",
    ],
  },
  {
    slugs: ["e-ticaret"],
    keywords: [
      "e-ticaret",
      "ecommerce",
      "e-commerce",
      "online retail",
      "pazaryeri",
      "marketplace",
    ],
  },
  {
    slugs: ["girisimcilik"],
    keywords: [
      "girişim",
      "girisim",
      "startup",
      "entrepreneur",
      "yatırım",
      "yatirim",
      "investor",
    ],
  },
  {
    slugs: ["fotograf-video"],
    keywords: [
      "fotoğraf",
      "fotograf",
      "photography",
      "camera",
      "kamera",
      "video",
      "broadcast",
      "yayıncılık",
      "yayincilik",
    ],
  },
  {
    slugs: ["3d-baski-maker"],
    keywords: [
      "3d",
      "3d baskı",
      "3d baski",
      "printer",
      "yazıcı",
      "yazici",
      "maker",
      "additive manufacturing",
    ],
  },
];

export function suggestFairCategorySlugs(
  input: FairCategoryMatchInput,
): FairCategoryMatchResult {
  const nameText = createSearchableText(input.name ?? "");
  const allText = createSearchableText(
    [
      input.name,
      input.description,
      input.topic,
      input.productGroups,
      input.fairType,
      input.organizer,
      input.venue,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const nameSlugs = getMatchingSlugs(nameText);
  const allSlugs = getMatchingSlugs(allText);

  return {
    matchedFromName: nameSlugs.length > 0,
    slugs: Array.from(new Set([...nameSlugs, ...allSlugs])),
  };
}

function getMatchingSlugs(text: string) {
  const slugs = new Set<string>();

  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => textIncludesTerm(text, keyword))) {
      rule.slugs.forEach((slug) => slugs.add(slug));
    }
  }

  return Array.from(slugs);
}

function createSearchableText(text: string) {
  return ` ${toSlug(text).replace(/-/g, " ")} `;
}

function textIncludesTerm(text: string, term: string) {
  const normalizedTerm = toSlug(term).replace(/-/g, " ").trim();

  if (!normalizedTerm) {
    return false;
  }

  if (normalizedTerm.length <= 5) {
    return text.includes(` ${normalizedTerm} `);
  }

  return text.includes(normalizedTerm);
}
