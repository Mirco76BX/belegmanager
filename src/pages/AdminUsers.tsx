import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Ban, Trash2, UserCheck } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  is_blocked: boolean;
  is_tax_advisor: boolean;
  kanzlei: string | null;
  created_at: string;
}

const AdminUsers = () => {
  const { t, tt, lang } = useLanguage();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!error && data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchProfiles(); }, [isAdmin]);

  const toggleBlock = async (profile: Profile) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !profile.is_blocked }).eq("id", profile.id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: profile.is_blocked
        ? tt({de:"Nutzer entsperrt", en:"User unblocked", tr:"Kullanıcı engeli kaldırıldı", ar:"تم إلغاء حظر المستخدم", ru:"Пользователь разблокирован"})
        : tt({de:"Nutzer gesperrt", en:"User blocked", tr:"Kullanıcı engellendi", ar:"تم حظر المستخدم", ru:"Пользователь заблокирован"}) });
      fetchProfiles();
    }
  };

  const deleteUser = async (profile: Profile) => {
    const confirmMsg = tt({
      de: `Account ${profile.email} unwiderruflich löschen?\n\nAlle Belege, Firmen und Daten werden mitgelöscht (CASCADE).`,
      en: `Permanently delete account ${profile.email}?\n\nAll receipts, companies and data will be removed (CASCADE).`,
      tr: `${profile.email} hesabı kalıcı olarak silinsin mi?`,
      ar: `حذف الحساب ${profile.email} نهائيًا؟`,
      ru: `Удалить аккаунт ${profile.email} безвозвратно?`,
    });
    if (!window.confirm(confirmMsg)) return;

    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: profile.id },
    });
    if (error || (data && (data as any).error)) {
      toast({
        title: error?.message ?? (data as any)?.error ?? "Delete failed",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: tt({
        de: "Nutzer gelöscht",
        en: "User deleted",
        tr: "Kullanıcı silindi",
        ar: "تم حذف المستخدم",
        ru: "Пользователь удалён",
      }),
    });
    fetchProfiles();
  };

  if (roleLoading) return <div className="text-muted-foreground">{t("general.loading")}</div>;
  if (!isAdmin) return <div className="text-destructive">{tt({de:"Kein Zugriff", en:"Access denied", tr:"Erişim reddedildi", ar:"تم رفض الوصول", ru:"Доступ запрещён"})}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          {tt({de:"Benutzerverwaltung", en:"User Management", tr:"Kullanıcı Yönetimi", ar:"إدارة المستخدمين", ru:"Управление пользователями"})}
        </h1>
      </div>
      <div className="grid gap-3">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{profile.email}</p>
                {profile.kanzlei && <p className="text-xs text-muted-foreground">{profile.kanzlei}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString(getLocale(lang))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {profile.is_blocked && (
                  <Badge variant="destructive">{tt({de:"Gesperrt", en:"Blocked", tr:"Engelli", ar:"محظور", ru:"Заблокирован"})}</Badge>
                )}
                <Button variant="outline" size="sm" onClick={() => toggleBlock(profile)}>
                  {profile.is_blocked ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteUser(profile)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
