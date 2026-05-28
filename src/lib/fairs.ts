import { defaultLocale, type Locale } from "@/lib/i18n";
import type {
  Fair,
  FairCategory,
  FairTaxonomy,
  LocalizedFair,
  LocalizedFairFields,
} from "@/types/fair";

export const popularCategories: FairCategory[] = [
  "Technology",
  "Gaming",
  "Automotive",
  "Motorcycle",
  "Artificial Intelligence",
  "Electric Vehicles",
];

export const categorySlugToFairCategory: Record<string, FairCategory> = {
  teknoloji: "Technology",
  oyun: "Gaming",
  otomotiv: "Automotive",
  motosiklet: "Motorcycle",
  "yapay-zeka": "Artificial Intelligence",
  "elektrikli-araclar": "Electric Vehicles",
};

export const seededFairTranslations: Record<
  string,
  Record<Locale, Partial<LocalizedFairFields>>
> = {
  "istanbul-teknoloji-fuari-2026": {
    tr: {
      name: "İstanbul Teknoloji Fuarı",
      summary:
        "Yazılım, donanım ve yeni nesil dijital ürünler için buluşma noktası.",
      description:
        "Teknoloji şirketleri, yazılım ekipleri, yapay zeka girişimleri ve yatırımcıların yeni ürünleri, panelleri ve demo alanlarıyla bir araya geldiği kapsamlı bir fuar.",
      city: "İstanbul",
      venue: "İstanbul Fuar Merkezi",
      organizer: "Future Events Turkey",
    },
    en: {
      name: "Istanbul Technology Expo",
      summary:
        "A meeting point for software, hardware, and next-generation digital products.",
      description:
        "A broad fair where technology companies, software teams, AI startups, and investors meet around product launches, panels, and demo areas.",
      city: "Istanbul",
      venue: "Istanbul Expo Center",
      organizer: "Future Events Turkey",
    },
  },
  "ankara-yapay-zeka-zirvesi-ve-fuari-2026": {
    tr: {
      name: "Ankara Yapay Zeka Zirvesi ve Fuarı",
      summary: "Yapay zeka çözümleri, veri ekipleri ve kurumsal uygulamalar.",
      description:
        "Üretken yapay zeka, kurumsal yapay zeka, veri altyapısı ve otomasyon başlıklarında oturumlar ve sergi alanları sunan sektör buluşması.",
      city: "Ankara",
      venue: "ATO Congresium",
      organizer: "Anadolu Teknoloji Forumu",
    },
    en: {
      name: "Ankara AI Summit & Fair",
      summary: "AI solutions, data teams, and enterprise applications.",
      description:
        "An industry gathering with sessions and exhibition areas on generative AI, enterprise AI, data infrastructure, and automation.",
      city: "Ankara",
      venue: "ATO Congresium",
      organizer: "Anatolia Tech Forum",
    },
  },
  "izmir-elektrikli-mobilite-fuari-2026": {
    tr: {
      name: "İzmir Elektrikli Mobilite Fuarı",
      summary: "Elektrikli araçlar, şarj altyapısı ve sürdürülebilir ulaşım.",
      description:
        "Elektrikli otomobil, hafif ticari araç, batarya teknolojileri, mobilite çözümleri ve şarj istasyonu markalarını ziyaretçilerle buluşturan fuar.",
      city: "İzmir",
      venue: "Fuar İzmir",
      organizer: "E-Mobility Turkey",
    },
    en: {
      name: "Izmir Electric Mobility Fair",
      summary:
        "Electric vehicles, charging infrastructure, and sustainable transportation.",
      description:
        "A fair bringing electric cars, light commercial vehicles, battery technologies, mobility solutions, and charging station brands together with visitors.",
      city: "Izmir",
      venue: "Fuar Izmir",
      organizer: "E-Mobility Turkey",
    },
  },
  "istanbul-motosiklet-ekipmanlari-fuari-2026": {
    tr: {
      name: "İstanbul Motosiklet ve Ekipmanları Fuarı",
      summary: "Motosiklet modelleri, ekipmanlar, kasklar ve aksesuarlar.",
      description:
        "Scooter, elektrikli motosiklet, kask, sürüş ekipmanları ve motosiklet aksesuar markalarını bir araya getiren ziyaretçi odaklı fuar.",
      city: "İstanbul",
      venue: "İstanbul Fuar Merkezi",
      organizer: "Moto Events Turkey",
    },
    en: {
      name: "Istanbul Motorcycle and Gear Fair",
      summary: "Motorcycle models, gear, helmets, and accessories.",
      description:
        "A visitor-focused fair bringing scooter, electric motorcycle, helmet, riding gear, and motorcycle accessory brands together.",
      city: "Istanbul",
      venue: "Istanbul Expo Center",
      organizer: "Moto Events Turkey",
    },
  },
  "istanbul-oyun-espor-fuari-2026": {
    tr: {
      name: "İstanbul Oyun ve E-spor Fuarı",
      summary: "Oyun stüdyoları, e-spor, donanım ve topluluk etkinlikleri.",
      description:
        "Video oyunları, e-spor turnuvaları, oyun donanımları, yayın ekipleri ve topluluk etkinlikleri için tasarlanmış dinamik bir fuar.",
      city: "İstanbul",
      venue: "Haliç Kongre Merkezi",
      organizer: "Play Turkey",
    },
    en: {
      name: "Istanbul Gaming and Esports Fair",
      summary: "Game studios, esports, hardware, and community events.",
      description:
        "A dynamic fair designed for video games, esports tournaments, gaming hardware, publishing teams, and community events.",
      city: "Istanbul",
      venue: "Halic Congress Center",
      organizer: "Play Turkey",
    },
  },
  "bursa-otomotiv-teknolojileri-fuari-2026": {
    tr: {
      name: "Bursa Otomotiv Teknolojileri Fuarı",
      summary: "Otomotiv teknolojileri, yedek parça ve elektrikli araçlar.",
      description:
        "Otomobil, araç teknolojileri, yedek parça ve elektrikli araç çözümlerini otomotiv ekosistemiyle buluşturan B2B odaklı fuar.",
      city: "Bursa",
      venue: "Tüyap Bursa Uluslararası Fuar ve Kongre Merkezi",
      organizer: "Marmara Endüstri Etkinlikleri",
    },
    en: {
      name: "Bursa Automotive Technologies Fair",
      summary:
        "Automotive technologies, spare parts, and electric vehicle solutions.",
      description:
        "A B2B-focused fair bringing automobiles, vehicle technologies, spare parts, and electric vehicle solutions together with the automotive ecosystem.",
      city: "Bursa",
      venue: "Tuyap Bursa International Fair Center",
      organizer: "Marmara Industry Events",
    },
  },
};

export function getLocalizedFair(
  fair: Fair,
  locale: Locale = defaultLocale,
): LocalizedFair {
  const { translations, ...baseFair } = fair;

  return {
    ...baseFair,
    ...translations[locale],
  };
}

export function getTaxonomyLabel(
  taxonomy: FairTaxonomy,
  locale: Locale = defaultLocale,
) {
  return locale === "tr" ? taxonomy.nameTr : taxonomy.nameEn;
}
