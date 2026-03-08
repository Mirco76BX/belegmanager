import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { FileText, Globe, MailCheck } from "lucide-react";
import receiptScanImg from "@/assets/receipt-scan.jpg";
import PricingPlans from "@/components/PricingPlans";
import ContactSection from "@/components/ContactSection";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
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
        setEmailSent(true);
      }
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero / Auth Section */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-4xl animate-fade-in gap-10 items-center">
          <div className="hidden flex-1 md:block">
            <img
              src={receiptScanImg}
              alt={lang === "de" ? "Quittung scannen mit dem Smartphone" : "Scanning a receipt with a smartphone"}
              className="w-full rounded-2xl shadow-lg"
            />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {lang === "de" ? "Belege einfach scannen und digital verwalten" : "Simply scan receipts and manage them digitally"}
            </p>
          </div>
          <div className="w-full max-w-md">
            {/* Mobile image */}
            <div className="mb-0 md:hidden">
              <div className="mx-auto h-36 w-48 overflow-hidden rounded-xl shadow-md">
                <img
                  src={receiptScanImg}
                  alt={lang === "de" ? "Quittung scannen mit dem Smartphone" : "Scanning a receipt with a smartphone"}
                  className="h-full w-full object-cover object-center scale-150"
                />
              </div>
            </div>
            <div className="mb-6 text-center -mt-7 relative z-10 md:mb-8 md:mt-0">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
                <FileText className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{t("app.name")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
            </div>

            {emailSent ? (
              <Card>
                <CardContent className="py-10 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <MailCheck className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {lang === "de" ? "Bestätigungs-E-Mail gesendet" : "Confirmation email sent"}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {lang === "de"
                      ? `Wir haben eine Bestätigungs-E-Mail an ${email} gesendet. Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.`
                      : `We've sent a confirmation email to ${email}. Please click the link in the email to activate your account.`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lang === "de"
                      ? "Prüfen Sie auch Ihren Spam-Ordner."
                      : "Please also check your spam folder."}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => { setEmailSent(false); setIsLogin(true); }}
                    className="mt-2"
                  >
                    {lang === "de" ? "Zurück zum Login" : "Back to login"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
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
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    {lang === "de" ? "oder" : "or"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) toast({ title: String(error), variant: "destructive" });
                  }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  {lang === "de" ? "Mit Google anmelden" : "Sign in with Google"}
                </Button>
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
            )}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="border-t border-border bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            {lang === "de" ? "Unsere Pläne" : "Our Plans"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {lang === "de"
              ? "Starten Sie kostenlos und upgraden Sie jederzeit."
              : "Start for free and upgrade anytime."}
          </p>
        </div>
        <div className="mx-auto max-w-4xl mt-8">
          <PricingPlans compact />
        </div>
      </div>

      {/* Contact Section */}
      <div className="px-4 py-16">
        <ContactSection />
      </div>

      <footer className="py-4 text-center space-x-4">
        <Link to="/demo" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          {lang === "de" ? "Für Steuerberater" : "For Tax Advisors"}
        </Link>
        <Link to="/impressum" state={{ from: "/auth" }} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          Impressum
        </Link>
        <Link to="/datenschutz" state={{ from: "/auth" }} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          {lang === "de" ? "Datenschutz" : "Privacy"}
        </Link>
      </footer>
    </div>
  );
};

export default Auth;
