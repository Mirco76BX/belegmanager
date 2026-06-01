import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { Plus, Trash2, Save, X, AlertTriangle } from "lucide-react";

/**
 * VatItemsEditor — vollwertiger Multi-MwSt-Positionen-Editor.
 *
 * Funktionen:
 * - Add/Edit/Delete von receipt_vat_items
 * - Live-Berechnung Netto/Brutto/MwSt pro Position (User gibt Brutto + Satz ein,
 *   Netto und VAT werden berechnet)
 * - Diskrepanz-Warnung gegen receipt.amount_eur
 * - GoBD-konformer Audit-Log: jede Insert/Update/Delete wird in receipt_changes geloggt
 *
 * Wird NICHT verwendet wenn der Beleg festgeschrieben ist (parent muss das prüfen).
 */

export interface VatItem {
  id: string;
  label: string | null;
  net_amount: number | null;
  vat_rate: number;
  vat_amount: number;
}

// Für lokale State-Verwaltung — leere Items haben null id und werden beim Speichern als INSERT behandelt.
interface DraftItem {
  id: string | null;            // null = neu hinzugefügt, noch nicht in DB
  originalId: string | null;    // = id wenn aus DB geladen, für Audit-Log
  label: string;
  vat_rate: number;
  brutto: string;               // String für Eingabe-Komfort
  // berechnet:
  net_amount: number;
  vat_amount: number;
}

const VAT_RATE_OPTIONS = [0, 7, 19] as const;

function calcFromBrutto(bruttoStr: string, rate: number): { net: number; vat: number } {
  const brutto = parseFloat(bruttoStr.replace(",", ".")) || 0;
  const net = brutto / (1 + rate / 100);
  const vat = brutto - net;
  return { net: Math.round(net * 100) / 100, vat: Math.round(vat * 100) / 100 };
}

function toDraft(item: VatItem): DraftItem {
  const net = item.net_amount ?? 0;
  const vat = item.vat_amount;
  const brutto = (net + vat).toFixed(2);
  return {
    id: item.id,
    originalId: item.id,
    label: item.label || "",
    vat_rate: item.vat_rate,
    brutto,
    net_amount: net,
    vat_amount: vat,
  };
}

function emptyDraft(defaultRate = 19): DraftItem {
  return {
    id: null,
    originalId: null,
    label: "",
    vat_rate: defaultRate,
    brutto: "",
    net_amount: 0,
    vat_amount: 0,
  };
}

