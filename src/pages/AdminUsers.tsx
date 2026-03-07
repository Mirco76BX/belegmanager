import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Ban, Trash2, UserCheck } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  is_blocked: boolean;
  created_at: string;
}

const AdminUsers = () => {
  const { t, lang } = useLanguage();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!error && data) setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchProfiles();
  }, [isAdmin]);

  const toggleBlock = async (profile: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: !profile.is_blocked })
      .eq("id", profile.id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: profile.is_blocked
        ? (lang === "de" ? "Nutzer entsperrt" : "User unblocked")
        : (lang === "de" ? "Nutzer gesperrt" : "User blocked") });
      fetchProfiles();
    }
  };

  const deleteUser = async (profile: Profile) => {
    // We can only delete the profile; auth.users deletion requires admin API
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: lang === "de" ? "Profil gelöscht" : "Profile deleted" });
      fetchProfiles();
    }
  };

  if (roleLoading || loading) {
    return <div className="text-muted-foreground">{t("general.loading")}</div>;
  }

  if (!isAdmin) {
    return <div className="text-destructive">{lang === "de" ? "Kein Zugriff" : "Access denied"}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          {lang === "de" ? "Benutzerverwaltung" : "User Management"}
        </h1>
      </div>

      <div className="grid gap-3">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString(lang === "de" ? "de-DE" : "en-US")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {profile.is_blocked && (
                  <Badge variant="destructive">{lang === "de" ? "Gesperrt" : "Blocked"}</Badge>
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
