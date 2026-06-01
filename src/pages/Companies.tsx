import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  User,
  HelpCircle,
  FileText,
  HeartPulse,
  Car,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const ORG_TYPES = ["company", "association", "personal", "tax", "health_insurance", "other"] as const;
type OrgType = typeof ORG_TYPES[number];

const orgTypeIcons: Record<OrgType, React.ReactNode> = {
  company: <Building2 className="h-5 w-5" />,
  association: <Users className="h-5 w-5" />,
  personal: <User className="h-5 w-5" />,
  tax: <FileText className="h-5 w-5" />,
  health_insurance: <HeartPulse className="h-5 w-5" />,
  other: <HelpCircle className="h-5 w-5" />,
};

interface Company {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  org_type: string;
  created_at: string;
  datev_berater_nr?: string | null;
  datev_mandanten_nr?: string | null;
  datev_kontenrahmen?: string | null;
  datev_konto_gegenkonto?: string | null;
  datev_wj_beginn?: string | null;
  datev_sachkontenlaenge?: number | null;
  datev_bezeichnung?: string | null;
  datev_diktatkuerzel?: string | null;
}

interface Vehicle {
  id: string;
  license_plate: string;
  name: string | null;
}

const Companies = () => {
  const { t, tt } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [orgType, setOrgType] = useState<OrgType>("company");

  // DATEV-Stammdaten pro Mandant.
  // Gegenkonto-Default: SKR04 = 3300 (Verb. aus L+L), SKR03 = 1600.
  const [datevBeraterNr, setDatevBeraterNr] = useState("");
  const [datevMandantenNr, setDatevMandantenNr] = useState("");
  const [datevKontenrahmen, setDatevKontenrahmen] = useState<"SKR03" | "SKR04">("SKR04");
  const [datevKontoGegenkonto, setDatevKontoGegenkonto] = useState("3300");
  const [datevWjBeginn, setDatevWjBeginn] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [datevSachkontenlaenge, setDatevSachkontenlaenge] = useState<number>(4);
  const [datevSectionOpen, setDatevSectionOpen] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  // Vehicle dialog
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleSaving, setVehicleSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [compRes, vehRes] = await Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("vehicles").select("*").order("license_plate"),
    ]);
    if (compRes.data) setCompanies(compRes.data);
    if (vehRes.data) setVehicles(vehRes.data as Vehicle[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const resetForm = () => {
    setName("");
    setTaxId("");
    setAddress("");
    setOrgType("company");
    setEditing(null);
    setDatevBeraterNr("");
    setDatevMandantenNr("");
    setDatevKontenrahmen("SKR04");
    setDatevKontoGegenkonto("3300");
    setDatevWjBeginn(`${new Date().getFullYear()}-01-01`);
    setDatevSachkontenlaenge(4);
    setDatevSectionOpen(false);
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setName(c.name);
    setTaxId(c.tax_id || "");
    setAddress(c.address || "");
    setOrgType((c.org_type as OrgType) || "company");
    setDatevBeraterNr(c.datev_berater_nr || "");
    setDatevMandantenNr(c.datev_mandanten_nr || "");
    setDatevKontenrahmen((c.datev_kontenrahmen as "SKR03" | "SKR04") || "SKR04");
    setDatevKontoGegenkonto(c.datev_konto_gegenkonto || "3300");
    setDatevWjBeginn(c.datev_wj_beginn || `${new Date().getFullYear()}-01-01`);
    setDatevSachkontenlaenge(c.datev_sachkontenlaenge || 4);
    setDatevSectionOpen(Boolean(c.datev_berater_nr || c.datev_mandanten_nr));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const duplicate = companies.find(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.id !== editing?.id
    );
    if (duplicate) {
      toast({
        title: tt({ de: "Organisation existiert bereits", en: "Organization already exists" }),
        description: tt({
          de: `„${duplicate.name}" ist bereits vorhanden.`,
          en: `"${duplicate.name}" already exists.`,
        }),
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const data = {
      name,
      tax_id: taxId || null,
      address: address || null,
      org_type: orgType,
      datev_berater_nr: datevBeraterNr.trim() || null,
      datev_mandanten_nr: datevMandantenNr.trim() || null,
      datev_kontenrahmen: datevBeraterNr.trim() ? datevKontenrahmen : null,
      datev_konto_gegenkonto: datevBeraterNr.trim() ? datevKontoGegenkonto : null,
      datev_wj_beginn: datevBeraterNr.trim() ? datevWjBeginn : null,
      datev_sachkontenlaenge: datevBeraterNr.trim() ? datevSachkontenlaenge : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("companies").update(data).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("companies").insert({ ...data, user_id: user.id }));
    }

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: tt({ de: "Gespeichert", en: "Saved" }) });
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("companies").delete().eq("id", deleteTarget.id);
    if (!error) fetchData();
    setDeleteTarget(null);
  };

  const resetVehicleForm = () => {
    setVehiclePlate("");
    setVehicleName("");
    setEditingVehicle(null);
  };

  const openEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setVehiclePlate(v.license_plate);
    setVehicleName(v.name || "");
    setVehicleDialogOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setVehicleSaving(true);
    const data = { license_plate: vehiclePlate.trim().toUpperCase(), name: vehicleName.trim() || null };

    let error;
    if (editingVehicle) {
      ({ error } = await supabase.from("vehicles").update(data).eq("id", editingVehicle.id));
    } else {
      ({ error } = await supabase.from("vehicles").insert({ ...data, user_id: user.id } as any));
    }

    if (error) {
      toast({
        title:
          error.code === "23505"
            ? tt({ de: "Kennzeichen bereits vorhanden", en: "License plate already exists" })
            : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: tt({ de: "Gespeichert", en: "Saved" }) });
      resetVehicleForm();
      setVehicleDialogOpen(false);
      fetchData();
    }
    setVehicleSaving(false);
  };

  const handleDeleteVehicle = async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (!error) fetchData();
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
            {tt({ de: "Stammdaten", en: "Master Data" })}
          </p>
          <h1 className="text-title-1 md:text-large-title font-bold tracking-tight">{t("companies.title")}</h1>
        </div>
      </div>

      {/* Sektion: Organisationen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
            {tt({ de: "Mandanten & Organisationen", en: "Clients & Organizations" })}
          </p>
          <Button
            className="h-11 px-4 text-footnote font-semibold text-primary-foreground gap-1.5"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("companies.add")}
          </Button>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-title-3 font-semibold">{t("companies.noCompanies")}</p>
              <p className="text-subhead text-muted-foreground">
                {tt({
                  de: "Lege deinen ersten Mandanten an, um Belege zuzuordnen.",
                  en: "Create your first organization to assign receipts to.",
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {companies.map((c) => {
              const hasDatev = Boolean(c.datev_berater_nr && c.datev_mandanten_nr);
              return (
                <div
                  key={c.id}
                  className="flex items-start gap-3 px-4 py-3.5"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    {orgTypeIcons[(c.org_type as OrgType) || "company"]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-body font-medium truncate">{c.name}</p>
                      <span className="text-caption-2 uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        {t(`companies.type.${(c.org_type as OrgType) || "company"}` as any)}
                      </span>
                      {hasDatev && (
                        <span className="text-caption-2 font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          DATEV
                        </span>
                      )}
                    </div>
                    <div className="text-footnote text-muted-foreground mt-0.5 truncate">
                      {[
                        c.tax_id && `${t("companies.taxId")}: ${c.tax_id}`,
                        c.address,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        tt({ de: "Keine weiteren Angaben", en: "No further details" })}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-0"
                      onClick={() => openEdit(c)}
                      aria-label={t("companies.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-0 text-destructive hover:text-destructive hover:bg-destructive/5"
                      onClick={() => setDeleteTarget(c)}
                      aria-label={tt({ de: "Löschen", en: "Delete" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sektion: Fahrzeuge */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
            {tt({ de: "Fahrzeuge", en: "Vehicles" })}
          </p>
          <Button
            className="h-11 px-4 text-footnote font-semibold text-primary-foreground gap-1.5"
            onClick={() => {
              resetVehicleForm();
              setVehicleDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {tt({ de: "Hinzufügen", en: "Add" })}
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Car className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-title-3 font-semibold">
                {tt({ de: "Noch keine Fahrzeuge", en: "No vehicles yet" })}
              </p>
              <p className="text-subhead text-muted-foreground">
                {tt({
                  de: "Fahrzeuge werden beim Tankbeleg-Upload als Auswahl angeboten.",
                  en: "Vehicles will appear when uploading fuel receipts.",
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-mono font-semibold truncate">{v.license_plate}</p>
                  {v.name && <p className="text-footnote text-muted-foreground truncate">{v.name}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    className="h-11 w-11 p-0"
                    onClick={() => openEditVehicle(v)}
                    aria-label={tt({ de: "Bearbeiten", en: "Edit" })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 w-11 p-0 text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => handleDeleteVehicle(v.id)}
                    aria-label={tt({ de: "Löschen", en: "Delete" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organization Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) resetForm();
          setDialogOpen(o);
        }}
      >
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle className="text-title-2 font-bold">
              {editing ? t("companies.edit") : t("companies.add")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col">
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-footnote font-medium">{t("companies.name")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 text-body"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-footnote font-medium">{t("companies.type")}</Label>
                <Select value={orgType} onValueChange={(v) => setOrgType(v as OrgType)}>
                  <SelectTrigger className="h-12 text-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((ot) => (
                      <SelectItem key={ot} value={ot}>
                        <span className="flex items-center gap-2">
                          {orgTypeIcons[ot]} {t(`companies.type.${ot}` as any)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-footnote font-medium">{t("companies.address")}</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-12 text-body" />
              </div>

              {/* DATEV-Stammdaten — collapsible Sektion-Card */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDatevSectionOpen(!datevSectionOpen)}
                  className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/30 active:bg-muted"
                >
                  <div className="text-left">
                    <p className="text-subhead font-semibold">
                      {tt({ de: "DATEV-Stammdaten", en: "DATEV Master Data" })}
                    </p>
                    <p className="text-caption-1 text-muted-foreground">
                      {tt({
                        de: "Für Buchungsstapel-Export",
                        en: "For booking stapel export",
                      })}
                    </p>
                  </div>
                  {datevSectionOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                {datevSectionOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t">
                    <p className="text-caption-1 text-muted-foreground leading-relaxed pt-3">
                      {tt({
                        de: "Diese Werte bekommst du von deinem Steuerberater. Wenn leer, kann für diesen Mandanten kein DATEV-Stapel exportiert werden.",
                        en: "Values come from your tax advisor. If empty, no DATEV stapel can be exported for this client.",
                      })}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-caption-1 font-medium">
                          {tt({ de: "Berater-Nr (7-stellig)", en: "Consultant No (7-digit)" })}
                        </Label>
                        <Input
                          value={datevBeraterNr}
                          onChange={(e) => setDatevBeraterNr(e.target.value.replace(/\D/g, "").slice(0, 7))}
                          placeholder={tt({ de: "vom Berater", en: "from advisor" })}
                          className="h-11 font-mono text-subhead"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-caption-1 font-medium">
                          {tt({ de: "Mandanten-Nr (max 5)", en: "Client No (max 5)" })}
                        </Label>
                        <Input
                          value={datevMandantenNr}
                          onChange={(e) => setDatevMandantenNr(e.target.value.replace(/\D/g, "").slice(0, 5))}
                          placeholder={tt({ de: "vom Berater", en: "from advisor" })}
                          className="h-11 font-mono text-subhead"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-caption-1 font-medium">
                          {tt({ de: "Kontenrahmen", en: "Chart of Accounts" })}
                        </Label>
                        <Select
                          value={datevKontenrahmen}
                          onValueChange={(v) => {
                            setDatevKontenrahmen(v as "SKR03" | "SKR04");
                            if (
                              datevKontoGegenkonto === "3300" ||
                              datevKontoGegenkonto === "1600" ||
                              !datevKontoGegenkonto
                            ) {
                              setDatevKontoGegenkonto(v === "SKR04" ? "3300" : "1600");
                            }
                          }}
                        >
                          <SelectTrigger className="h-11 text-subhead">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SKR03">SKR 03</SelectItem>
                            <SelectItem value="SKR04">SKR 04</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-caption-1 font-medium">
                          {tt({ de: "Sachkontenlänge", en: "Account Length" })}
                        </Label>
                        <Select
                          value={String(datevSachkontenlaenge)}
                          onValueChange={(v) => setDatevSachkontenlaenge(parseInt(v))}
                        >
                          <SelectTrigger className="h-11 text-subhead">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[4, 5, 6, 7, 8].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-caption-1 font-medium">
                          {tt({ de: "WJ-Beginn", en: "Fiscal Year Start" })}
                        </Label>
                        <Input
                          type="date"
                          value={datevWjBeginn}
                          onChange={(e) => setDatevWjBeginn(e.target.value)}
                          className="h-11 text-subhead"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-caption-1 font-medium">
                          {tt({ de: "Gegenkonto", en: "Counter Account" })}
                        </Label>
                        <Input
                          value={datevKontoGegenkonto}
                          onChange={(e) => setDatevKontoGegenkonto(e.target.value.replace(/\D/g, "").slice(0, 8))}
                          placeholder={datevKontenrahmen === "SKR04" ? "3300" : "1600"}
                          className="h-11 font-mono text-subhead"
                        />
                      </div>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-caption-1 text-amber-900 dark:text-amber-200 leading-relaxed">
                      <span className="font-semibold">[!] Wichtig: </span>
                      {tt({
                        de: "Gegenkonto NICHT auf Bank (1800/1200) setzen — sonst doppelt gebucht beim Kontoauszug-Import. Empfohlen: SKR 04 = 3300, SKR 03 = 1600. Final mit Steuerberater abstimmen.",
                        en: "Do NOT set counter account to Bank (1800/1200) — would cause double booking with bank statement import. Recommended: SKR 04 = 3300, SKR 03 = 1600.",
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 border-t bg-background px-5 py-3 z-10">
              <Button
                type="submit"
                className="w-full h-13 text-body font-semibold text-primary-foreground"
                disabled={saving}
              >
                {saving ? t("general.loading") : t("general.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog
        open={vehicleDialogOpen}
        onOpenChange={(o) => {
          if (!o) resetVehicleForm();
          setVehicleDialogOpen(o);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-title-2 font-bold">
              {editingVehicle
                ? tt({ de: "Fahrzeug bearbeiten", en: "Edit Vehicle" })
                : tt({ de: "Fahrzeug hinzufügen", en: "Add Vehicle" })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveVehicle} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-footnote font-medium">
                {tt({ de: "Kennzeichen", en: "License Plate" })} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder={tt({ de: "z.B. B-AB 1234", en: "e.g. B-AB 1234" })}
                className="h-12 text-body uppercase font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-footnote font-medium">
                {tt({ de: "Bezeichnung (optional)", en: "Name (optional)" })}
              </Label>
              <Input
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder={tt({ de: "z.B. Firmenwagen, VW Golf", en: "e.g. Company car, VW Golf" })}
                className="h-12 text-body"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-13 text-body font-semibold text-primary-foreground"
              disabled={vehicleSaving}
            >
              {vehicleSaving ? t("general.loading") : t("general.save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-title-2">
              {tt({ de: "Organisation löschen?", en: "Delete organization?" })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-body">
              {tt({
                de: `Möchtest du „${deleteTarget?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
                en: `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-12 text-body">
              {tt({ de: "Abbrechen", en: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-12 text-body bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tt({ de: "Löschen", en: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Companies;