export default function VatItemsEditor({
  receiptId,
  userId,
  initialItems,
  receiptBrutto,
  defaultVatRate = 19,
  onClose,
  onSaved,
}: {
  receiptId: string;
  userId: string;
  initialItems: VatItem[];
  receiptBrutto: number;
  defaultVatRate?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tt } = useLanguage();
  const [drafts, setDrafts] = useState<DraftItem[]>(() => initialItems.map(toDraft));
  const [saving, setSaving] = useState(false);

  // Wenn initial leer, eine erste Position vorbelegen
  useEffect(() => {
    if (drafts.length === 0) {
      setDrafts([emptyDraft(defaultVatRate)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDraft = (idx: number, patch: Partial<DraftItem>) => {
    setDrafts((prev) => {
      const next = [...prev];
      const merged = { ...next[idx], ...patch };
      // Wenn Brutto oder Rate geändert wurde → recalc
      if ("brutto" in patch || "vat_rate" in patch) {
        const { net, vat } = calcFromBrutto(merged.brutto, merged.vat_rate);
        merged.net_amount = net;
        merged.vat_amount = vat;
      }
      next[idx] = merged;
      return next;
    });
  };

  const addDraft = () => {
    setDrafts((prev) => [...prev, emptyDraft(defaultVatRate)]);
  };

  const removeDraft = (idx: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const sumBrutto = drafts.reduce((s, d) => s + d.net_amount + d.vat_amount, 0);
  const sumVat = drafts.reduce((s, d) => s + d.vat_amount, 0);
  const diff = sumBrutto - receiptBrutto;
  const isMismatch = Math.abs(diff) > 0.02;

  const handleSave = async () => {
    // Validierung
    if (drafts.length === 0) {
      toast({
        title: tt({ de: "Keine Positionen", en: "No items" }),
        description: tt({
          de: "Bitte mind. eine Position hinzufügen oder den Dialog abbrechen.",
          en: "Please add at least one item or cancel.",
        }),
        variant: "destructive",
      });
      return;
    }
    for (const d of drafts) {
      if (d.net_amount + d.vat_amount <= 0) {
        toast({
          title: tt({ de: "Ungültiger Betrag", en: "Invalid amount" }),
          description: tt({
            de: "Jede Position braucht einen Brutto-Betrag > 0.",
            en: "Every item needs a gross amount > 0.",
          }),
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);

    // Diff bestimmen: was wird gelöscht, was geupdated, was neu eingefügt
    const originalIds = new Set(initialItems.map((i) => i.id));
    const remainingIds = new Set(drafts.filter((d) => d.originalId).map((d) => d.originalId as string));
    const toDelete = initialItems.filter((i) => !remainingIds.has(i.id));
    const toUpdate = drafts.filter((d) => d.originalId && originalIds.has(d.originalId));
    const toInsert = drafts.filter((d) => !d.originalId);

    // GoBD Audit-Log VOR DB-Änderungen vorbereiten
    const auditRows: Array<{ receipt_id: string; user_id: string; field_name: string; old_value: string | null; new_value: string | null; change_type: string }> = [];

    for (const item of toDelete) {
      auditRows.push({
        receipt_id: receiptId,
        user_id: userId,
        field_name: `vat_item:${item.vat_rate}%`,
        old_value: `${item.vat_amount.toFixed(2)}€ (label: ${item.label || "–"})`,
        new_value: null,
        change_type: "delete",
      });
    }
    for (const d of toUpdate) {
      const orig = initialItems.find((i) => i.id === d.originalId)!;
      const oldStr = `${orig.vat_amount.toFixed(2)}€ @ ${orig.vat_rate}% (label: ${orig.label || "–"})`;
      const newStr = `${d.vat_amount.toFixed(2)}€ @ ${d.vat_rate}% (label: ${d.label || "–"})`;
      if (oldStr !== newStr) {
        auditRows.push({
          receipt_id: receiptId,
          user_id: userId,
          field_name: `vat_item:${orig.vat_rate}%`,
          old_value: oldStr,
          new_value: newStr,
          change_type: "edit",
        });
      }
    }
    for (const d of toInsert) {
      auditRows.push({
        receipt_id: receiptId,
        user_id: userId,
        field_name: `vat_item:${d.vat_rate}%`,
        old_value: null,
        new_value: `${d.vat_amount.toFixed(2)}€ @ ${d.vat_rate}% (label: ${d.label || "–"})`,
        change_type: "create",
      });
    }

    // Audit-Log schreiben — bei Fehler abbrechen (GoBD: keine stille Änderung)
    if (auditRows.length > 0) {
      const { error: auditErr } = await supabase.from("receipt_changes").insert(auditRows);
      if (auditErr) {
        toast({
          title: tt({ de: "Audit-Log fehlgeschlagen", en: "Audit log failed" }),
          description: auditErr.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    // DB-Operationen
    try {
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("receipt_vat_items")
          .delete()
          .in("id", toDelete.map((i) => i.id));
        if (error) throw error;
      }
      for (const d of toUpdate) {
        const { error } = await supabase
          .from("receipt_vat_items")
          .update({
            label: d.label || null,
            vat_rate: d.vat_rate,
            vat_amount: d.vat_amount,
            net_amount: d.net_amount,
          })
          .eq("id", d.originalId!);
        if (error) throw error;
      }
      if (toInsert.length > 0) {
        const rows = toInsert.map((d) => ({
          receipt_id: receiptId,
          label: d.label || null,
          vat_rate: d.vat_rate,
          vat_amount: d.vat_amount,
          net_amount: d.net_amount,
        }));
        const { error } = await supabase.from("receipt_vat_items").insert(rows);
        if (error) throw error;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: msg, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({
      title: tt({ de: "MwSt-Positionen gespeichert", en: "VAT items saved" }),
      description: auditRows.length > 0
        ? tt({
          de: `${auditRows.length} Änderung(en) im Audit-Log dokumentiert.`,
          en: `${auditRows.length} change(s) logged in audit trail.`,
        })
        : undefined,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {tt({ de: "MwSt-Positionen bearbeiten", en: "Edit VAT items" })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {drafts.map((d, idx) => (
          <div key={idx} className="rounded-md border bg-background p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {tt({ de: "Position", en: "Item" })} {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeDraft(idx)}
                className="text-destructive hover:text-destructive/80 p-1"
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label htmlFor={`label-${idx}`} className="text-[11px]">
                  {tt({ de: "Bezeichnung (optional)", en: "Label (optional)" })}
                </Label>
                <Input
                  id={`label-${idx}`}
                  value={d.label}
                  onChange={(e) => updateDraft(idx, { label: e.target.value })}
                  placeholder={tt({ de: "z.B. Speisen, Getränke", en: "e.g. food, drinks" })}
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <Label className="text-[11px]">{tt({ de: "MwSt-Satz", en: "VAT rate" })}</Label>
                <Select
                  value={d.vat_rate.toString()}
                  onValueChange={(v) => updateDraft(idx, { vat_rate: parseFloat(v) })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`brutto-${idx}`} className="text-[11px]">
                  {tt({ de: "Brutto €", en: "Gross €" })}
                </Label>
                <Input
                  id={`brutto-${idx}`}
                  type="text"
                  inputMode="decimal"
                  value={d.brutto}
                  onChange={(e) => updateDraft(idx, { brutto: e.target.value })}
                  placeholder="0,00"
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground flex justify-between pt-0.5">
              <span>Netto: <span className="font-mono">{d.net_amount.toFixed(2)} €</span></span>
              <span>MwSt: <span className="font-mono">{d.vat_amount.toFixed(2)} €</span></span>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addDraft}
        className="w-full text-xs gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        {tt({ de: "Position hinzufügen", en: "Add item" })}
      </Button>

      {/* Summen + Diskrepanz-Check */}
      <div className="rounded-md bg-background p-2.5 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tt({ de: "Summe Brutto Positionen", en: "Sum gross items" })}</span>
          <span className="font-mono font-semibold">{sumBrutto.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tt({ de: "Summe MwSt", en: "Sum VAT" })}</span>
          <span className="font-mono">{sumVat.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span className="text-muted-foreground">{tt({ de: "Beleg-Brutto", en: "Receipt gross" })}</span>
          <span className="font-mono">{receiptBrutto.toFixed(2)} €</span>
        </div>
        <div className={`flex justify-between font-semibold ${isMismatch ? "text-destructive" : "text-green-700 dark:text-green-400"}`}>
          <span>{tt({ de: "Differenz", en: "Difference" })}</span>
          <span className="font-mono">{diff >= 0 ? "+" : ""}{diff.toFixed(2)} €</span>
        </div>
        {isMismatch && (
          <div className="flex items-start gap-1.5 pt-1 text-destructive text-[11px]">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {tt({
                de: "Solange Differenz > 0,02 € besteht, blockt der DATEV-Export. Korrigiere Positionen oder Beleg-Brutto.",
                en: "While diff > 0.02 €, DATEV export is blocked. Fix items or receipt gross.",
              })}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="flex-1">
          {tt({ de: "Abbrechen", en: "Cancel" })}
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? tt({ de: "Speichere…", en: "Saving…" }) : tt({ de: "Speichern", en: "Save" })}
        </Button>
      </div>
    </div>
  );
}
