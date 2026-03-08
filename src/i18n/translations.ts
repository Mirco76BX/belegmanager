export type Language = "de" | "en" | "tr" | "ar" | "ru";

const translations = {
  // Auth
  "auth.login": { de: "Anmelden", en: "Sign In", tr: "Giriş Yap", ar: "تسجيل الدخول", ru: "Войти" },
  "auth.register": { de: "Registrieren", en: "Sign Up", tr: "Kayıt Ol", ar: "إنشاء حساب", ru: "Регистрация" },
  "auth.email": { de: "E-Mail-Adresse", en: "Email Address", tr: "E-posta Adresi", ar: "عنوان البريد الإلكتروني", ru: "Электронная почта" },
  "auth.password": { de: "Passwort", en: "Password", tr: "Şifre", ar: "كلمة المرور", ru: "Пароль" },
  "auth.confirmPassword": { de: "Passwort bestätigen", en: "Confirm Password", tr: "Şifreyi Onayla", ar: "تأكيد كلمة المرور", ru: "Подтвердить пароль" },
  "auth.forgotPassword": { de: "Passwort vergessen?", en: "Forgot password?", tr: "Şifremi unuttum?", ar: "نسيت كلمة المرور؟", ru: "Забыли пароль?" },
  "auth.noAccount": { de: "Noch kein Konto?", en: "Don't have an account?", tr: "Hesabınız yok mu?", ar: "ليس لديك حساب؟", ru: "Нет аккаунта?" },
  "auth.hasAccount": { de: "Bereits ein Konto?", en: "Already have an account?", tr: "Zaten hesabınız var mı?", ar: "لديك حساب بالفعل؟", ru: "Уже есть аккаунт?" },
  "auth.logout": { de: "Abmelden", en: "Log Out", tr: "Çıkış Yap", ar: "تسجيل الخروج", ru: "Выйти" },

  // Navigation
  "nav.dashboard": { de: "Übersicht", en: "Dashboard", tr: "Genel Bakış", ar: "لوحة التحكم", ru: "Обзор" },
  "nav.receipts": { de: "Belege", en: "Receipts", tr: "Fişler", ar: "الإيصالات", ru: "Чеки" },
  "nav.companies": { de: "Orga", en: "Orgs", tr: "Kuruluşlar", ar: "المنظمات", ru: "Орг." },
  "nav.expenseReport": { de: "Report", en: "Report", tr: "Rapor", ar: "تقرير", ru: "Отчёт" },
  "nav.pricing": { de: "Preise", en: "Pricing", tr: "Fiyatlar", ar: "الأسعار", ru: "Тарифы" },
  "nav.settings": { de: "Einstellungen", en: "Settings", tr: "Ayarlar", ar: "الإعدادات", ru: "Настройки" },

  // Dashboard
  "dashboard.title": { de: "Übersicht", en: "Dashboard", tr: "Genel Bakış", ar: "لوحة التحكم", ru: "Обзор" },
  "dashboard.totalReceipts": { de: "Belege gesamt", en: "Total Receipts", tr: "Toplam Fiş", ar: "إجمالي الإيصالات", ru: "Всего чеков" },
  "dashboard.thisMonth": { de: "Diesen Monat", en: "This Month", tr: "Bu Ay", ar: "هذا الشهر", ru: "Этот месяц" },
  "dashboard.totalAmount": { de: "Gesamtbetrag", en: "Total Amount", tr: "Toplam Tutar", ar: "المبلغ الإجمالي", ru: "Общая сумма" },
  "dashboard.companies": { de: "Organisationen", en: "Organizations", tr: "Kuruluşlar", ar: "المنظمات", ru: "Организации" },
  "dashboard.recentReceipts": { de: "Letzte Belege", en: "Recent Receipts", tr: "Son Fişler", ar: "الإيصالات الأخيرة", ru: "Последние чеки" },

  // Receipts
  "receipts.title": { de: "Belege", en: "Receipts", tr: "Fişler", ar: "الإيصالات", ru: "Чеки" },
  "receipts.scan": { de: "Beleg scannen", en: "Scan Receipt", tr: "Fiş Tara", ar: "مسح الإيصال", ru: "Сканировать чек" },
  "receipts.upload": { de: "Hochladen", en: "Upload", tr: "Yükle", ar: "تحميل", ru: "Загрузить" },
  "receipts.camera": { de: "Kamera", en: "Camera", tr: "Kamera", ar: "الكاميرا", ru: "Камера" },
  "receipts.date": { de: "Datum", en: "Date", tr: "Tarih", ar: "التاريخ", ru: "Дата" },
  "receipts.amount": { de: "Betrag (inkl. MwSt.)", en: "Amount (incl. VAT)", tr: "Tutar (KDV dahil)", ar: "المبلغ (شامل الضريبة)", ru: "Сумма (с НДС)" },
  "receipts.company": { de: "Organisation", en: "Organization", tr: "Kuruluş", ar: "المنظمة", ru: "Организация" },
  "receipts.description": { de: "Beschreibung", en: "Description", tr: "Açıklama", ar: "الوصف", ru: "Описание" },
  "receipts.status": { de: "Status", en: "Status", tr: "Durum", ar: "الحالة", ru: "Статус" },
  "receipts.person": { de: "Getroffene Person", en: "Person Met", tr: "Görüşülen Kişi", ar: "الشخص الملتقى", ru: "Встреча с" },
  "receipts.organization": { de: "Unternehmung/Organisation", en: "Organization", tr: "İşletme/Kuruluş", ar: "المؤسسة/المنظمة", ru: "Предприятие/Организация" },
  "receipts.meetingPurpose": { de: "Zweck des Meetings", en: "Meeting Purpose", tr: "Toplantı Amacı", ar: "غرض الاجتماع", ru: "Цель встречи" },
  "receipts.assignCompany": { de: "Organisation zuordnen", en: "Assign Organization", tr: "Kuruluş Ata", ar: "تعيين المنظمة", ru: "Назначить организацию" },
  "receipts.noReceipts": { de: "Noch keine Belege vorhanden", en: "No receipts yet", tr: "Henüz fiş yok", ar: "لا توجد إيصالات بعد", ru: "Чеков пока нет" },
  "receipts.details": { de: "Details", en: "Details", tr: "Detaylar", ar: "التفاصيل", ru: "Детали" },
  "receipts.save": { de: "Speichern", en: "Save", tr: "Kaydet", ar: "حفظ", ru: "Сохранить" },
  "receipts.delete": { de: "Löschen", en: "Delete", tr: "Sil", ar: "حذف", ru: "Удалить" },
  "receipts.scanHint": { de: "Beleg fotografieren oder PDF hochladen", en: "Take a photo or upload a PDF", tr: "Fotoğraf çekin veya PDF yükleyin", ar: "التقط صورة أو حمّل ملف PDF", ru: "Сфотографируйте или загрузите PDF" },

  // Companies
  "companies.title": { de: "Organisationen", en: "Organizations", tr: "Kuruluşlar", ar: "المنظمات", ru: "Организации" },
  "companies.add": { de: "Organisation hinzufügen", en: "Add Organization", tr: "Kuruluş Ekle", ar: "إضافة منظمة", ru: "Добавить организацию" },
  "companies.name": { de: "Name", en: "Name", tr: "Ad", ar: "الاسم", ru: "Название" },
  "companies.taxId": { de: "Steuernummer", en: "Tax ID", tr: "Vergi No", ar: "الرقم الضريبي", ru: "ИНН" },
  "companies.address": { de: "Adresse", en: "Address", tr: "Adres", ar: "العنوان", ru: "Адрес" },
  "companies.noCompanies": { de: "Noch keine Organisationen angelegt", en: "No organizations yet", tr: "Henüz kuruluş eklenmedi", ar: "لا توجد منظمات بعد", ru: "Организаций пока нет" },
  "companies.edit": { de: "Bearbeiten", en: "Edit", tr: "Düzenle", ar: "تعديل", ru: "Редактировать" },
  "companies.type": { de: "Typ", en: "Type", tr: "Tür", ar: "النوع", ru: "Тип" },
  "companies.type.company": { de: "Firma", en: "Company", tr: "Şirket", ar: "شركة", ru: "Компания" },
  "companies.type.association": { de: "Verein", en: "Association", tr: "Dernek", ar: "جمعية", ru: "Объединение" },
  "companies.type.personal": { de: "Privat", en: "Personal", tr: "Kişisel", ar: "شخصي", ru: "Личное" },
  "companies.type.tax": { de: "Steuerbeleg", en: "Tax Document", tr: "Vergi Belgesi", ar: "مستند ضريبي", ru: "Налоговый документ" },
  "companies.type.health_insurance": { de: "Krankenkasse", en: "Health Insurance", tr: "Sağlık Sigortası", ar: "التأمين الصحي", ru: "Мед. страховка" },
  "companies.type.other": { de: "Sonstiges", en: "Other", tr: "Diğer", ar: "أخرى", ru: "Прочее" },

  // Expense Report
  "expense.title": { de: "Reisekostenabrechnung", en: "Travel Expense Report", tr: "Seyahat Masraf Raporu", ar: "تقرير مصاريف السفر", ru: "Отчёт о командировочных" },
  "expense.generate": { de: "Abrechnung erstellen", en: "Generate Report", tr: "Rapor Oluştur", ar: "إنشاء التقرير", ru: "Создать отчёт" },
  "expense.period": { de: "Zeitraum", en: "Period", tr: "Dönem", ar: "الفترة", ru: "Период" },
  "expense.from": { de: "Von", en: "From", tr: "Başlangıç", ar: "من", ru: "С" },
  "expense.to": { de: "Bis", en: "To", tr: "Bitiş", ar: "إلى", ru: "По" },
  "expense.export": { de: "Exportieren", en: "Export", tr: "Dışa Aktar", ar: "تصدير", ru: "Экспорт" },

  // General
  "general.save": { de: "Speichern", en: "Save", tr: "Kaydet", ar: "حفظ", ru: "Сохранить" },
  "general.cancel": { de: "Abbrechen", en: "Cancel", tr: "İptal", ar: "إلغاء", ru: "Отмена" },
  "general.delete": { de: "Löschen", en: "Delete", tr: "Sil", ar: "حذف", ru: "Удалить" },
  "general.edit": { de: "Bearbeiten", en: "Edit", tr: "Düzenle", ar: "تعديل", ru: "Редактировать" },
  "general.search": { de: "Suchen...", en: "Search...", tr: "Ara...", ar: "بحث...", ru: "Поиск..." },
  "general.loading": { de: "Laden...", en: "Loading...", tr: "Yükleniyor...", ar: "جارٍ التحميل...", ru: "Загрузка..." },
  "general.language": { de: "Sprache", en: "Language", tr: "Dil", ar: "اللغة", ru: "Язык" },
  "general.german": { de: "Deutsch", en: "German", tr: "Almanca", ar: "الألمانية", ru: "Немецкий" },
  "general.english": { de: "Englisch", en: "English", tr: "İngilizce", ar: "الإنجليزية", ru: "Английский" },

  // App
  "app.name": { de: "BelegManager", en: "ReceiptManager", tr: "FişYöneticisi", ar: "مدير الإيصالات", ru: "ЧекМенеджер" },
  "app.tagline": { de: "Belege erfassen, verwalten und abrechnen", en: "Capture, manage and report expenses", tr: "Fişleri kaydedin, yönetin ve raporlayın", ar: "التقط وأدر وأبلغ عن المصاريف", ru: "Сканируйте, управляйте и отчитывайтесь" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key]?.[lang] ?? translations[key]?.["en"] ?? key;
}

export default translations;
