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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, Receipt as ReceiptIcon, Trash2, Eye, Pencil, ScanLine } from "lucide-react";
import ScanWizard from "@/components/ScanWizard";

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

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [defaultCompanyId, setDefaultCompanyId] = useState<string | null>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPersonMet, setEditPersonMet] = useState("");
  const [editOrganization, setEditOrganization] = useState("");
  const [editMeetingPurpose, setEditMeetingPurpose] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [receiptsRes, companiesRes, profileRes] = await Promise.all([
      supabase.from("receipts").select("*").order("date", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("profiles").select("default_company_id").eq("id", user.id).single(),
    ]);
    if (receiptsRes.data) setReceipts(receiptsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (profileRes.data?.default_company_id) setDefaultCompanyId(profileRes.data.default_company_id);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  // Listen for scan trigger from bottom nav
  useEffect(() => {
    const handler = () => setScanOpen(true);
    window.addEventListener("open-scan", handler);
    return () => window.removeEventListener("open-scan", handler);
  }, []);

  const openEdit = (r: Receipt) => {
    setEditingReceipt(r);
    setEditDate(r.date);
    setEditAmount(r.amount?.toString() || "");
    setEditDescription(r.description || "");
    setEditPersonMet(r.person_met || "");
    setEditOrganization(r.organization || "");
    setEditMeetingPurpose(r.meeting_purpose || "");
    setEditCompanyId(r.company_id || "");
    setEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;
    setEditSaving(true);
    const { error } = await supabase.from("receipts").update({
      date: editDate,
      amount: editAmount ? parseFloat(editAmount) : null,
      description: editDescription || null,
      person_met: editPersonMet || null,
      organization: editOrganization || null,
      meeting_purpose: editMeetingPurpose || null,
      company_id: editCompanyId || null,
      status: "complete",
    }).eq("id", editingReceipt.id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: lang === "de" ? "Gespeichert" : "Saved" });
      setEditOpen(false);
      fetchData();
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (filePath) await supabase.storage.from("receipts").remove([filePath]);
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (!error) fetchData();
  };

  const viewFile = async (filePath: string) => {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(filePath, 300);
    if (data?.signedUrl) setPreviewUrl(data.signedUrl);
  };

  const formatAmount = (a: number | null) => a != null ? `${a.toFixed(2)} €` : "–";

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">{t("receipts.title")}</h1>
        <Button className="gap-2" onClick={() => setScanOpen(true)}>
          <ScanLine className="h-4 w-4" />
          {t("receipts.scan")}
        </Button>
      </div>

      {receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ReceiptIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("receipts.noReceipts")}</p>
            <p className="mt-1 text-sm text-muted-foreground/60">{t("receipts.scanHint")}</p>
            <Button className="mt-4 gap-2" onClick={() => setScanOpen(true)}>
              <Camera className="h-4 w-4" />
              {lang === "de" ? "Ersten Beleg scannen" : "Scan first receipt"}
            </Button>
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
          <div className="md:hidden space-y-2">
            {receipts.map((r) => (
              <Card key={r.id} className={r.status === "pending" ? "border-warning/50" : ""}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 flex-1 min-w-0" onClick={() => openEdit(r)}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{formatAmount(r.amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
                        </span>
                        {r.status === "pending" && (
                          <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                            {lang === "de" ? "Offen" : "Pending"}
                          </span>
                        )}
                      </div>
                      {r.description && <p className="text-sm text-foreground truncate">{r.description}</p>}
                    </div>
                    <div className="flex items-center gap-0.5 ml-2">
                      {r.file_path && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewFile(r.file_path!)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
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

      {/* Scan Wizard */}
      <ScanWizard
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onSaved={fetchData}
        companies={companies}
        defaultCompanyId={defaultCompanyId}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("receipts.details")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("receipts.date")}</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("receipts.amount")}</Label>
                <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("receipts.description")}</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("receipts.assignCompany")}</Label>
              <Select value={editCompanyId} onValueChange={setEditCompanyId}>
                <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("receipts.person")}</Label>
              <Input value={editPersonMet} onChange={(e) => setEditPersonMet(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("receipts.organization")}</Label>
              <Input value={editOrganization} onChange={(e) => setEditOrganization(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("receipts.meetingPurpose")}</Label>
              <Input value={editMeetingPurpose} onChange={(e) => setEditMeetingPurpose(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={editSaving}>
              {editSaving ? t("general.loading") : t("receipts.save")}
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
