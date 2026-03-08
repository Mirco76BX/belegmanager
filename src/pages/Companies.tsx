import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Users, User, HelpCircle, FileText, HeartPulse } from "lucide-react";

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

const Companies = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [orgType, setOrgType] = useState<OrgType>("company");

  const fetchCompanies = async () => {
    if (!user) return;
    const { data } = await supabase.from("companies").select("*").order("name");
    if (data) setCompanies(data);
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, [user]);

  const resetForm = () => { setName(""); setTaxId(""); setAddress(""); setOrgType("company"); setEditing(null); };

  const openEdit = (c: Company) => {
    setEditing(c);
    setName(c.name);
    setTaxId(c.tax_id || "");
    setAddress(c.address || "");
    setOrgType((c.org_type as OrgType) || "company");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const data = { name, tax_id: taxId || null, address: address || null, org_type: orgType };
    let error;
    if (editing) {
      ({ error } = await supabase.from("companies").update(data).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("companies").insert({ ...data, user_id: user.id }));
    }

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: lang === "de" ? "Gespeichert" : "Saved" });
      resetForm();
      setDialogOpen(false);
      fetchCompanies();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (!error) fetchCompanies();
  };

  return (
    <div className="animate-fade-in space-y-6">
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
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{orgTypeIcons[(c.org_type as OrgType) || "company"]}</span>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {t(`companies.type.${(c.org_type as OrgType) || "company"}` as any)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                    {c.tax_id && <span>{t("companies.taxId")}: {c.tax_id}</span>}
                    {c.address && <span>{c.address}</span>}
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
    </div>
  );
};

export default Companies;
