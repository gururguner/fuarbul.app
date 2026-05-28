import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const categories = [
  { nameTr: "Teknoloji", nameEn: "Technology", slug: "teknoloji" },
  { nameTr: "Yapay Zeka", nameEn: "Artificial Intelligence", slug: "yapay-zeka" },
  { nameTr: "Oyun", nameEn: "Gaming", slug: "oyun" },
  { nameTr: "Otomotiv", nameEn: "Automotive", slug: "otomotiv" },
  { nameTr: "Motosiklet", nameEn: "Motorcycle", slug: "motosiklet" },
  {
    nameTr: "Elektrikli Araçlar",
    nameEn: "Electric Vehicles",
    slug: "elektrikli-araclar",
  },
  { nameTr: "Mobilite", nameEn: "Mobility", slug: "mobilite" },
  {
    nameTr: "Fotoğraf / Video",
    nameEn: "Photography / Video",
    slug: "fotograf-video",
  },
  {
    nameTr: "3D Baskı / Maker",
    nameEn: "3D Printing / Maker",
    slug: "3d-baski-maker",
  },
  { nameTr: "Yazılım", nameEn: "Software", slug: "yazilim" },
  {
    nameTr: "Girişimcilik",
    nameEn: "Entrepreneurship",
    slug: "girisimcilik",
  },
  { nameTr: "E-ticaret", nameEn: "E-commerce", slug: "e-ticaret" },
  {
    nameTr: "Savunma Sanayi",
    nameEn: "Defense Industry",
    slug: "savunma-sanayi",
  },
  { nameTr: "Eğitim", nameEn: "Education", slug: "egitim" },
  {
    nameTr: "Kitap / Kültür",
    nameEn: "Books / Culture",
    slug: "kitap-kultur",
  },
  { nameTr: "Turizm", nameEn: "Tourism", slug: "turizm" },
  { nameTr: "Gıda", nameEn: "Food", slug: "gida" },
  { nameTr: "Tarım", nameEn: "Agriculture", slug: "tarim" },
  { nameTr: "Sağlık", nameEn: "Health", slug: "saglik" },
  { nameTr: "Kozmetik", nameEn: "Cosmetics", slug: "kozmetik" },
  {
    nameTr: "Mobilya / Dekorasyon",
    nameEn: "Furniture / Decoration",
    slug: "mobilya-dekorasyon",
  },
] as const;

const subcategoriesByCategorySlug = {
  motosiklet: [
    { nameTr: "Scooter", nameEn: "Scooter", slug: "scooter" },
    {
      nameTr: "Elektrikli Motosiklet",
      nameEn: "Electric Motorcycle",
      slug: "elektrikli-motosiklet",
    },
    { nameTr: "ATV", nameEn: "ATV", slug: "atv" },
    { nameTr: "Kask", nameEn: "Helmet", slug: "kask" },
    {
      nameTr: "Motosiklet Ekipmanları",
      nameEn: "Motorcycle Gear",
      slug: "motosiklet-ekipmanlari",
    },
    {
      nameTr: "Motosiklet Aksesuarları",
      nameEn: "Motorcycle Accessories",
      slug: "motosiklet-aksesuarlari",
    },
  ],
  otomotiv: [
    { nameTr: "Otomobil", nameEn: "Automobile", slug: "otomobil" },
    {
      nameTr: "Ticari Araç",
      nameEn: "Commercial Vehicle",
      slug: "ticari-arac",
    },
    { nameTr: "Modifiye", nameEn: "Tuning", slug: "modifiye" },
    { nameTr: "Yedek Parça", nameEn: "Spare Parts", slug: "yedek-parca" },
    {
      nameTr: "Araç Teknolojileri",
      nameEn: "Vehicle Technologies",
      slug: "arac-teknolojileri",
    },
  ],
  teknoloji: [
    {
      nameTr: "Tüketici Elektroniği",
      nameEn: "Consumer Electronics",
      slug: "tuketici-elektronigi",
    },
    { nameTr: "Donanım", nameEn: "Hardware", slug: "donanim" },
    { nameTr: "Akıllı Ev", nameEn: "Smart Home", slug: "akilli-ev" },
    {
      nameTr: "Mobil Cihazlar",
      nameEn: "Mobile Devices",
      slug: "mobil-cihazlar",
    },
  ],
  "yapay-zeka": [
    {
      nameTr: "Üretken Yapay Zeka",
      nameEn: "Generative AI",
      slug: "uretken-yapay-zeka",
    },
    {
      nameTr: "Kurumsal Yapay Zeka",
      nameEn: "Enterprise AI",
      slug: "kurumsal-yapay-zeka",
    },
    { nameTr: "Veri", nameEn: "Data", slug: "veri" },
    { nameTr: "Otomasyon", nameEn: "Automation", slug: "otomasyon" },
  ],
  oyun: [
    {
      nameTr: "Video Oyunları",
      nameEn: "Video Games",
      slug: "video-oyunlari",
    },
    { nameTr: "E-spor", nameEn: "Esports", slug: "e-spor" },
    {
      nameTr: "Oyun Donanımları",
      nameEn: "Gaming Hardware",
      slug: "oyun-donanimlari",
    },
  ],
} as const;

