import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const { tt } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    if (window.location.hash.includes("type=recovery")) setIsRecovery(true);
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error(tt({de:"Passwörter stimmen nicht überein", en:"Passwords don't match", tr:"Şifreler eşleşmiyor", ar:"كلمات المرور غير متطابقة", ru:"Пароли не совпадают"})); return; }
    if (password.length < 6) { toast.error(tt({de:"Mindestens 6 Zeichen", en:"At least 6 characters", tr:"En az 6 karakter", ar:"6 أحرف على الأقل", ru:"Минимум 6 символов"})); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message); else setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"><CheckCircle2 className="h-7 w-7 text-primary" /></div>
          <h2 className="text-lg font-semibold text-foreground">{tt({de:"Passwort geändert", en:"Password changed", tr:"Şifre değiştirildi", ar:"تم تغيير كلمة المرور", ru:"Пароль изменён"})}</h2>
          <p className="text-sm text-muted-foreground">{tt({de:"Ihr Passwort wurde erfolgreich geändert.", en:"Your password has been changed successfully.", tr:"Şifreniz başarıyla değiştirildi.", ar:"تم تغيير كلمة المرور بنجاح.", ru:"Ваш пароль успешно изменён."})}</p>
          <Button onClick={() => navigate("/")}>{tt({de:"Weiter", en:"Continue", tr:"Devam", ar:"متابعة", ru:"Продолжить"})}</Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!isRecovery) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{tt({de:"Ungültiger oder abgelaufener Link.", en:"Invalid or expired link.", tr:"Geçersiz veya süresi dolmuş link.", ar:"رابط غير صالح أو منتهي الصلاحية.", ru:"Недействительная или просроченная ссылка."})}</p>
          <Button variant="outline" onClick={() => navigate("/auth")}>{tt({de:"Zum Login", en:"Go to login", tr:"Girişe git", ar:"الذهاب لتسجيل الدخول", ru:"К входу"})}</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><KeyRound className="h-6 w-6 text-primary" /></div>
          <CardTitle>{tt({de:"Neues Passwort setzen", en:"Set new password", tr:"Yeni şifre belirle", ar:"تعيين كلمة مرور جديدة", ru:"Установить новый пароль"})}</CardTitle>
          <CardDescription>{tt({de:"Geben Sie Ihr neues Passwort ein.", en:"Enter your new password.", tr:"Yeni şifrenizi girin.", ar:"أدخل كلمة المرور الجديدة.", ru:"Введите новый пароль."})}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label>{tt({de:"Neues Passwort", en:"New password", tr:"Yeni şifre", ar:"كلمة المرور الجديدة", ru:"Новый пароль"})}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>{tt({de:"Passwort bestätigen", en:"Confirm password", tr:"Şifreyi onayla", ar:"تأكيد كلمة المرور", ru:"Подтвердить пароль"})}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tt({de:"Passwort ändern", en:"Change password", tr:"Şifreyi değiştir", ar:"تغيير كلمة المرور", ru:"Изменить пароль"})}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
