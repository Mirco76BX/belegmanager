import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Building2, Plus, Pencil, Trash2, Users, User, HelpCircle, FileText, HeartPulse, Car } from "lucide-react";

const ORG_TYPES = ["company", "association", "personal", "tax", "health_insurance", "other"] as const;
type OrgType = typeof ORG_TYPES[number];

const orgTypeIcons: Record<OrgType, React.ReactNode> = {
  company: <Building2 className="h-4 w-4" />,
  association: <Users className="h-4 w-4" />,
  personal: <User className="h-4 w-4" />,
  tax: <FileText className="h-4 w-4" />,
  health_insurance: <HeartPulse className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />,
};

interface Company {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  org_type: string;
  created_at: string;
}

interface Vehicle {
  id: string;
  license_plate: string;
  name: string | null;
}

const Companies = () => {
  const { t, lang, tt } = useLanguage();
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

  useEffect(() => { fetchData(); }, [user]);

  // Company form
  const resetForm = () => { setName(""); setTaxId(""); setAddress(""); setOrgType("company"); setEditing(null); };

  const openEdit = (c: Company) => {
    setEditing(c); setName(c.name); setTaxId(c.tax_id || "");
    setAddress(c.address || ""); setOrgType((c.org_type as OrgType) || "company");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // Check for duplicate name
    const duplicate = companies.find(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.id !== editing?.id
    );
    if (duplicate) {
      toast({
        title: tt({de:"Organisation existiert bereits", en:"Organization already exists", tr:"Kuruluş zaten mevcut", ar:"المنظمة موجودة بالفعل", ru:"Организация уже существует"}),
        description: tt({de:`"${duplicate.name}" ist bereits vorhanden.`, en:`"${duplicate.name}" already exists.`, tr:`"${duplicate.name}" zaten mevcut.`, ar:`"${duplicate.name}" موجودة بالفعل.`, ru:`"${duplicate.name}" уже существует.`}),
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const data = { name, tax_id: taxId || null, address: address || null, org_type: orgType };
    let error;
    if (editing) { ({ error } = await supabase.from("companies").update(data).eq("id", editing.id)); }
    else { ({ error } = await supabase.from("companies").insert({ ...data, user_id: user.id })); }

    if (error) { toast({ title: error.message, variant: "destructive" }); }
    else {
      toast({ title: tt({de:"Gespeichert", en:"Saved", tr:"Kaydedildi", ar:"تم الحفظ", ru:"Сохранено"}) });
      resetForm(); setDialogOpen(false); fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (!error) fetchData();
  };

  // Vehicle form
  const resetVehicleForm = () => { setVehiclePlate(""); setVehicleName(""); setEditingVehicle(null); };

  const openEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v); setVehiclePlate(v.license_plate); setVehicleName(v.name || "");
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
      toast({ title: error.code === "23505"
        ? tt({de:"Kennzeichen bereits vorhanden", en:"License plate already exists", tr:"Plaka zaten mevcut", ar:"لوحة الترخيص موجودة بالفعل", ru:"Номер уже существует"})
        : error.message, variant: "destructive" });
    } else {
      toast({ title: tt({de:"Gespeichert", en:"Saved", tr:"Kaydedildi", ar:"تم الحفظ", ru:"Сохранено"}) });
      resetVehicleForm(); setVehicleDialogOpen(false); fetchData();
    }
    setVehicleSaving(false);
  };

  const handleDeleteVehicle = async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (!error) fetchData();
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Organizations */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">{t("companies.title")}</h1>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          {t("companies.add")}
        </Button>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("companies.noCompanies")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {companies.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-2 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground shrink-0">{orgTypeIcons[(c.org_type as OrgType) || "company"]}</span>
                    <p className="font-medium text-foreground truncate">{c.name}</p>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {t(`companies.type.${(c.org_type as OrgType) || "company"}` as any)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 truncate">
                    {c.tax_id && <span>{t("companies.taxId")}: {c.tax_id}</span>}
                    {c.address && <span className="truncate">{c.address}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vehicles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <Car className="h-5 w-5" />
          {tt({de:"Fahrzeuge", en:"Vehicles", tr:"Araçlar", ar:"المركبات", ru:"Транспорт"})}
        </h2>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => { resetVehicleForm(); setVehicleDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          {tt({de:"Fahrzeug hinzufügen", en:"Add Vehicle", tr:"Araç Ekle", ar:"إضافة مركبة", ru:"Добавить транспорт"})}
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              {tt({de:"Noch keine Fahrzeuge angelegt", en:"No vehicles added yet", tr:"Henüz araç eklenmedi", ar:"لم تتم إضافة مركبات بعد", ru:"Транспорт ещё не добавлен"})}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {tt({de:"Fahrzeuge werden beim Tankbeleg-Upload als Auswahl angeboten.", en:"Vehicles will be offered as options when uploading fuel receipts.", tr:"Yakıt fişi yüklerken araçlar seçenek olarak sunulacak.", ar:"ستُعرض المركبات كخيارات عند تحميل إيصالات الوقود.", ru:"Транспорт будет предложен при загрузке чеков на топливо."})}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {vehicles.map((v) => (
            <Card key={v.id}>
              <CardContent className="flex items-center justify-between gap-2 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-mono font-semibold text-foreground">{v.license_plate}</p>
                  </div>
                  {v.name && <p className="text-xs text-muted-foreground mt-0.5 ml-6">{v.name}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditVehicle(v)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteVehicle(v.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Organization Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("companies.edit") : t("companies.add")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("companies.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("companies.type")}</Label>
              <Select value={orgType} onValueChange={(v) => setOrgType(v as OrgType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map((ot) => (
                    <SelectItem key={ot} value={ot}>
                      <span className="flex items-center gap-2">{orgTypeIcons[ot]} {t(`companies.type.${ot}` as any)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("companies.address")}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? t("general.loading") : t("general.save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={vehicleDialogOpen} onOpenChange={(o) => { if (!o) resetVehicleForm(); setVehicleDialogOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicle
                ? tt({de:"Fahrzeug bearbeiten", en:"Edit Vehicle", tr:"Aracı Düzenle", ar:"تعديل المركبة", ru:"Редактировать транспорт"})
                : tt({de:"Fahrzeug hinzufügen", en:"Add Vehicle", tr:"Araç Ekle", ar:"إضافة مركبة", ru:"Добавить транспорт"})}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveVehicle} className="space-y-4">
            <div className="space-y-2">
              <Label>{tt({de:"Kennzeichen", en:"License Plate", tr:"Plaka", ar:"لوحة الترخيص", ru:"Номерной знак"})} <span className="text-destructive">*</span></Label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder={tt({de:"z.B. B-AB 1234", en:"e.g. B-AB 1234", tr:"ör. 34 ABC 123", ar:"مثال: B-AB 1234", ru:"напр. B-AB 1234"})}
                className="uppercase font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{tt({de:"Bezeichnung (optional)", en:"Name (optional)", tr:"Ad (opsiyonel)", ar:"الاسم (اختياري)", ru:"Название (опционально)"})}</Label>
              <Input
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder={tt({de:"z.B. Firmenwagen, VW Golf", en:"e.g. Company car, VW Golf", tr:"ör. Şirket arabası", ar:"مثال: سيارة الشركة", ru:"напр. Служебный авто"})}
              />
            </div>
            <Button type="submit" className="w-full" disabled={vehicleSaving}>
              {vehicleSaving ? t("general.loading") : t("general.save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Companies;
