import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Check, X, Eye } from "lucide-react";

const PURPOSE_PRESETS = [
  { value: "Geschäftsessen", de: "🍽️ Geschäftsessen", en: "🍽️ Business meal" },
  { value: "Akquise", de: "🤝 Akquise", en: "🤝 Acquisition" },
  { value: "Büromaterial", de: "📎 Büromaterial", en: "📎 Office supplies" },
  { value: "Reisekosten", de: "✈️ Reisekosten", en: "✈️ Travel expenses" },
  { value: "Fortbildung", de: "📚 Fortbildung", en: "📚 Training" },
  { value: "Bewirtung", de: "🥂 Bewirtung", en: "🥂 Hospitality" },
  { value: "Telefon/Internet", de: "📱 Telefon/Internet", en: "📱 Phone/Internet" },
];
interface Receipt {
  id: string;
  date: string;
  amount: number | null;
  currency?: string;
  description: string | null;
  person_met: string | null;
  organization: string | null;
  meeting_purpose: string | null;
  file_path: string | null;
  status: string;
  company_id: string | null;
  created_at: string;
  receipt_type?: string;
  license_plate?: string | null;
  mileage?: number | null;
  vat_amount?: number | null;
  vat_rate?: number | null;
  amount_eur?: number | null;
}

interface Company {
  id: string;
  name: string;
}

interface Props {
  receipts: Receipt[];
  companies: Company[];
  onDelete: (id: string, filePath: string | null) => void;
  onOpenDetail: (r: Receipt) => void;
  onSaved: () => void;
}

