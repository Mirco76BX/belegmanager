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

  // Detail/Edit dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReceipt, setDetailReceipt] = useState<Receipt | null>(null);
  const [detailImageUrl, setDetailImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  useEffect(() => {
    const handler = () => setScanOpen(true);
    window.addEventListener("open-scan", handler);
    return () => window.removeEventListener("open-scan", handler);
  }, []);

  const openDetail = async (r: Receipt) => {
    setDetailReceipt(r);
    setIsEditing(false);
    setDetailImageUrl(null);
    setDetailOpen(true);
    if (r.file_path) {
      const { data } = await supabase.storage.from("receipts").createSignedUrl(r.file_path, 300);
      if (data?.signedUrl) setDetailImageUrl(data.signedUrl);
    }
  };

  const startEditing = () => {
    if (!detailReceipt) return;
    setEditDate(detailReceipt.date);
    setEditAmount(detailReceipt.amount?.toString() || "");
    setEditDescription(detailReceipt.description || "");
    setEditPersonMet(detailReceipt.person_met || "");
    setEditOrganization(detailReceipt.organization || "");
    setEditMeetingPurpose(detailReceipt.meeting_purpose || "");
    setEditCompanyId(detailReceipt.company_id || "");
    setIsEditing(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailReceipt) return;
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
    }).eq("id", detailReceipt.id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: lang === "de" ? "Gespeichert" : "Saved" });
      setDetailOpen(false);
      fetchData();
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (filePath) await supabase.storage.from("receipts").remove([filePath]);
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (!error) { setDetailOpen(false); fetchData(); }
  };

  const formatAmount = (a: number | null) => a != null ? `${a.toFixed(2)} €` : "–";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "–";

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
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetail(r)}>
                      <TableCell>{new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}</TableCell>
                      <TableCell className="font-mono">{formatAmount(r.amount)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.description || "–"}</TableCell>
                      <TableCell>{companyName(r.company_id)}</TableCell>
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                          <Eye className="h-4 w-4" />
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
              <Card key={r.id} className={`cursor-pointer active:bg-muted/50 transition-colors ${r.status === "pending" ? "border-warning/50" : ""}`} onClick={() => openDetail(r)}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm font-semibold whitespace-nowrap">{formatAmount(r.amount)}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
                      </span>
                      {r.status === "pending" && (
                        <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded whitespace-nowrap">
                          {lang === "de" ? "Offen" : "Pending"}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(r.id, r.file_path); }}
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {r.description && <p className="text-sm text-foreground truncate mt-0.5">{r.description}</p>}
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
        onCompaniesChanged={fetchData}
      />

      {/* Detail / Edit Dialog */}
      <Dialog open={detailOpen} onOpenChange={(o) => { if (!o) { setDetailOpen(false); setIsEditing(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? (lang === "de" ? "Beleg bearbeiten" : "Edit Receipt")
                : (lang === "de" ? "Beleg-Details" : "Receipt Details")}
            </DialogTitle>
          </DialogHeader>

          {!isEditing && detailReceipt && (
            <div className="space-y-4">
              {detailImageUrl && (
                <img src={detailImageUrl} alt="Receipt" className="w-full max-h-48 object-contain rounded-lg border bg-muted" />
              )}

              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{lang === "de" ? "Datum" : "Date"}</span>
                  <span className="font-medium">{new Date(detailReceipt.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{lang === "de" ? "Betrag" : "Amount"}</span>
                  <span className="font-mono font-semibold">{formatAmount(detailReceipt.amount)}</span>
                </div>
                {detailReceipt.description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{lang === "de" ? "Beschreibung" : "Description"}</span>
                    <span className="text-right max-w-[60%]">{detailReceipt.description}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{lang === "de" ? "Organisation" : "Organization"}</span>
                  <span>{companyName(detailReceipt.company_id)}</span>
                </div>
                {detailReceipt.person_met && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{lang === "de" ? "Person" : "Person Met"}</span>
                    <span>{detailReceipt.person_met}</span>
                  </div>
                )}
                {detailReceipt.organization && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{lang === "de" ? "Organisation" : "Organization"}</span>
                    <span>{detailReceipt.organization}</span>
                  </div>
                )}
                {detailReceipt.meeting_purpose && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{lang === "de" ? "Zweck" : "Purpose"}</span>
                    <span className="text-right max-w-[60%]">{detailReceipt.meeting_purpose}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={detailReceipt.status === "pending" ? "text-warning" : "text-green-600"}>
                    {detailReceipt.status === "pending" ? (lang === "de" ? "Offen" : "Pending") : (lang === "de" ? "Vollständig" : "Complete")}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={startEditing}>
                  <Pencil className="h-4 w-4" />
                  {lang === "de" ? "Bearbeiten" : "Edit"}
                </Button>
                <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => handleDelete(detailReceipt.id, detailReceipt.file_path)}>
                  <Trash2 className="h-4 w-4" />
                  {lang === "de" ? "Löschen" : "Delete"}
                </Button>
              </div>
            </div>
          )}

          {isEditing && detailReceipt && (
            <form onSubmit={handleEditSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("receipts.date")}</Label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("receipts.amount")}</Label>
                  <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("receipts.description")}</Label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("receipts.assignCompany")}</Label>
                <Select value={editCompanyId} onValueChange={setEditCompanyId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="–" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="max-h-48">
                    {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("receipts.person")}</Label>
                <Input value={editPersonMet} onChange={(e) => setEditPersonMet(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("receipts.organization")}</Label>
                <Input value={editOrganization} onChange={(e) => setEditOrganization(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t("receipts.meetingPurpose")}</Label>
                <Input value={editMeetingPurpose} onChange={(e) => setEditMeetingPurpose(e.target.value)} className="h-10" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  {lang === "de" ? "Abbrechen" : "Cancel"}
                </Button>
                <Button type="submit" className="flex-1" disabled={editSaving}>
                  {editSaving ? (lang === "de" ? "Speichern..." : "Saving...") : (lang === "de" ? "Speichern" : "Save")}
                </Button>
              </div>
            </form>
          )}
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
