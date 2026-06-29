import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, Plus, UserPlus, X, Loader2 } from "lucide-react";

export interface Contact {
  id: string;
  full_name: string;
  organization: string | null;
  email: string | null;
  notes: string | null;
  last_used_at: string | null;
  use_count: number;
}

interface Props {
  value: string | null;
  displayName?: string | null;
  displayOrg?: string | null;
  onChange: (id: string | null, name: string, organization: string | null) => void;
  required?: boolean;
  invalid?: boolean;
  placeholder?: string;
}

const ContactCombobox = ({ value, displayName, displayOrg, onChange, required, invalid, placeholder }: Props) => {
  const { user } = useAuth();
  const { tt } = useLanguage();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedContact = useMemo(
    () => (value ? contacts.find((c) => c.id === value) : null),
    [value, contacts],
  );

  const fetchContacts = async () => {
    if (!user) return;
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
    fetchContacts();
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts.slice(0, 10);
    return contacts
      .filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.organization || "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [query, contacts]);

  const handlePick = (c: Contact) => {
    onChange(c.id, c.full_name, c.organization);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null, "", null);
    setQuery("");
  };

  const openCreateDialog = (prefillName?: string) => {
    setNewName(prefillName || query || "");
    setNewOrg("");
    setNewEmail("");
    setDialogOpen(true);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({
        title: tt({ de: "Name ist Pflicht", en: "Name is required" }),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("upsert_business_contact", {
        _full_name: newName.trim(),
        _organization: newOrg.trim() || undefined,
        _email: newEmail.trim() || undefined,
        _notes: undefined,
      });
      if (error) throw error;
      const newId = data as unknown as string;
      onChange(newId, newName.trim(), newOrg.trim() || null);
      await fetchContacts();
      setDialogOpen(false);
      toast({
        title: tt({ de: "Kontakt angelegt", en: "Contact created" }),
      });
    } catch (err: any) {
      toast({
        title: tt({ de: "Fehler beim Anlegen", en: "Failed to create" }),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (selectedContact || (value && displayName)) {
    const name = selectedContact?.full_name || displayName || "";
    const org = selectedContact?.organization || displayOrg || null;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-2 py-1.5 px-3 text-sm">
          <UserPlus className="h-3.5 w-3.5" />
          <span className="font-medium">{name}</span>
          {org && <span className="text-muted-foreground">· {org}</span>}
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 rounded-full hover:bg-background/50 p-0.5"
            aria-label={tt({ de: "Auswahl entfernen", en: "Clear selection" })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </Badge>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            placeholder ||
            tt({ de: "Kontakt suchen oder neu anlegen…", en: "Search or create contact…" })
          }
          className={`h-11 text-base ${invalid ? "border-destructive ring-1 ring-destructive/40" : ""}`}
          aria-required={required}
        />
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-auto">
            {loading && (
              <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {tt({ de: "Lade…", en: "Loading…" })}
              </div>
            )}
            {!loading && filtered.length === 0 && contacts.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {tt({
                  de: "Noch keine Kontakte. Lege den ersten an.",
                  en: "No contacts yet. Create your first.",
                })}
              </div>
            )}
            {!loading &&
              filtered.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => handlePick(c)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.full_name}</div>
                    {c.organization && (
                      <div className="truncate text-xs text-muted-foreground">{c.organization}</div>
                    )}
                  </div>
                  {c.use_count > 0 && (
                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                      {c.use_count}×
                    </span>
                  )}
                </button>
              ))}
            <button
              type="button"
              onClick={() => openCreateDialog()}
              className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm text-primary hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              {query.trim()
                ? tt({ de: `Neuen Kontakt anlegen: „${query.trim()}"`, en: `Create contact: "${query.trim()}"` })
                : tt({ de: "Neuen Kontakt anlegen", en: "Create new contact" })}
            </button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tt({ de: "Neuer Geschäftskontakt", en: "New business contact" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{tt({ de: "Name", en: "Name" })} *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "Firma / Organisation", en: "Company / Organization" })}</Label>
              <Input value={newOrg} onChange={(e) => setNewOrg(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "E-Mail (optional)", en: "Email (optional)" })}</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {tt({ de: "Abbrechen", en: "Cancel" })}
            </Button>
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {tt({ de: "Anlegen", en: "Create" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactCombobox;
