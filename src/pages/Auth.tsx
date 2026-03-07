import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Globe } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && password !== confirmPassword) {
      toast({ title: lang === "de" ? "Passwörter stimmen nicht überein" : "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        navigate("/");
      } else {
        await signUp(email, password);
        toast({ title: lang === "de" ? "Konto erstellt! Bitte E-Mail bestätigen." : "Account created! Please confirm your email." });
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("app.name")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isLogin ? t("auth.login") : t("auth.register")}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLang(lang === "de" ? "en" : "de")}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <Globe className="h-3.5 w-3.5" />
                {lang === "de" ? "EN" : "DE"}
              </Button>
            </div>
            <CardDescription>
              {isLogin
                ? (lang === "de" ? "Melden Sie sich mit Ihrem Konto an" : "Sign in to your account")
                : (lang === "de" ? "Erstellen Sie ein neues Konto" : "Create a new account")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("general.loading") : isLogin ? t("auth.login") : t("auth.register")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
              </span>
              <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline">
                {isLogin ? t("auth.register") : t("auth.login")}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
