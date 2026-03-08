import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Check, X, Eye } from "lucide-react";

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

interface Props {
  receipts: Receipt[];
  companies: Company[];
  onDelete: (id: string, filePath: string | null) => void;
  onOpenDetail: (r: Receipt) => void;
  onSaved: () => void;
}

const ReceiptsInlineTable = ({ receipts, companies, onDelete, onOpenDetail, onSaved }: Props) => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Receipt>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = (r: Receipt) => {
    setEditingId(r.id);
    setEditValues({
      date: r.date,
      amount: r.amount,
      description: r.description,
      person_met: r.person_met,
      organization: r.organization,
      meeting_purpose: r.meeting_purpose,
      company_id: r.company_id,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("receipts").update({
      date: editValues.date,
      amount: editValues.amount != null ? editValues.amount : null,
      description: editValues.description || null,
      person_met: editValues.person_met || null,
      organization: editValues.organization || null,
      meeting_purpose: editValues.meeting_purpose || null,
      company_id: editValues.company_id || null,
      status: "complete",
    }).eq("id", id);

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: lang === "de" ? "Gespeichert" : "Saved" });
      setEditingId(null);
      onSaved();
    }
    setSaving(false);
  };

  const formatAmount = (a: number | null) => a != null ? `${a.toFixed(2)} €` : "–";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "–";

  const isEditing = (id: string) => editingId === id;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{lang === "de" ? "Datum" : "Date"}</TableHead>
          <TableHead>{lang === "de" ? "Betrag" : "Amount"}</TableHead>
          <TableHead>{lang === "de" ? "Beschreibung" : "Description"}</TableHead>
          <TableHead>{lang === "de" ? "Organisation" : "Company"}</TableHead>
          <TableHead>{lang === "de" ? "Person" : "Person"}</TableHead>
          <TableHead>{lang === "de" ? "Zweck" : "Purpose"}</TableHead>
          <TableHead className="text-right">{lang === "de" ? "Aktionen" : "Actions"}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {receipts.map((r) => (
          <TableRow
            key={r.id}
            className={isEditing(r.id) ? "bg-muted/30" : "cursor-pointer hover:bg-muted/50"}
            onClick={() => !isEditing(r.id) && startEdit(r)}
          >
            {isEditing(r.id) ? (
              <>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                  {formatAmount(r.amount)}
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
                      <SelectTrigger className="h-8 text-sm w-[140px]">
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
                  <Input
                    value={editValues.person_met || ""}
                    onChange={(e) => setEditValues(v => ({ ...v, person_met: e.target.value }))}
                    className="h-8 text-sm w-[120px]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={editValues.meeting_purpose || ""}
                    onChange={(e) => setEditValues(v => ({ ...v, meeting_purpose: e.target.value }))}
                    className="h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => saveEdit(r.id)} disabled={saving}>
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(r.id, r.file_path)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </>
            ) : (
              <>
                <TableCell className="whitespace-nowrap">{new Date(r.date).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}</TableCell>
                <TableCell className="font-mono whitespace-nowrap">{formatAmount(r.amount)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.description || "–"}</TableCell>
                <TableCell>{companyName(r.company_id)}</TableCell>
                <TableCell className="max-w-[120px] truncate">{r.person_met || "–"}</TableCell>
                <TableCell className="max-w-[160px] truncate">{r.meeting_purpose || "–"}</TableCell>
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
        ))}
      </TableBody>
    </Table>
  );
};

export default ReceiptsInlineTable;