const sampleFairs = [
  {
    name: "İstanbul Teknoloji Fuarı",
    slug: "istanbul-teknoloji-fuari-2026",
    legacySlug: "istanbul-technology-expo-2026",
    description:
      "Teknoloji şirketleri, yazılım ekipleri, yapay zeka girişimleri ve yatırımcıların yeni ürünleri, panelleri ve demo alanlarıyla bir araya geldiği kapsamlı bir fuar.",
    startDate: new Date("2026-06-12T09:00:00.000Z"),
    endDate: new Date("2026-06-14T18:00:00.000Z"),
    city: "İstanbul",
    district: "Bakırköy",
    venue: "İstanbul Fuar Merkezi",
    hall: "Salon 1-3",
    organizer: "Future Events Turkey",
    officialWebsite: "https://example.com/istanbul-teknoloji-fuari",
    isFeatured: true,
    isIstanbulPriority: true,
    categorySlugs: ["teknoloji", "yazilim", "yapay-zeka"],
    subcategorySlugs: [
      "tuketici-elektronigi",
      "donanim",
      "akilli-ev",
      "mobil-cihazlar",
    ],
  },
  {
    name: "Ankara Yapay Zeka Zirvesi ve Fuarı",
    slug: "ankara-yapay-zeka-zirvesi-ve-fuari-2026",
    legacySlug: "ankara-ai-summit-fair-2026",
    description:
      "Üretken yapay zeka, kurumsal yapay zeka, veri altyapısı ve otomasyon başlıklarında oturumlar ve sergi alanları sunan sektör buluşması.",
    startDate: new Date("2026-06-25T09:00:00.000Z"),
    endDate: new Date("2026-06-27T18:00:00.000Z"),
    city: "Ankara",
    district: "Çankaya",
    venue: "ATO Congresium",
    hall: "Ana Salon",
    organizer: "Anadolu Teknoloji Forumu",
    officialWebsite: "https://example.com/ankara-yapay-zeka-zirvesi",
    isFeatured: true,
    isIstanbulPriority: false,
    categorySlugs: ["yapay-zeka", "teknoloji", "girisimcilik"],
    subcategorySlugs: [
      "uretken-yapay-zeka",
      "kurumsal-yapay-zeka",
      "veri",
    ],
  },
  {
    name: "İzmir Elektrikli Mobilite Fuarı",
    slug: "izmir-elektrikli-mobilite-fuari-2026",
    legacySlug: "izmir-electric-mobility-fair-2026",
    description:
      "Elektrikli otomobil, hafif ticari araç, batarya teknolojileri, mobilite çözümleri ve şarj istasyonu markalarını ziyaretçilerle buluşturan fuar.",
    startDate: new Date("2026-07-09T09:00:00.000Z"),
    endDate: new Date("2026-07-12T18:00:00.000Z"),
    city: "İzmir",
    district: "Gaziemir",
    venue: "Fuar İzmir",
    hall: "B Holü",
    organizer: "E-Mobility Turkey",
    officialWebsite: "https://example.com/izmir-elektrikli-mobilite-fuari",
    isFeatured: true,
    isIstanbulPriority: false,
    categorySlugs: ["elektrikli-araclar", "mobilite", "otomotiv"],
    subcategorySlugs: [],
  },
  {
    name: "İstanbul Motosiklet ve Ekipmanları Fuarı",
    slug: "istanbul-motosiklet-ekipmanlari-fuari-2026",
    legacySlug: "istanbul-motorcycle-gear-fair-2026",
    description:
      "Scooter, elektrikli motosiklet, kask, sürüş ekipmanları ve motosiklet aksesuar markalarını bir araya getiren ziyaretçi odaklı fuar.",
    startDate: new Date("2026-08-06T09:00:00.000Z"),
    endDate: new Date("2026-08-09T18:00:00.000Z"),
    city: "İstanbul",
    district: "Bakırköy",
    venue: "İstanbul Fuar Merkezi",
    hall: "Salon 5",
    organizer: "Moto Events Turkey",
    officialWebsite: "https://example.com/istanbul-motosiklet-ekipmanlari-fuari",
    isFeatured: false,
    isIstanbulPriority: true,
    categorySlugs: ["motosiklet"],
    subcategorySlugs: [
      "scooter",
      "elektrikli-motosiklet",
      "kask",
      "motosiklet-ekipmanlari",
    ],
  },
  {
    name: "İstanbul Oyun ve E-spor Fuarı",
    slug: "istanbul-oyun-espor-fuari-2026",
    legacySlug: "istanbul-gaming-esports-fair-2026",
    description:
      "Video oyunları, e-spor turnuvaları, oyun donanımları, yayın ekipleri ve topluluk etkinlikleri için tasarlanmış dinamik bir fuar.",
    startDate: new Date("2026-09-04T09:00:00.000Z"),
    endDate: new Date("2026-09-06T18:00:00.000Z"),
    city: "İstanbul",
    district: "Beyoğlu",
    venue: "Haliç Kongre Merkezi",
    hall: "Ana Etkinlik Alanı",
    organizer: "Play Turkey",
    officialWebsite: "https://example.com/istanbul-oyun-espor-fuari",
    isFeatured: false,
    isIstanbulPriority: true,
    categorySlugs: ["oyun", "teknoloji"],
    subcategorySlugs: ["video-oyunlari", "e-spor", "oyun-donanimlari"],
  },
  {
    name: "Bursa Otomotiv Teknolojileri Fuarı",
    slug: "bursa-otomotiv-teknolojileri-fuari-2026",
    legacySlug: "bursa-automotive-technologies-fair-2026",
    description:
      "Otomobil, araç teknolojileri, yedek parça ve elektrikli araç çözümlerini otomotiv ekosistemiyle buluşturan B2B odaklı fuar.",
    startDate: new Date("2026-10-15T09:00:00.000Z"),
    endDate: new Date("2026-10-18T18:00:00.000Z"),
    city: "Bursa",
    district: "Osmangazi",
    venue: "Tüyap Bursa Uluslararası Fuar ve Kongre Merkezi",
    hall: "Salon 2",
    organizer: "Marmara Endüstri Etkinlikleri",
    officialWebsite: "https://example.com/bursa-otomotiv-teknolojileri-fuari",
    isFeatured: false,
    isIstanbulPriority: false,
    categorySlugs: ["otomotiv", "elektrikli-araclar"],
    subcategorySlugs: ["otomobil", "arac-teknolojileri", "yedek-parca"],
  },
] as const;

