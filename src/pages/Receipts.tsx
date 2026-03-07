import { useState, useEffect, useRef } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, Upload, Receipt as ReceiptIcon, Trash2, Eye, Pencil } from "lucide-react";

interface Receipt {
  id: string;
  date: string;
  amount: number | null;
  description: string | null;
  person_met: string | null;
  organization: string | null;
  meeting_purpose: string | null;
  file_path: string | null;
  status: string;
  company_id: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

const Receipts = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [personMet, setPersonMet] = useState("");
  const [organization, setOrganization] = useState("");
  const [meetingPurpose, setMeetingPurpose] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [receiptsRes, companiesRes] = await Promise.all([
      supabase.from("receipts").select("*").order("date", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
    ]);
    if (receiptsRes.data) setReceipts(receiptsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setAmount(""); setDescription(""); setPersonMet("");
    setOrganization(""); setMeetingPurpose(""); setCompanyId(""); setFile(null);
    setEditingReceipt(null);
  };

  const openEdit = (r: Receipt) => {
    setEditingReceipt(r);
    setDate(r.date);
    setAmount(r.amount?.toString() || "");
    setDescription(r.description || "");
    setPersonMet(r.person_met || "");
    setOrganization(r.organization || "");
    setMeetingPurpose(r.meeting_purpose || "");
    setCompanyId(r.company_id || "");
    setFile(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    let filePath = editingReceipt?.file_path || null;

    // Upload file if selected
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);
      if (uploadError) {
        toast({ title: uploadError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      filePath = path;
    }

    const data = {
      date,
      amount: amount ? parseFloat(amount) : null,
      description: description || null,
      person_met: personMet || null,
      organization: organization || null,
      meeting_purpose: meetingPurpose || null,
      company_id: companyId || null,
      file_path: filePath,
    };

    let error;
    if (editingReceipt) {
      ({ error } = await supabase.from("receipts").update(data).eq("id", editingReceipt.id));
    } else {
      ({ error } = await supabase.from("receipts").insert({ ...data, user_id: user.id }));
    }

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: lang === "de" ? "Beleg gespeichert" : "Receipt saved" });
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (filePath) {
      await supabase.storage.from("receipts").remove([filePath]);
    }
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (!error) fetchData();
  };

  const viewFile = async (filePath: string) => {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(filePath, 300);
    if (data?.signedUrl) setPreviewUrl(data.signedUrl);
  };

  const formatAmount = (a: number | null) => a != null ? `${a.toFixed(2)} €` : "–";

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">{t("receipts.title")}</h1>
        <Button size="sm" className="gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">{t("receipts.scan")}</span>
        </Button>
      </div>

      {receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ReceiptIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("receipts.noReceipts")}</p>
            <p className="mt-1 text-sm text-muted-foreground/60">{t("receipts.scanHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("receipts.date")}</TableHead>
                    <TableHead>{t("receipts.amount")}</TableHead>
                    <TableHead>{t("receipts.description")}</TableHead>
                    <TableHead>{t("receipts.company")}</TableHead>
                    <TableHead className="text-right">{lang === "de" ? "Aktionen" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}</TableCell>
                      <TableCell className="font-mono">{formatAmount(r.amount)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.description || "–"}</TableCell>
                      <TableCell>{companies.find(c => c.id === r.company_id)?.name || "–"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {r.file_path && (
                          <Button variant="ghost" size="sm" onClick={() => viewFile(r.file_path!)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(r.id, r.file_path)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {receipts.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{formatAmount(r.amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
                        </span>
                      </div>
                      {r.description && <p className="text-sm text-foreground truncate">{r.description}</p>}
                      {r.company_id && (
                        <p className="text-xs text-muted-foreground">{companies.find(c => c.id === r.company_id)?.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 ml-2">
                      {r.file_path && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewFile(r.file_path!)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id, r.file_path)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReceipt ? t("receipts.details") : t("receipts.scan")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("receipts.date")}</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t("receipts.amount")}</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("receipts.description")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("receipts.person")}</Label>
                <Input value={personMet} onChange={(e) => setPersonMet(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("receipts.organization")}</Label>
                <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("receipts.meetingPurpose")}</Label>
              <Input value={meetingPurpose} onChange={(e) => setMeetingPurpose(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("receipts.assignCompany")}</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="–" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{lang === "de" ? "Beleg-Datei (Bild/PDF)" : "Receipt file (image/PDF)"}</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? t("general.loading") : t("receipts.save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* File Preview */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{lang === "de" ? "Beleg-Vorschau" : "Receipt Preview"}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            previewUrl.includes(".pdf") ? (
              <iframe src={previewUrl} className="h-[70vh] w-full rounded" />
            ) : (
              <img src={previewUrl} alt="Receipt" className="max-h-[70vh] w-full object-contain rounded" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Receipts;
