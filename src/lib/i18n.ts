import type { FairCategory } from "@/types/fair";

export const locales = ["tr", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "tr";

export const categoryLabels: Record<Locale, Record<FairCategory, string>> = {
  tr: {
    Technology: "Teknoloji",
    Gaming: "Oyun / Gaming",
    Automotive: "Otomotiv",
    Motorcycle: "Motosiklet",
    "Artificial Intelligence": "Yapay Zeka",
    "Electric Vehicles": "Elektrikli Araçlar",
  },
  en: {
    Technology: "Technology",
    Gaming: "Gaming",
    Automotive: "Automotive",
    Motorcycle: "Motorcycle",
    "Artificial Intelligence": "Artificial Intelligence",
    "Electric Vehicles": "Electric Vehicles",
  },
};

export const filterCities: Record<Locale, string[]> = {
  tr: ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya"],
  en: ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya"],
};

export const translations = {
  tr: {
    brand: {
      logoAlt: "fuarbul logosu",
    },
    nav: {
      home: "Ana sayfa",
      fairs: "Fuarlar",
      login: "Giriş",
      profile: "Profil",
      following: "Takip Ettiklerim",
      interests: "İlgi Alanlarım",
      register: "Kayıt ol",
      admin: "Yönetici",
      mainNavigation: "Ana navigasyon",
      mobileNavigation: "Mobil navigasyon",
    },
    language: {
      label: "Dil seçimi",
    },
    common: {
      featured: "Öne çıkan",
      upcoming: "Yakında",
      viewDetails: "Detayları gör",
      seeAll: "Tümünü gör",
      discoverFairs: "Fuarları keşfet",
      loginToFollow: "Takip için giriş yap",
      viewFollowing: "Takip ettiklerimi gör",
      date: "Tarih",
      city: "Şehir",
      venue: "Mekan",
      organizer: "Organizatör",
      category: "Kategori",
      allCities: "Tüm şehirler",
      selectCity: "Şehir seç",
      allCategories: "Tüm kategoriler",
      allDates: "Tüm tarihler",
      filter: "Filtrele",
      clearFilters: "Filtreleri temizle",
      save: "Kaydet",
      cancel: "Vazgeç",
      officialWebsite: "Resmi siteye git",
      follow: "Takibe al",
      unfollow: "Takipten çıkar",
      email: "E-posta",
      fullName: "Ad soyad",
      name: "Ad",
      surname: "Soyad",
      password: "Şifre",
      profession: "Meslek",
      phone: "Cep telefonu",
      optional: "Opsiyonel",
      notAdded: "Eklenmemiş",
      birthDate: "Doğum tarihi",
      gender: "Cinsiyet",
      continueWithGoogle: "Google ile devam et",
      logout: "Çıkış yap",
      myProfile: "Profilim",
      search: "Arama",
      result: "Sonuç",
      thisWeek: "Bu hafta",
      thisMonth: "Bu ay",
      nextThreeMonths: "Önümüzdeki 3 ay",
      upcomingFairs: "Yaklaşan fuarlar",
      featuredOnly: "Öne çıkanlar",
      notFeatured: "Öne çıkmayanlar",
      allFairs: "Tüm fuarlar",
    },
    home: {
      heroBadge: "Türkiye fuar rehberi",
      valueProposition:
        "Türkiye’deki fuarları keşfet, ilgini çekenleri takip et, zamanı gelince haberdar ol.",
      upcomingEvents: "Yaklaşan etkinlikler",
      thisMonth: "Bu ay radarda",
      featuredFairs: "Öne çıkan fuarlar",
      categories: "Kategoriler",
      popularCategories: "Popüler ilgi alanları",
      emptyTitle: "Henüz yayınlanmış fuar yok",
      emptyDescription:
        "Veritabanına fuarlar eklendiğinde burada yaklaşan etkinlikleri göreceksin.",
      recommendedFairs: "Sana uygun fuarlar",
      interestsCta:
        "İlgi alanlarını seç, sana uygun fuarları öne çıkaralım.",
      chooseInterests: "İlgi alanı seç",
    },
    fairsPage: {
      eyebrow: "Fuar keşfi",
      title: "Türkiye’deki fuarlar",
      description:
        "Şehir, kategori ve tarihe göre arama deneyimi bu alanda gelişecek. Bu aşamada tüm veriler örnek olarak gösteriliyor.",
      emptyTitle: "Yayınlanmış fuar bulunamadı",
      emptyDescription:
        "Örnek veri veya içe aktarma sonrası yayınlanan fuarlar bu sayfada listelenecek.",
      noFilterResults: "Bu filtrelere uygun fuar bulunamadı.",
      searchPlaceholder: "Fuar adı, şehir, mekan veya organizatör ara",
    },
    fairDetail: {
      notFoundTitle: "Fuar bulunamadı",
      actionsTitle: "Fuar işlemleri",
      actionsDescription:
        "Resmi siteyi inceleyebilir veya daha sonra hatırlatma almak için fuarı takip etmeyi seçebilirsin.",
      followNote:
        "Takip etmek ve bildirim almak için ileride giriş yapman gerekecek.",
      followComingSoon:
        "Takip etme özelliği bir sonraki aşamada bu hesaba bağlanacak.",
      followingState: "Bu fuarı takip ediyorsun.",
      followPrompt:
        "Bu fuarı takibe alarak yaklaşan bildirimlerden haberdar olabileceksin.",
    },
    loginPage: {
      title: "Giriş yap",
      description:
        "Fuarları takip etmek, hatırlatmalar almak ve profilini yönetmek için giriş yap.",
      emailPlaceholder: "ornek@fuarbul.app",
      submitPlaceholder: "Giriş altyapısı yakında",
      submit: "Giriş yap",
      noAccount: "Hesabın yok mu?",
      createAccount: "Hesap oluştur",
    },
    registerPage: {
      title: "Hesap oluştur",
      description:
        "Fuarları takip etmek ve hatırlatmalar almak için ücretsiz hesabını oluştur.",
      namePlaceholder: "Ad Soyad",
      emailPlaceholder: "ornek@fuarbul.app",
      submitPlaceholder: "Kayıt altyapısı yakında",
      submit: "Kayıt ol",
      haveAccount: "Zaten hesabın var mı?",
      passwordHelp: "Şifre en az 8 karakter olmalıdır.",
      requiredFieldsNote: "* işaretli alanlar zorunludur.",
      professionPlaceholder: "Meslek seç",
      phoneHelp: "Opsiyonel. Örnek: +90 532 123 45 67",
      alreadyHaveAccount: "Zaten hesabım var",
    },
    profilePage: {
      badge: "Profilim",
      title: "Profil",
      description:
        "Hesap bilgilerin, takip ettiğin fuarlar ve bildirim tercihlerin burada yönetilecek.",
      accountInfo: "Hesap bilgileri",
      followedFairs: "Takip edilen fuarlar",
      followedFairsEmpty: "Henüz oturum ve takip altyapısı bağlı değil.",
      notificationPreferences: "Bildirim tercihleri",
      notificationDescription:
        "Takip ettiğin fuarlar yaklaşırken nasıl haberdar edilmek istediğini buradan yönetebilirsin.",
      notificationEmail: "E-posta bildirimleri",
      notificationInApp: "Uygulama içi bildirimler",
      notificationThirtyDays: "30 gün önce hatırlat",
      notificationSevenDays: "7 gün önce hatırlat",
      notificationOneDay: "1 gün önce hatırlat",
      notificationFairStarted: "Fuar başladığında hatırlat",
      saveNotifications: "Bildirim tercihlerini kaydet",
      notificationUpdateSuccess: "Bildirim tercihlerin güncellendi.",
      notificationUpdateError:
        "Bildirim tercihleri güncellenirken bir hata oluştu.",
      notificationChannelWarning:
        "Hiçbir bildirim kanalı seçili değil. Hatırlatma alabilmek için en az bir kanal seçmelisin.",
      sendTestReminderEmail: "Test hatırlatma e-postası gönder",
      testReminderEmailSuccess: "Test hatırlatma e-postası gönderildi.",
      testReminderEmailError:
        "Test hatırlatma e-postası gönderilirken bir hata oluştu.",
      testReminderNoFollowedFairs:
        "Test e-postası göndermek için önce bir fuarı takip etmelisin.",
      editProfile: "Profili düzenle",
      noInterests: "Henüz ilgi alanı seçmedin.",
      editInterests: "İlgi alanlarını düzenle",
      updateSuccess: "Profil bilgilerin güncellendi.",
      updateError: "Profil güncellenirken bir hata oluştu.",
      changePassword: "Şifre değiştir",
      currentPassword: "Mevcut şifre",
      newPassword: "Yeni şifre",
      confirmNewPassword: "Yeni şifre tekrar",
      updatePassword: "Şifreyi güncelle",
      passwordUpdateSuccess: "Şifren başarıyla güncellendi.",
      passwordUpdateError: "Şifre güncellenirken bir hata oluştu.",
      currentPasswordIncorrect: "Mevcut şifre hatalı.",
      passwordMismatch: "Yeni şifreler eşleşmiyor.",
      passwordTooShort: "Yeni şifre en az 8 karakter olmalı.",
      googlePasswordAccount:
        "Bu hesap Google ile oluşturulmuş. Şifre değiştirmek için Google hesabını kullanmalısın.",
      goToLogin: "Giriş sayfasına git",
    },
    followingPage: {
      eyebrow: "Takip listesi",
      title: "Takip Ettiklerim",
      description:
        "Takibe aldığın fuarları burada tarih sırasına göre görebilirsin.",
      emptyTitle: "Henüz takip ettiğin bir fuar yok.",
    },
    interestsPage: {
      title: "İlgi alanlarım",
      description:
        "Sana daha uygun fuarlar önerebilmemiz için ilgilendiğin alanları seç.",
      save: "İlgi alanlarımı kaydet",
      success: "İlgi alanların güncellendi.",
      emptyValidation: "En az bir ilgi alanı seçmelisin.",
    },
    adminPage: {
      badge: "Admin",
      title: "Admin Paneli",
      description: "Fuarları manuel olarak oluştur, düzenle ve yayına hazırla.",
      unauthorized: "Bu alana erişim yetkin yok.",
      fairManagement: "Fuar Yönetimi",
      addFair: "Yeni fuar ekle",
      editFair: "Fuarı düzenle",
      totalFairs: "Toplam fuar sayısı",
      publishedFairs: "Yayındaki fuarlar",
      draftFairs: "Taslak fuarlar",
      archivedFairs: "Arşivlenen fuarlar",
      featuredFairs: "Öne çıkan fuarlar",
      istanbulPriorityFairs: "İstanbul öncelikli fuarlar",
      searchPlaceholder: "Fuar adı, şehir, mekan veya organizatör ara",
      allStatuses: "Tüm durumlar",
      status: "Durum",
      statusDRAFT: "Taslak",
      statusPUBLISHED: "Yayında",
      statusUPDATED: "Güncellendi",
      statusPOSTPONED: "Ertelendi",
      statusCANCELLED: "İptal edildi",
      statusARCHIVED: "Arşivlendi",
      published: "Yayında",
      notPublished: "Yayında değil",
      edit: "Düzenle",
      publish: "Yayına al",
      moveToDraft: "Taslağa çek",
      archive: "Arşivle",
      markFeatured: "Öne çıkar",
      removeFeatured: "Öne çıkarmayı kaldır",
      istanbulPriority: "İstanbul öncelikli",
      removeIstanbulPriority: "İstanbul önceliğini kaldır",
      categories: "Kategoriler",
      subcategories: "Alt kategoriler",
      updatedAt: "Güncellenme",
      startDate: "Başlangıç tarihi",
      endDate: "Bitiş tarihi",
      descriptionField: "Açıklama",
      district: "İlçe",
      hall: "Salon",
      sourceName: "Kaynak",
      sourceUrl: "Kaynak bağlantısı",
      slugExists: "Bu slug ile kayıtlı bir fuar zaten var.",
    },
    footer: {
      tagline:
        "© 2026 fuarbul. Türkiye fuarlarını keşfetmek için hazırlanıyor.",
    },
    notFound: {
      eyebrow: "404",
      title: "Sayfa bulunamadı",
      description: "Aradığın fuar veya sayfa bu aşamada mevcut değil.",
      backToFairs: "Fuarlara dön",
    },
    auth: {
      invalidCredentials: "E-posta veya şifre hatalı.",
      genericError: "Bir şeyler ters gitti. Lütfen tekrar dene.",
      emailExists: "Bu e-posta ile kayıtlı bir hesap zaten var.",
      weakPassword: "Şifre en az 8 karakter olmalıdır.",
      invalidEmail: "Geçerli bir e-posta adresi gir.",
      missingRequiredFields: "Lütfen zorunlu alanları doldur.",
      invalidCity: "Lütfen geçerli bir şehir seç.",
      invalidPhone: "Geçerli bir Türkiye cep telefonu numarası gir.",
      invalidProfession: "Lütfen geçerli bir meslek seç.",
      alreadyLoggedIn: "Zaten giriş yaptın.",
      switchAccountNote: "Hesap değiştirmek için önce çıkış yapmalısın.",
    },
    gender: {
      male: "Erkek",
      female: "Kadın",
      other: "Diğer",
      preferNotToSay: "Belirtmek istemiyorum",
      unspecified: "Seçim yok",
    },
  },
  en: {
    brand: {
      logoAlt: "fuarbul logo",
    },
    nav: {
      home: "Home",
      fairs: "Fairs",
      login: "Login",
      profile: "Profile",
      following: "Following",
      interests: "My Interests",
      register: "Sign up",
      admin: "Admin",
      mainNavigation: "Main navigation",
      mobileNavigation: "Mobile navigation",
    },
    language: {
      label: "Language selection",
    },
    common: {
      featured: "Featured",
      upcoming: "Upcoming",
      viewDetails: "View details",
      seeAll: "See all",
      discoverFairs: "Discover fairs",
      loginToFollow: "Login to follow",
      viewFollowing: "View following",
      date: "Date",
      city: "City",
      venue: "Venue",
      organizer: "Organizer",
      category: "Category",
      allCities: "All cities",
      selectCity: "Select city",
      allCategories: "All categories",
      allDates: "All dates",
      filter: "Filter",
      clearFilters: "Clear filters",
      save: "Save",
      cancel: "Cancel",
      officialWebsite: "Official website",
      follow: "Follow",
      unfollow: "Unfollow",
      email: "Email",
      fullName: "Full name",
      name: "Name",
      surname: "Surname",
      password: "Password",
      profession: "Profession",
      phone: "Phone number",
      optional: "Optional",
      notAdded: "Not added",
      birthDate: "Birth date",
      gender: "Gender",
      continueWithGoogle: "Continue with Google",
      logout: "Logout",
      myProfile: "My profile",
      search: "Search",
      result: "Result",
      thisWeek: "This week",
      thisMonth: "This month",
      nextThreeMonths: "Next 3 months",
      upcomingFairs: "Upcoming fairs",
      featuredOnly: "Featured",
      notFeatured: "Not featured",
      allFairs: "All fairs",
    },
    home: {
      heroBadge: "Turkey fair guide",
      valueProposition:
        "Discover fairs in Turkey, follow the ones you care about, and get notified when the time comes.",
      upcomingEvents: "Upcoming events",
      thisMonth: "On the radar this month",
      featuredFairs: "Featured fairs",
      categories: "Categories",
      popularCategories: "Popular interests",
      emptyTitle: "No published fairs yet",
      emptyDescription:
        "Upcoming events will appear here after fairs are added to the database.",
      recommendedFairs: "Recommended for you",
      interestsCta:
        "Choose your interests so we can highlight fairs for you.",
      chooseInterests: "Choose interests",
    },
    fairsPage: {
      eyebrow: "Fair discovery",
      title: "Fairs in Turkey",
      description:
        "Search by city, category, and date will improve here. For now, all data is shown as sample content.",
      emptyTitle: "No published fairs found",
      emptyDescription:
        "Published fairs will be listed here after seeding or importing data.",
      noFilterResults: "No fairs found for these filters.",
      searchPlaceholder: "Search by fair name, city, venue, or organizer",
    },
    fairDetail: {
      notFoundTitle: "Fair not found",
      actionsTitle: "Fair actions",
      actionsDescription:
        "You can visit the official website or follow the fair to get reminders later.",
      followNote: "You will need to log in later to follow fairs and get reminders.",
      followComingSoon:
        "Follow functionality will be connected to your account in the next stage.",
      followingState: "You are following this fair.",
      followPrompt: "Follow this fair to receive upcoming reminders.",
    },
    loginPage: {
      title: "Log in",
      description:
        "Log in to follow fairs, receive reminders, and manage your profile.",
      emailPlaceholder: "name@example.com",
      submitPlaceholder: "Login flow coming soon",
      submit: "Log in",
      noAccount: "Don't have an account?",
      createAccount: "Create account",
    },
    registerPage: {
      title: "Create account",
      description:
        "Create a free account to follow fairs and receive reminders.",
      namePlaceholder: "Full Name",
      emailPlaceholder: "name@example.com",
      submitPlaceholder: "Registration flow coming soon",
      submit: "Sign up",
      haveAccount: "Already have an account?",
      passwordHelp: "Password must be at least 8 characters.",
      requiredFieldsNote: "Fields marked with * are required.",
      professionPlaceholder: "Select profession",
      phoneHelp: "Optional. Example: +90 532 123 45 67",
      alreadyHaveAccount: "I already have an account",
    },
    profilePage: {
      badge: "My profile",
      title: "Profile",
      description:
        "Your account details, followed fairs, and notification preferences will be managed here.",
      accountInfo: "Account information",
      followedFairs: "Followed fairs",
      followedFairsEmpty: "Session and follow features are not connected yet.",
      notificationPreferences: "Notification preferences",
      notificationDescription:
        "Manage how you want to be notified when the fairs you follow are approaching.",
      notificationEmail: "Email notifications",
      notificationInApp: "In-app notifications",
      notificationThirtyDays: "Remind me 30 days before",
      notificationSevenDays: "Remind me 7 days before",
      notificationOneDay: "Remind me 1 day before",
      notificationFairStarted: "Remind me when the fair starts",
      saveNotifications: "Save notification preferences",
      notificationUpdateSuccess:
        "Your notification preferences have been updated.",
      notificationUpdateError:
        "Something went wrong while updating notification preferences.",
      notificationChannelWarning:
        "No notification channel is selected. Choose at least one channel to receive reminders.",
      sendTestReminderEmail: "Send test reminder email",
      testReminderEmailSuccess: "Test reminder email has been sent.",
      testReminderEmailError:
        "Something went wrong while sending the test reminder email.",
      testReminderNoFollowedFairs:
        "Follow a fair before sending a test email.",
      editProfile: "Edit profile",
      noInterests: "You have not selected any interests yet.",
      editInterests: "Edit interests",
      updateSuccess: "Your profile has been updated.",
      updateError: "Something went wrong while updating your profile.",
      changePassword: "Change password",
      currentPassword: "Current password",
      newPassword: "New password",
      confirmNewPassword: "Confirm new password",
      updatePassword: "Update password",
      passwordUpdateSuccess: "Your password has been updated.",
      passwordUpdateError: "Something went wrong while updating your password.",
      currentPasswordIncorrect: "Current password is incorrect.",
      passwordMismatch: "New passwords do not match.",
      passwordTooShort: "New password must be at least 8 characters.",
      googlePasswordAccount:
        "This account was created with Google. Use your Google account to manage your password.",
      goToLogin: "Go to login",
    },
    followingPage: {
      eyebrow: "Follow list",
      title: "Following",
      description: "See the fairs you follow, sorted by date.",
      emptyTitle: "You are not following any fairs yet.",
    },
    interestsPage: {
      title: "My interests",
      description:
        "Choose the topics you are interested in so we can recommend better fairs.",
      save: "Save my interests",
      success: "Your interests have been updated.",
      emptyValidation: "Please select at least one interest.",
    },
    adminPage: {
      badge: "Admin",
      title: "Admin Panel",
      description: "Create, edit, and prepare fairs for publishing manually.",
      unauthorized: "You do not have permission to access this area.",
      fairManagement: "Fair Management",
      addFair: "Add new fair",
      editFair: "Edit fair",
      totalFairs: "Total fairs",
      publishedFairs: "Published fairs",
      draftFairs: "Draft fairs",
      archivedFairs: "Archived fairs",
      featuredFairs: "Featured fairs",
      istanbulPriorityFairs: "Istanbul priority fairs",
      searchPlaceholder: "Search by fair name, city, venue, or organizer",
      allStatuses: "All statuses",
      status: "Status",
      statusDRAFT: "Draft",
      statusPUBLISHED: "Published",
      statusUPDATED: "Updated",
      statusPOSTPONED: "Postponed",
      statusCANCELLED: "Cancelled",
      statusARCHIVED: "Archived",
      published: "Published",
      notPublished: "Not published",
      edit: "Edit",
      publish: "Publish",
      moveToDraft: "Move to draft",
      archive: "Archive",
      markFeatured: "Mark featured",
      removeFeatured: "Remove featured",
      istanbulPriority: "Istanbul priority",
      removeIstanbulPriority: "Remove Istanbul priority",
      categories: "Categories",
      subcategories: "Subcategories",
      updatedAt: "Updated",
      startDate: "Start date",
      endDate: "End date",
      descriptionField: "Description",
      district: "District",
      hall: "Hall",
      sourceName: "Source",
      sourceUrl: "Source URL",
      slugExists: "A fair with this slug already exists.",
    },
    footer: {
      tagline: "© 2026 fuarbul. Preparing to help you discover fairs in Turkey.",
    },
    notFound: {
      eyebrow: "404",
      title: "Page not found",
      description: "The fair or page you are looking for is not available yet.",
      backToFairs: "Back to fairs",
    },
    auth: {
      invalidCredentials: "Email or password is incorrect.",
      genericError: "Something went wrong. Please try again.",
      emailExists: "An account with this email already exists.",
      weakPassword: "Password must be at least 8 characters.",
      invalidEmail: "Enter a valid email address.",
      missingRequiredFields: "Please fill in the required fields.",
      invalidCity: "Please select a valid city.",
      invalidPhone: "Enter a valid Turkish mobile phone number.",
      invalidProfession: "Please select a valid profession.",
      alreadyLoggedIn: "You are already logged in.",
      switchAccountNote: "To switch accounts, please log out first.",
    },
    gender: {
      male: "Male",
      female: "Female",
      other: "Other",
      preferNotToSay: "Prefer not to say",
      unspecified: "No selection",
    },
  },
} as const;

type TranslationTree = (typeof translations)[Locale];

export type TranslationKey = {
  [Section in keyof TranslationTree]: {
    [Key in keyof TranslationTree[Section]]: `${Section & string}.${Key &
      string}`;
  }[keyof TranslationTree[Section]];
}[keyof TranslationTree];

export function formatFairCount(count: number, locale: Locale = defaultLocale) {
  return locale === "tr" ? `${count} fuar` : `${count} fairs`;
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getCategoryLabel(
  category: FairCategory,
  locale: Locale = defaultLocale,
) {
  return categoryLabels[locale][category];
}

export function translate(key: TranslationKey, locale: Locale = defaultLocale) {
  const [section, item] = key.split(".") as [
    keyof TranslationTree,
    keyof TranslationTree[keyof TranslationTree],
  ];

  const value = translations[locale][section]?.[item];

  return typeof value === "string" ? value : key;
}