async function main() {
  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        nameTr: category.nameTr,
        nameEn: category.nameEn,
        sortOrder: index,
        isActive: true,
      },
      create: {
        nameTr: category.nameTr,
        nameEn: category.nameEn,
        slug: category.slug,
        sortOrder: index,
      },
    });
  }

  for (const [categorySlug, subcategories] of Object.entries(
    subcategoriesByCategorySlug,
  )) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: categorySlug },
      select: { id: true },
    });

    for (const [index, subcategory] of subcategories.entries()) {
      await prisma.subcategory.upsert({
        where: { slug: subcategory.slug },
        update: {
          categoryId: category.id,
          nameTr: subcategory.nameTr,
          nameEn: subcategory.nameEn,
          sortOrder: index,
          isActive: true,
        },
        create: {
          categoryId: category.id,
          nameTr: subcategory.nameTr,
          nameEn: subcategory.nameEn,
          slug: subcategory.slug,
          sortOrder: index,
        },
      });
    }
  }

  for (const fair of sampleFairs) {
    const savedFair = await upsertSampleFair(fair);

    for (const categorySlug of fair.categorySlugs) {
      const category = await prisma.category.findUniqueOrThrow({
        where: { slug: categorySlug },
        select: { id: true },
      });

      await prisma.fairCategory.upsert({
        where: {
          fairId_categoryId: {
            fairId: savedFair.id,
            categoryId: category.id,
          },
        },
        update: {},
        create: {
          fairId: savedFair.id,
          categoryId: category.id,
        },
      });
    }

    for (const subcategorySlug of fair.subcategorySlugs) {
      const subcategory = await prisma.subcategory.findUniqueOrThrow({
        where: { slug: subcategorySlug },
        select: { id: true },
      });

      await prisma.fairSubcategory.upsert({
        where: {
          fairId_subcategoryId: {
            fairId: savedFair.id,
            subcategoryId: subcategory.id,
          },
        },
        update: {},
        create: {
          fairId: savedFair.id,
          subcategoryId: subcategory.id,
        },
      });
    }
  }
}

