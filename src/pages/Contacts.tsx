import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Users, Loader2 } from "lucide-react";

interface Contact {
  id: string;
  full_name: string;
  organization: string | null;
  email: string | null;
  notes: string | null;
  last_used_at: string | null;
  use_count: number;
}

const Contacts = () => {
  const { user } = useAuth();
  const { tt, lang } = useLanguage();
  const { toast } = useToast();
  const locale = lang === "de" ? "de-DE" : "en-US";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Contact | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("business_contacts")
      .select("*")
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .order("use_count", { ascending: false })
      .order("full_name");
    if (data) setContacts(data as Contact[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchContacts();
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setName(""); setOrg(""); setEmail(""); setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setName(c.full_name);
    setOrg(c.organization || "");
    setEmail(c.email || "");
    setNotes(c.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) {
      toast({ title: tt({ de: "Name ist Pflicht", en: "Name is required" }), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("business_contacts")
          .update({
            full_name: name.trim(),
            organization: org.trim() || null,
            email: email.trim() || null,
            notes: notes.trim() || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("business_contacts").insert({
          user_id: user.id,
          full_name: name.trim(),
          organization: org.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
        });
        if (error) throw error;
      }
      toast({ title: tt({ de: "Gespeichert", en: "Saved" }) });
      setDialogOpen(false);
      await fetchContacts();
    } catch (err: any) {
      toast({
        title: tt({ de: "Fehler beim Speichern", en: "Save failed" }),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("business_contacts").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({
        title: tt({ de: "Fehler beim Löschen", en: "Delete failed" }),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: tt({ de: "Kontakt gelöscht", en: "Contact deleted" }),
        description: tt({
          de: "Belege bleiben mit Namen erhalten.",
          en: "Receipts keep the contact name.",
        }),
      });
      await fetchContacts();
    }
    setDeleteTarget(null);
  };

  const filtered = contacts.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.full_name.toLowerCase().includes(q) ||
      (c.organization || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto pb-24 md:pb-6 pt-16 md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              {tt({ de: "Geschäftskontakte", en: "Business Contacts" })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tt({
                de: "Personen & Firmen für Bewirtungsbelege",
                en: "People & companies for hospitality receipts",
              })}
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {tt({ de: "Neuer Kontakt", en: "New contact" })}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Input
            placeholder={tt({ de: "Suchen…", en: "Search…" })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm mb-4"
          />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              {contacts.length === 0
                ? tt({
                    de: "Noch keine Kontakte. Lege den ersten Kontakt an.",
                    en: "No contacts yet. Create your first one.",
                  })
                : tt({ de: "Keine Treffer.", en: "No matches." })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tt({ de: "Name", en: "Name" })}</TableHead>
                    <TableHead>{tt({ de: "Firma", en: "Company" })}</TableHead>
                    <TableHead className="hidden md:table-cell">{tt({ de: "E-Mail", en: "Email" })}</TableHead>
                    <TableHead className="hidden md:table-cell text-right">{tt({ de: "Belege", en: "Receipts" })}</TableHead>
                    <TableHead className="hidden md:table-cell">{tt({ de: "Zuletzt", en: "Last used" })}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell>{c.organization || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{c.email || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-right">{c.use_count}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {c.last_used_at ? new Date(c.last_used_at).toLocaleDateString(locale) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} aria-label="delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? tt({ de: "Kontakt bearbeiten", en: "Edit contact" })
                : tt({ de: "Neuer Kontakt", en: "New contact" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{tt({ de: "Name", en: "Name" })} *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "Firma / Organisation", en: "Company / Organization" })}</Label>
              <Input value={org} onChange={(e) => setOrg(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "E-Mail", en: "Email" })}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "Notizen", en: "Notes" })}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {tt({ de: "Abbrechen", en: "Cancel" })}
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tt({ de: "Speichern", en: "Save" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tt({ de: "Kontakt löschen?", en: "Delete contact?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tt({
                de: `„${deleteTarget?.full_name}" wird gelöscht. Bestehende Belege behalten Name und Firma als Text.`,
                en: `"${deleteTarget?.full_name}" will be deleted. Existing receipts keep name and company as text.`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tt({ de: "Abbrechen", en: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {tt({ de: "Löschen", en: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;
