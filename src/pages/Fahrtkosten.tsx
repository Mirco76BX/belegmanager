import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Car, Plus, Download, Trash2, MapPin } from "lucide-react";
import jsPDF from "jspdf";

const RATE_PER_KM = 0.30;

interface Trip {
  id: string;
  date: string;
  start_location: string;
  end_location: string;
  distance_km: number;
  amount: number;
  purpose: string;
  license_plate: string;
  created_at: string;
}

const Fahrtkosten = () => {
  const { user } = useAuth();
  const { lang, tt } = useLanguage();
  const locale = getLocale(lang);
  const { toast } = useToast();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedVehicles, setSavedVehicles] = useState<{ license_plate: string; name: string | null }[]>([]);

  // Form
  const [date, setDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [purpose, setPurpose] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [saving, setSaving] = useState(false);

  const calculatedAmount = distanceKm ? parseFloat(distanceKm) * RATE_PER_KM : 0;

  const fetchTrips = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("receipts")
      .select("id, date, description, amount, license_plate, mileage, meeting_purpose, created_at")
      .eq("receipt_type", "trip")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (data) {
      setTrips(
        data.map((r) => ({
          id: r.id,
          date: r.date,
          start_location: r.description?.split(" → ")[0] || "",
          end_location: r.description?.split(" → ")[1] || "",
          distance_km: r.mileage || 0,
          amount: r.amount || 0,
          purpose: r.meeting_purpose || "",
          license_plate: r.license_plate || "",
          created_at: r.created_at,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrips();
    if (user) {
      supabase
        .from("vehicles")
        .select("license_plate, name")
        .order("license_plate")
        .then(({ data }) => {
          if (data) setSavedVehicles(data);
        });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user || !startLocation.trim() || !endLocation.trim() || !distanceKm) return;
    setSaving(true);

    const km = parseFloat(distanceKm);
    const amt = km * RATE_PER_KM;

    const { error } = await supabase.from("receipts").insert({
      user_id: user.id,
      date,
      description: `${startLocation.trim()} → ${endLocation.trim()}`,
      amount: Math.round(amt * 100) / 100,
      amount_eur: Math.round(amt * 100) / 100,
      currency: "EUR",
      receipt_type: "trip",
      status: "complete",
      license_plate: licensePlate || null,
      mileage: km,
      meeting_purpose: purpose || null,
      tax_category: "reisekosten_fahrt",
      vat_rate: 0,
      vat_amount: 0,
    });

    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: tt({ de: "Fahrt gespeichert", en: "Trip saved" }) });
      setDialogOpen(false);
      setStartLocation("");
      setEndLocation("");
      setDistanceKm("");
      setPurpose("");
      setLicensePlate("");
      fetchTrips();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (!error) fetchTrips();
  };

  const generatePdfEigenbeleg = (trip: Trip) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("Eigenbeleg – Fahrtkosten", pw / 2, 25, { align: "center" });

    doc.setFontSize(10);
    let y = 45;
    const line = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 80, y);
      y += 8;
    };

    line("Datum:", new Date(trip.date).toLocaleDateString(locale));
    line("Start:", trip.start_location);
    line("Ziel:", trip.end_location);
    line("Entfernung:", `${trip.distance_km} km`);
    line("Pauschale:", `${RATE_PER_KM.toFixed(2)} € / km`);
    line("Betrag:", `${trip.amount.toFixed(2)} €`);
    if (trip.license_plate) line("Kennzeichen:", trip.license_plate);
    if (trip.purpose) line("Zweck:", trip.purpose);

    y += 10;
    doc.setFontSize(8);
    doc.text("Gemäß § 9 Abs. 1 Satz 3 Nr. 4 EStG (Entfernungspauschale 0,30 € je Fahrtkilometer)", 20, y);
    y += 15;
    doc.text("_____________________________", 20, y);
    y += 6;
    doc.setFontSize(9);
    doc.text("Unterschrift", 20, y);

    doc.save(`Eigenbeleg_Fahrt_${trip.date}.pdf`);
    toast({ title: tt({ de: "PDF-Eigenbeleg erstellt", en: "PDF receipt generated" }) });
  };

  const totalKm = trips.reduce((s, t) => s + t.distance_km, 0);
  const totalAmount = trips.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-caption-2 uppercase tracking-wider text-muted-foreground">
            {tt({ de: "Reisekosten", en: "Travel" })}
          </p>
          <h1 className="text-title-1 md:text-large-title font-bold tracking-tight">
            {tt({ de: "Fahrtkosten", en: "Trip Costs" })}
          </h1>
        </div>
        <Button
          className="h-13 px-5 text-body font-semibold text-primary-foreground gap-2 shrink-0"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">{tt({ de: "Neue Fahrt", en: "New Trip" })}</span>
        </Button>
      </div>

      {/* Hero-Stat-Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-footnote text-muted-foreground">
              {tt({ de: "Gesamte Strecke", en: "Total Distance" })}
              <span className="text-caption-1 text-muted-foreground/60"> (in km)</span>
            </span>
            <Car className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-2xl md:text-title-1 font-bold font-mono tabular-nums whitespace-nowrap overflow-hidden">
            {totalKm.toLocaleString(locale)}
          </p>
          <p className="text-caption-1 text-muted-foreground mt-1">
            {tt({ de: `bei ${RATE_PER_KM.toFixed(2).replace(".", ",")} €/km`, en: `at ${RATE_PER_KM.toFixed(2)} €/km` })}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-footnote text-muted-foreground">
              {tt({ de: "Erstattung", en: "Reimbursement" })}
              <span className="text-caption-1 text-muted-foreground/60"> (in €)</span>
            </span>
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-2xl md:text-title-1 font-bold font-mono tabular-nums whitespace-nowrap overflow-hidden">
            {totalAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-caption-1 text-muted-foreground mt-1">
            {tt({ de: "§ 9 Abs. 1 EStG", en: "§ 9 (1) EStG" })}
          </p>
        </div>
      </div>

      {/* Fahrten-Liste */}
      {loading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground text-body">
          {tt({ de: "Laden...", en: "Loading..." })}
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-title-3 font-semibold">
              {tt({ de: "Noch keine Fahrten", en: "No trips yet" })}
            </p>
            <p className="text-subhead text-muted-foreground">
              {tt({
                de: "Erfasse deine erste Geschäftsfahrt, um Erstattungen zu berechnen.",
                en: "Record your first business trip to calculate reimbursements.",
              })}
            </p>
          </div>
          <Button
            className="h-13 px-6 text-body font-semibold text-primary-foreground gap-2"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-5 w-5" />
            {tt({ de: "Erste Fahrt erfassen", en: "Record first trip" })}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="px-1">
            <p className="text-caption-2 uppercase tracking-wider text-muted-foreground font-semibold">
              {tt({ de: "Erfasste Fahrten", en: "Recorded Trips" })}
            </p>
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {trips.map((trip) => (
              <div key={trip.id} className="px-4 py-3.5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-body font-medium truncate">
                        {trip.start_location} → {trip.end_location}
                      </p>
                    </div>
                    <p className="text-footnote text-muted-foreground mt-0.5">
                      {new Date(trip.date).toLocaleDateString(locale)} · {trip.distance_km}{" "}km
                      {trip.purpose ? ` · ${trip.purpose}` : ""}
                    </p>
                  </div>
                  <span className="text-body font-mono font-semibold tabular-nums whitespace-nowrap shrink-0">
                    {trip.amount.toFixed(2).replace(".", lang === "de" ? "," : ".")}
                    {" "}€
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    className="h-9 px-3 text-footnote gap-1.5"
                    onClick={() => generatePdfEigenbeleg(trip)}
                  >
                    <Download className="h-4 w-4" />
                    Eigenbeleg
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => handleDelete(trip.id)}
                    aria-label={tt({ de: "Löschen", en: "Delete" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Trip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-title-2 font-bold">
              {tt({ de: "Neue Fahrt erfassen", en: "Record New Trip" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-footnote font-medium">{tt({ de: "Datum", en: "Date" })}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 text-body" />
            </div>
            <div className="space-y-2">
              <Label className="text-footnote font-medium">{tt({ de: "Startort", en: "Start Location" })}</Label>
              <Input
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder={tt({ de: "z.B. Büro Köln", en: "e.g. Office Cologne" })}
                className="h-12 text-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-footnote font-medium">{tt({ de: "Zielort", en: "Destination" })}</Label>
              <Input
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                placeholder={tt({ de: "z.B. Kunde Düsseldorf", en: "e.g. Client Düsseldorf" })}
                className="h-12 text-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-footnote font-medium">{tt({ de: "Entfernung (km)", en: "Distance (km)" })}</Label>
              <Input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="0"
                className="h-12 text-body"
              />
              {distanceKm && parseFloat(distanceKm) > 0 && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5 text-subhead">
                  <span className="text-muted-foreground">{tt({ de: "Erstattung:", en: "Reimbursement:" })}</span>
                  <span className="font-mono font-semibold text-primary ml-2 whitespace-nowrap">
                    {calculatedAmount.toFixed(2).replace(".", lang === "de" ? "," : ".")}
                    {" "}€
                  </span>
                  <span className="text-caption-1 text-muted-foreground ml-2">
                    ({RATE_PER_KM.toFixed(2).replace(".", lang === "de" ? "," : ".")}
                    {" "}€/km)
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-footnote font-medium">{tt({ de: "Zweck der Fahrt", en: "Trip Purpose" })}</Label>
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={tt({ de: "z.B. Kundentermin", en: "e.g. Client meeting" })}
                className="h-12 text-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-footnote font-medium">
                {tt({ de: "Kennzeichen (optional)", en: "License Plate (optional)" })}
              </Label>
              {savedVehicles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {savedVehicles.map((v) => (
                    <button
                      key={v.license_plate}
                      type="button"
                      onClick={() => setLicensePlate(v.license_plate)}
                      className={`text-footnote px-3 py-1.5 rounded-full border font-mono transition-colors ${
                        licensePlate === v.license_plate
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {v.license_plate}
                      {v.name ? ` · ${v.name}` : ""}
                    </button>
                  ))}
                </div>
              )}
              <Input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder={tt({ de: "z.B. K-AB 1234", en: "e.g. K-AB 1234" })}
                className="h-12 text-body font-mono uppercase"
              />
            </div>
            <Button
              className="w-full h-13 text-body font-semibold text-primary-foreground"
              onClick={handleSave}
              disabled={saving || !startLocation.trim() || !endLocation.trim() || !distanceKm}
            >
              {saving ? tt({ de: "Speichert...", en: "Saving..." }) : tt({ de: "Fahrt speichern", en: "Save Trip" })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fahrtkosten;