async function upsertSampleFair(fair: (typeof sampleFairs)[number]) {
  const now = new Date();
  const existingFairs = await prisma.fair.findMany({
    where: {
      OR: [{ slug: fair.slug }, { slug: fair.legacySlug }],
    },
    orderBy: { createdAt: "asc" },
  });

  const targetFair =
    existingFairs.find((existingFair) => existingFair.slug === fair.slug) ??
    existingFairs[0];

  if (targetFair) {
    for (const duplicateFair of existingFairs) {
      if (duplicateFair.id !== targetFair.id) {
        await prisma.fair.delete({ where: { id: duplicateFair.id } });
      }
    }

    return prisma.fair.update({
      where: { id: targetFair.id },
      data: {
        slug: fair.slug,
        name: fair.name,
        description: fair.description,
        startDate: fair.startDate,
        endDate: fair.endDate,
        city: fair.city,
        district: fair.district,
        venue: fair.venue,
        hall: fair.hall,
        organizer: fair.organizer,
        officialWebsite: fair.officialWebsite,
        status: "PUBLISHED",
        isPublished: true,
        isFeatured: fair.isFeatured,
        isIstanbulPriority: fair.isIstanbulPriority,
        lastCheckedAt: now,
        lastChangedAt: now,
      },
    });
  }

  return prisma.fair.create({
    data: {
      name: fair.name,
      slug: fair.slug,
      description: fair.description,
      startDate: fair.startDate,
      endDate: fair.endDate,
      city: fair.city,
      district: fair.district,
      venue: fair.venue,
      hall: fair.hall,
      organizer: fair.organizer,
      officialWebsite: fair.officialWebsite,
      status: "PUBLISHED",
      isPublished: true,
      isFeatured: fair.isFeatured,
      isIstanbulPriority: fair.isIstanbulPriority,
      lastCheckedAt: now,
      lastChangedAt: now,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
