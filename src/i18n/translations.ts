export type Language = "de" | "en";

const translations = {
  // Auth
  "auth.login": { de: "Anmelden", en: "Sign In" },
  "auth.register": { de: "Registrieren", en: "Sign Up" },
  "auth.email": { de: "E-Mail-Adresse", en: "Email Address" },
  "auth.password": { de: "Passwort", en: "Password" },
  "auth.confirmPassword": { de: "Passwort bestätigen", en: "Confirm Password" },
  "auth.forgotPassword": { de: "Passwort vergessen?", en: "Forgot password?" },
  "auth.noAccount": { de: "Noch kein Konto?", en: "Don't have an account?" },
  "auth.hasAccount": { de: "Bereits ein Konto?", en: "Already have an account?" },
  "auth.logout": { de: "Abmelden", en: "Log Out" },

  // Navigation
  "nav.dashboard": { de: "Übersicht", en: "Dashboard" },
  "nav.receipts": { de: "Belege", en: "Receipts" },
  "nav.companies": { de: "Unternehmen", en: "Companies" },
  "nav.expenseReport": { de: "Reisekostenabrechnung", en: "Expense Report" },
  "nav.settings": { de: "Einstellungen", en: "Settings" },

  // Dashboard
  "dashboard.title": { de: "Übersicht", en: "Dashboard" },
  "dashboard.totalReceipts": { de: "Belege gesamt", en: "Total Receipts" },
  "dashboard.thisMonth": { de: "Diesen Monat", en: "This Month" },
  "dashboard.totalAmount": { de: "Gesamtbetrag", en: "Total Amount" },
  "dashboard.companies": { de: "Unternehmen", en: "Companies" },
  "dashboard.recentReceipts": { de: "Letzte Belege", en: "Recent Receipts" },

  // Receipts
  "receipts.title": { de: "Belege", en: "Receipts" },
  "receipts.scan": { de: "Beleg scannen", en: "Scan Receipt" },
  "receipts.upload": { de: "Hochladen", en: "Upload" },
  "receipts.camera": { de: "Kamera", en: "Camera" },
  "receipts.date": { de: "Datum", en: "Date" },
  "receipts.amount": { de: "Betrag", en: "Amount" },
  "receipts.company": { de: "Unternehmen", en: "Company" },
  "receipts.description": { de: "Beschreibung", en: "Description" },
  "receipts.status": { de: "Status", en: "Status" },
  "receipts.person": { de: "Getroffene Person", en: "Person Met" },
  "receipts.organization": { de: "Unternehmung/Organisation", en: "Organization" },
  "receipts.meetingPurpose": { de: "Zweck des Meetings", en: "Meeting Purpose" },
  "receipts.assignCompany": { de: "GmbH zuordnen", en: "Assign Company" },
  "receipts.noReceipts": { de: "Noch keine Belege vorhanden", en: "No receipts yet" },
  "receipts.details": { de: "Details", en: "Details" },
  "receipts.save": { de: "Speichern", en: "Save" },
  "receipts.delete": { de: "Löschen", en: "Delete" },
  "receipts.scanHint": { de: "Beleg fotografieren oder PDF hochladen", en: "Take a photo or upload a PDF" },

  // Companies
  "companies.title": { de: "Unternehmen (GmbHs)", en: "Companies" },
  "companies.add": { de: "Unternehmen hinzufügen", en: "Add Company" },
  "companies.name": { de: "Firmenname", en: "Company Name" },
  "companies.taxId": { de: "Steuernummer", en: "Tax ID" },
  "companies.address": { de: "Adresse", en: "Address" },
  "companies.noCompanies": { de: "Noch keine Unternehmen angelegt", en: "No companies yet" },
  "companies.edit": { de: "Bearbeiten", en: "Edit" },

  // Expense Report
  "expense.title": { de: "Reisekostenabrechnung", en: "Travel Expense Report" },
  "expense.generate": { de: "Abrechnung erstellen", en: "Generate Report" },
  "expense.period": { de: "Zeitraum", en: "Period" },
  "expense.from": { de: "Von", en: "From" },
  "expense.to": { de: "Bis", en: "To" },
  "expense.export": { de: "Exportieren", en: "Export" },

  // General
  "general.save": { de: "Speichern", en: "Save" },
  "general.cancel": { de: "Abbrechen", en: "Cancel" },
  "general.delete": { de: "Löschen", en: "Delete" },
  "general.edit": { de: "Bearbeiten", en: "Edit" },
  "general.search": { de: "Suchen...", en: "Search..." },
  "general.loading": { de: "Laden...", en: "Loading..." },
  "general.language": { de: "Sprache", en: "Language" },
  "general.german": { de: "Deutsch", en: "German" },
  "general.english": { de: "Englisch", en: "English" },

  // App
  "app.name": { de: "BelegManager", en: "ReceiptManager" },
  "app.tagline": { de: "Belege erfassen, verwalten und abrechnen", en: "Capture, manage and report expenses" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key]?.[lang] ?? key;
}

export default translations;
