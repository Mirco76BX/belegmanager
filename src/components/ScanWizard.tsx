import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, Loader2, Check, SkipForward, ArrowRight, Plus } from "lucide-react";

interface ScanResult {
  date: string | null;
  amount: number | null;
  description: string | null;
  vendor: string | null;
  tax_amount: number | null;
  items: string[];
}

interface Company {
  id: string;
  name: string;
}

interface ScanWizardProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companies: Company[];
  defaultCompanyId: string | null;
  onCompaniesChanged?: () => void;
}

const ScanWizard = ({ open, onClose, onSaved, companies, defaultCompanyId, onCompaniesChanged }: ScanWizardProps) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "scanning" | "company" | "details">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState(defaultCompanyId || "");
  const [personMet, setPersonMet] = useState("");
  const [organization, setOrganization] = useState("");
  const [meetingPurpose, setMeetingPurpose] = useState("");

  // Inline new company
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [localCompanies, setLocalCompanies] = useState<Company[]>(companies);

  // Sync companies prop
  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("upload");
      setFile(null);
      setPreview(null);
      setScanResult(null);
      setDate("");
      setAmount("");
      setDescription("");
      setCompanyId(defaultCompanyId || "");
      setPersonMet("");
      setOrganization("");
      setMeetingPurpose("");
      setShowNewCompany(false);
      setNewCompanyName("");
    }
  }, [open, defaultCompanyId]);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);

    setStep("scanning");

    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(selectedFile);
      });

      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      setScanResult(data);
      if (data.date) setDate(data.date);
      if (data.amount) setAmount(String(data.amount));
      if (data.description || data.vendor) {
        setDescription([data.vendor, data.description].filter(Boolean).join(" – "));
      }

      setStep("company");
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({
        title: lang === "de" ? "Scan fehlgeschlagen. Daten manuell eingeben." : "Scan failed. Enter data manually.",
        variant: "destructive",
      });
      setDate(new Date().toISOString().split("T")[0]);
      setStep("company");
    }
  };

  const handleCreateCompany = async () => {
    if (!user || !newCompanyName.trim()) return;
    setCreatingCompany(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .insert({ name: newCompanyName.trim(), user_id: user.id })
        .select("id, name")
        .single();

      if (error) throw error;

      setLocalCompanies((prev) => [...prev, data]);
      setCompanyId(data.id);
      setShowNewCompany(false);
      setNewCompanyName("");
      onCompaniesChanged?.();

      toast({ title: lang === "de" ? "Organisation erstellt!" : "Organization created!" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleSave = async (skipDetails = false) => {
    if (!user || !file) return;
    setSaving(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("receipts").insert({
        user_id: user.id,
        date: date || new Date().toISOString().split("T")[0],
        amount: amount ? parseFloat(amount) : null,
        description: description || null,
        company_id: companyId || null,
        person_met: skipDetails ? null : personMet || null,
        organization: skipDetails ? null : organization || null,
        meeting_purpose: skipDetails ? null : meetingPurpose || null,
        file_path: path,
        status: skipDetails ? "pending" : "complete",
      });

      if (error) throw error;

      toast({ title: lang === "de" ? "Beleg gespeichert!" : "Receipt saved!" });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && (lang === "de" ? "Beleg scannen" : "Scan Receipt")}
            {step === "scanning" && (lang === "de" ? "Wird gescannt..." : "Scanning...")}
            {step === "company" && (lang === "de" ? "Zuordnung" : "Assignment")}
            {step === "details" && (lang === "de" ? "Weitere Details" : "Additional Details")}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {lang === "de"
                ? "Fotografiere deinen Beleg oder lade ein Bild/PDF hoch."
                : "Take a photo of your receipt or upload an image/PDF."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-28 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-primary" />
                <span className="text-sm">{lang === "de" ? "Kamera" : "Camera"}</span>
              </Button>
              <Button
                variant="outline"
                className="h-28 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-primary" />
                <span className="text-sm">{lang === "de" ? "Datei wählen" : "Choose File"}</span>
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />
          </div>
        )}

        {/* Step 2: Scanning */}
        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-8">
            {preview && (
              <img src={preview} alt="Receipt" className="max-h-40 rounded-lg border object-contain" />
            )}
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {lang === "de" ? "KI liest Beleg aus..." : "AI reading receipt..."}
            </p>
          </div>
        )}

        {/* Step 3: Company + Core Data */}
        {step === "company" && (
          <div className="space-y-3">
            {preview && (
              <img src={preview} alt="Receipt" className="max-h-24 w-full rounded-lg border object-contain" />
            )}

            {scanResult && (
              <div className="rounded-md bg-muted/50 p-2.5 text-sm space-y-0.5">
                <p className="font-medium text-foreground text-xs">
                  {lang === "de" ? "Erkannte Daten:" : "Detected data:"}
                </p>
                {scanResult.vendor && <p className="text-muted-foreground text-xs">📍 {scanResult.vendor}</p>}
                {scanResult.amount && <p className="text-muted-foreground text-xs">💰 {scanResult.amount.toFixed(2)} €</p>}
                {scanResult.date && <p className="text-muted-foreground text-xs">📅 {scanResult.date}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">{lang === "de" ? "Datum" : "Date"}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{lang === "de" ? "Betrag (€)" : "Amount (€)"}</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-11 text-base" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Beschreibung" : "Description"}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11 text-base" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Organisation zuordnen" : "Assign Organization"}</Label>
              {!showNewCompany ? (
                <div className="flex items-end gap-2">
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger className="h-11 flex-1 text-base">
                      <SelectValue placeholder={lang === "de" ? "Organisation wählen..." : "Select organization..."} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="max-h-48">
                      {localCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => setShowNewCompany(true)}
                    title={lang === "de" ? "Neues Unternehmen" : "New company"}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder={lang === "de" ? "Name des Unternehmens..." : "Company name..."}
                    className="h-11 flex-1 text-base"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCompany();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={handleCreateCompany}
                    disabled={creatingCompany || !newCompanyName.trim()}
                  >
                    {creatingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 px-3 text-sm text-muted-foreground"
                    onClick={() => { setShowNewCompany(false); setNewCompanyName(""); }}
                  >
                    {lang === "de" ? "Abbrechen" : "Cancel"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 gap-2 h-11"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <SkipForward className="h-4 w-4" />
                {lang === "de" ? "Speichern & Skip" : "Save & Skip"}
              </Button>
              <Button
                className="flex-1 gap-2 h-11"
                onClick={() => setStep("details")}
              >
                <ArrowRight className="h-4 w-4" />
                {lang === "de" ? "Weiter" : "Next"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Additional Details */}
        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Getroffene Person" : "Person Met"}</Label>
              <Input value={personMet} onChange={(e) => setPersonMet(e.target.value)} className="h-11 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Unternehmung/Organisation" : "Organization"}</Label>
              <Input value={organization} onChange={(e) => setOrganization(e.target.value)} className="h-11 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{lang === "de" ? "Zweck des Meetings" : "Meeting Purpose"}</Label>
              <Input value={meetingPurpose} onChange={(e) => setMeetingPurpose(e.target.value)} className="h-11 text-base" />
            </div>

            <Button
              className="w-full gap-2"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving
                ? (lang === "de" ? "Speichern..." : "Saving...")
                : (lang === "de" ? "Beleg speichern" : "Save Receipt")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScanWizard;