const ReceiptsInlineTable = ({ receipts, companies, onDelete, onOpenDetail, onSaved }: Props) => {
  const { lang, tt } = useLanguage();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Receipt>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = (r: Receipt) => {
    setEditingId(r.id);
    setEditValues({
      date: r.date, amount: r.amount, description: r.description,
      person_met: r.person_met, organization: r.organization,
      meeting_purpose: r.meeting_purpose, company_id: r.company_id,
      receipt_type: r.receipt_type, license_plate: r.license_plate, mileage: r.mileage,
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const isFuel = editValues.receipt_type === "fuel";
    const updateData: any = {
      company_id: editValues.company_id || null,
      status: "complete",
    };
    if (isFuel) {
      updateData.license_plate = editValues.license_plate || null;
      updateData.mileage = editValues.mileage ?? null;
    } else {
      updateData.person_met = editValues.person_met || null;
      updateData.organization = editValues.organization || null;
      updateData.meeting_purpose = editValues.meeting_purpose || null;
    }

    const { error } = await supabase.from("receipts").update(updateData).eq("id", id);

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: tt({de:"Gespeichert", en:"Saved", tr:"Kaydedildi", ar:"تم الحفظ", ru:"Сохранено"}) });
      setEditingId(null);
      onSaved();
    }
    setSaving(false);
  };

  const formatAmount = (a: number | null, currency?: string) => {
    if (a == null) return "–";
    const sym = currency && currency !== "EUR" ? ` ${currency}` : " €";
    return `${a.toFixed(2)}${sym}`;
  };
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "–";
  const isEditing = (id: string) => editingId === id;
  const locale = getLocale(lang);

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead>{tt({de:"Datum", en:"Date", tr:"Tarih", ar:"التاريخ", ru:"Дата"})}</TableHead>
          <TableHead>{tt({de:"Betrag (inkl. MwSt.)", en:"Amount (incl. VAT)", tr:"Tutar (KDV dahil)", ar:"المبلغ (شامل الضريبة)", ru:"Сумма (с НДС)"})}</TableHead>
          <TableHead>{tt({de:"Beschreibung", en:"Description", tr:"Açıklama", ar:"الوصف", ru:"Описание"})}</TableHead>
          <TableHead>{tt({de:"Organisation", en:"Company", tr:"Kuruluş", ar:"المنظمة", ru:"Организация"})}</TableHead>
          <TableHead>{tt({de:"Details", en:"Details", tr:"Detaylar", ar:"التفاصيل", ru:"Детали"})}</TableHead>
          <TableHead className="text-right">{tt({de:"Aktionen", en:"Actions", tr:"İşlemler", ar:"الإجراءات", ru:"Действия"})}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {receipts.map((r) => {
          const isFuel = r.receipt_type === "fuel";
          return (
          <TableRow
            key={r.id}
            className={isEditing(r.id) ? "bg-primary/5 border-l-2 border-l-primary" : "cursor-pointer hover:bg-muted/50"}
            onClick={() => !isEditing(r.id) && startEdit(r)}
          >
            {isEditing(r.id) ? (
              <>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(r.date).toLocaleDateString(locale)}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                  {formatAmount(r.amount, r.currency)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {r.description || "–"}
                </TableCell>
                <TableCell>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={editValues.company_id || ""}
                      onValueChange={(val) => setEditValues(v => ({ ...v, company_id: val }))}
                    >
                      <SelectTrigger className="h-9 text-sm w-[150px] bg-background border-input shadow-sm focus:ring-2 focus:ring-ring">
                        <SelectValue placeholder="–" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="max-h-48">
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  {isFuel ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editValues.license_plate || ""}
                        onChange={(e) => setEditValues(v => ({ ...v, license_plate: e.target.value }))}
                        className="h-9 text-sm w-[110px] bg-background shadow-sm"
                        placeholder={tt({de:"Kennzeichen", en:"Plate", tr:"Plaka", ar:"لوحة", ru:"Номер"})}
                      />
                      <Input
                        type="number"
                        value={editValues.mileage ?? ""}
                        onChange={(e) => setEditValues(v => ({ ...v, mileage: e.target.value ? parseFloat(e.target.value) : null }))}
                        className="h-9 text-sm w-[100px] bg-background shadow-sm"
                        placeholder="km"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Input
                          value={editValues.person_met || ""}
                          onChange={(e) => setEditValues(v => ({ ...v, person_met: e.target.value }))}
                          className="h-9 text-sm w-[130px] bg-background shadow-sm"
                          placeholder={tt({de:"Person…", en:"Person…", tr:"Kişi…", ar:"شخص…", ru:"Человек…"})}
                        />
                        <Input
                          value={editValues.meeting_purpose || ""}
                          onChange={(e) => setEditValues(v => ({ ...v, meeting_purpose: e.target.value }))}
                          className="h-9 text-sm w-[130px] bg-background shadow-sm"
                          placeholder={tt({de:"Zweck…", en:"Purpose…", tr:"Amaç…", ar:"الغرض…", ru:"Цель…"})}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {PURPOSE_PRESETS.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setEditValues(v => ({ ...v, meeting_purpose: p.value }))}
                            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                              editValues.meeting_purpose === p.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                            }`}
                          >
                            {lang === "de" ? p.de : p.en}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => saveEdit(r.id)} disabled={saving}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </>
            ) : (
              <>
                <TableCell className="whitespace-nowrap">{new Date(r.date).toLocaleDateString(locale)}</TableCell>
                <TableCell className="font-mono whitespace-nowrap">{formatAmount(r.amount, r.currency)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.description || "–"}</TableCell>
                <TableCell>{companyName(r.company_id)}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {isFuel ? (
                    <span className="text-sm">
                      {r.license_plate && <span>🚗 {r.license_plate}</span>}
                      {r.license_plate && r.mileage != null && <span className="mx-1">·</span>}
                      {r.mileage != null && <span>{r.mileage.toLocaleString()} km</span>}
                      {!r.license_plate && r.mileage == null && "–"}
                    </span>
                  ) : (
                    <span className="text-sm">
                      {r.person_met || r.meeting_purpose || "–"}
                      {r.person_met && r.meeting_purpose && ` · ${r.meeting_purpose}`}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onOpenDetail(r)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(r.id, r.file_path)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </>
            )}
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
};

export default ReceiptsInlineTable;
