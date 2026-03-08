import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Trash2, Eye, ArrowLeft, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClientProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
}

interface ClientReceipt {
  id: string;
  date: string;
  amount: number | null;
  description: string | null;
  organization: string | null;
  receipt_type: string;
}

interface Invitation {
  id: string;
  client_email: string;
  status: string;
  created_at: string;
}

const Clients = () => {
  const { tt, lang } = useLanguage();
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  const locale = getLocale(lang);

  const [clients, setClients] = useState<(ClientProfile & { advisor_client_id: string })[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const [viewingClient, setViewingClient] = useState<ClientProfile | null>(null);
  const [clientReceipts, setClientReceipts] = useState<ClientReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  const isTaxAdvisor = subscription.tier === "tax_advisor";

  const fetchClients = async () => {
    if (!user) return;
    const [linksRes, invRes] = await Promise.all([
      supabase.from("advisor_clients").select("id, client_id").eq("advisor_id", user.id),
      supabase.from("advisor_invitations").select("id, client_email, status, created_at").eq("advisor_id", user.id).order("created_at", { ascending: false }),
    ]);

    setInvitations((invRes.data || []) as Invitation[]);

    const links = linksRes.data;
    if (!links || links.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }

    const clientIds = links.map((l) => l.client_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, display_name")
      .in("id", clientIds);

    if (profiles) {
      setClients(
        profiles.map((p) => ({
          ...p,
          advisor_client_id: links.find((l) => l.client_id === p.id)?.id || "",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAdding(true);

    const trimmedEmail = email.toLowerCase().trim();

    if (trimmedEmail === user.email) {
      toast({
        title: tt({ de: "Nicht möglich", en: "Not allowed", tr: "İzin verilmiyor", ar: "غير مسموح", ru: "Не допускается" }),
        description: tt({ de: "Sie können sich nicht selbst einladen.", en: "You cannot invite yourself.", tr: "Kendinizi davet edemezsiniz.", ar: "لا يمكنك دعوة نفسك.", ru: "Вы не можете пригласить себя." }),
        variant: "destructive",
      });
      setAdding(false);
      return;
    }

    // Check if already linked or pending
    const existing = invitations.find(i => i.client_email === trimmedEmail && i.status === "pending");
    if (existing) {
      toast({
        title: tt({ de: "Bereits eingeladen", en: "Already invited", tr: "Zaten davet edildi", ar: "تمت الدعوة بالفعل", ru: "Уже приглашён" }),
        variant: "destructive",
      });
      setAdding(false);
      return;
    }

    // Optionally resolve client_id if user exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    const { error } = await supabase
      .from("advisor_invitations")
      .insert({
        advisor_id: user.id,
        client_email: trimmedEmail,
        client_id: profile?.id || null,
      } as any);

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({
        title: tt({ de: "Einladung gesendet!", en: "Invitation sent!", tr: "Davet gönderildi!", ar: "تم إرسال الدعوة!", ru: "Приглашение отправлено!" }),
        description: tt({ de: "Der Mandant muss die Einladung in seinem Konto annehmen.", en: "The client must accept the invitation in their account.", tr: "Müşteri, davetiyeyi hesabında kabul etmelidir.", ar: "يجب على العميل قبول الدعوة في حسابه.", ru: "Клиент должен принять приглашение в своём аккаунте." }),
      });
      setEmail("");
      setAddOpen(false);
      fetchClients();
    }
    setAdding(false);
  };

  const handleRemove = async (linkId: string) => {
    await supabase.from("advisor_clients").delete().eq("id", linkId);
    fetchClients();
    if (viewingClient) setViewingClient(null);
  };

  const handleCancelInvitation = async (invId: string) => {
    await supabase.from("advisor_invitations").delete().eq("id", invId);
    fetchClients();
  };

  const viewReceipts = async (client: ClientProfile) => {
    setViewingClient(client);
    setReceiptsLoading(true);
    const { data } = await supabase
      .from("receipts")
      .select("id, date, amount, description, organization, receipt_type")
      .eq("user_id", client.id)
      .order("date", { ascending: false })
      .limit(50);
    setClientReceipts(data || []);
    setReceiptsLoading(false);
  };

  if (!isTaxAdvisor) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{tt({ de: "Mandanten", en: "Clients", tr: "Müşteriler", ar: "العملاء", ru: "Клиенты" })}</h2>
        <p className="text-muted-foreground max-w-sm">
          {tt({ de: "Diese Funktion ist nur für Steuerberater verfügbar.", en: "This feature is only available for tax advisors.", tr: "Bu özellik yalnızca vergi danışmanları için kullanılabilir.", ar: "هذه الميزة متاحة فقط للمستشارين الضريبيين.", ru: "Эта функция доступна только для налоговых консультантов." })}
        </p>
      </div>
    );
  }

  const clientName = (c: ClientProfile) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ") || c.display_name || c.email;

  if (viewingClient) {
    return (
      <div className="animate-fade-in space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setViewingClient(null)}>
          <ArrowLeft className="h-4 w-4" />
          {tt({ de: "Zurück", en: "Back", tr: "Geri", ar: "رجوع", ru: "Назад" })}
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">
          {tt({ de: "Belege von", en: "Receipts from", tr: "Fişler:", ar: "إيصالات من", ru: "Чеки от" })} {clientName(viewingClient)}
        </h1>
        {receiptsLoading ? (
          <p className="text-muted-foreground">{tt({ de: "Laden...", en: "Loading...", tr: "Yükleniyor...", ar: "جارٍ التحميل...", ru: "Загрузка..." })}</p>
        ) : clientReceipts.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">{tt({ de: "Keine Belege vorhanden", en: "No receipts found", tr: "Fiş bulunamadı", ar: "لم يتم العثور على إيصالات", ru: "Чеков не найдено" })}</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tt({ de: "Datum", en: "Date", tr: "Tarih", ar: "التاريخ", ru: "Дата" })}</TableHead>
                    <TableHead>{tt({ de: "Beschreibung", en: "Description", tr: "Açıklama", ar: "الوصف", ru: "Описание" })}</TableHead>
                    <TableHead>{tt({ de: "Organisation", en: "Organization", tr: "Kuruluş", ar: "المنظمة", ru: "Организация" })}</TableHead>
                    <TableHead className="text-right">{tt({ de: "Betrag", en: "Amount", tr: "Tutar", ar: "المبلغ", ru: "Сумма" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientReceipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{new Date(r.date).toLocaleDateString(locale)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.description || "–"}</TableCell>
                      <TableCell>{r.organization || "–"}</TableCell>
                      <TableCell className="text-right font-mono whitespace-nowrap">
                        {r.amount != null ? `${Number(r.amount).toLocaleString(locale, { minimumFractionDigits: 2 })} €` : "–"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const pendingInvitations = invitations.filter(i => i.status === "pending");

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">{tt({ de: "Mandanten", en: "Clients", tr: "Müşteriler", ar: "العملاء", ru: "Клиенты" })}</h1>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          {tt({ de: "Mandant einladen", en: "Invite Client", tr: "Müşteri Davet Et", ar: "دعوة عميل", ru: "Пригласить клиента" })}
        </Button>
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {tt({ de: "Offene Einladungen", en: "Pending Invitations", tr: "Bekleyen Davetler", ar: "الدعوات المعلقة", ru: "Ожидающие приглашения" })}
          </h2>
          {pendingInvitations.map((inv) => (
            <Card key={inv.id} className="border-warning/30 bg-warning/5">
              <CardContent className="flex items-center justify-between gap-2 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-4 w-4 text-warning shrink-0" />
                  <span className="text-sm truncate">{inv.client_email}</span>
                  <Badge variant="outline" className="text-[10px] border-warning/50 text-warning">
                    {tt({ de: "Ausstehend", en: "Pending", tr: "Beklemede", ar: "معلق", ru: "Ожидает" })}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => handleCancelInvitation(inv.id)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active clients */}
      {loading ? (
        <p className="text-muted-foreground">{tt({ de: "Laden...", en: "Loading...", tr: "Yükleniyor...", ar: "جارٍ التحميل...", ru: "Загрузка..." })}</p>
      ) : clients.length === 0 && pendingInvitations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {tt({ de: "Noch keine Mandanten hinzugefügt", en: "No clients added yet", tr: "Henüz müşteri eklenmedi", ar: "لم تتم إضافة عملاء بعد", ru: "Клиенты ещё не добавлены" })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {clients.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-2 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{clientName(c)}</p>
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => viewReceipts(c)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(c.advisor_client_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tt({ de: "Mandant einladen", en: "Invite Client", tr: "Müşteri Davet Et", ar: "دعوة عميل", ru: "Пригласить клиента" })}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>{tt({ de: "E-Mail des Mandanten", en: "Client's Email", tr: "Müşteri E-postası", ar: "بريد العميل", ru: "Email клиента" })}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mandant@beispiel.de"
                required
              />
              <p className="text-xs text-muted-foreground">
                {tt({ de: "Der Mandant erhält eine Einladung in seinem Konto und muss diese annehmen, um Ihnen Zugriff zu gewähren.", en: "The client will receive an invitation in their account and must accept it to grant you access.", tr: "Müşteri hesabında bir davet alacak ve size erişim vermek için kabul etmelidir.", ar: "سيتلقى العميل دعوة في حسابه ويجب عليه قبولها لمنحك حق الوصول.", ru: "Клиент получит приглашение в своём аккаунте и должен принять его, чтобы предоставить вам доступ." })}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={adding}>
              {adding ? tt({ de: "Wird gesendet...", en: "Sending...", tr: "Gönderiliyor...", ar: "جارٍ الإرسال...", ru: "Отправка..." }) : tt({ de: "Einladung senden", en: "Send Invitation", tr: "Davet Gönder", ar: "إرسال الدعوة", ru: "Отправить приглашение" })}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
