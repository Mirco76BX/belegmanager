import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, getLocale } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Car, Plus, Download, Trash2, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const calculatedAmount = distanceKm ? (parseFloat(distanceKm) * RATE_PER_KM) : 0;

  const fetchTrips = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("receipts")
      .select("id, date, description, amount, license_plate, mileage, meeting_purpose, created_at")
      .eq("receipt_type", "trip")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (data) {
      setTrips(data.map(r => ({
        id: r.id,
        date: r.date,
        start_location: r.description?.split(" → ")[0] || "",
        end_location: r.description?.split(" → ")[1] || "",
        distance_km: r.mileage || 0,
        amount: r.amount || 0,
        purpose: r.meeting_purpose || "",
        license_plate: r.license_plate || "",
        created_at: r.created_at,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrips();
    if (user) {
      supabase.from("vehicles").select("license_plate, name").order("license_plate")
        .then(({ data }) => { if (data) setSavedVehicles(data); });
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
      toast({ title: tt({ de: "Fahrt gespeichert!", en: "Trip saved!" }) });
      setDialogOpen(false);
      setStartLocation(""); setEndLocation(""); setDistanceKm(""); setPurpose(""); setLicensePlate("");
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
    line("Pauschale:", `${RATE_PER_KM.toFixed(2)} € / km`);
    line("Betrag:", `${trip.amount.toFixed(2)} €`);
    if (trip.license_plate) line("Kennzeichen:", trip.license_plate);
    if (trip.purpose) line("Zweck:", trip.purpose);

    y += 10;
    doc.setFontSize(8);
    doc.text("Gemäß § 9 Abs. 1 Satz 3 Nr. 4 EStG (Entfernungspauschale 0,30 € je Fahrtkilometer)", 20, y);
    y += 15;
    doc.text("_____________________________", 20, y);
    y += 6;
    doc.setFontSize(9);
    doc.text("Unterschrift", 20, y);

    doc.save(`Eigenbeleg_Fahrt_${trip.date}.pdf`);
    toast({ title: tt({ de: "PDF-Eigenbeleg erstellt!", en: "PDF receipt generated!" }) });
  };

  const totalKm = trips.reduce((s, t) => s + t.distance_km, 0);
  const totalAmount = trips.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">
          {tt({ de: "Fahrtkosten-Assistent", en: "Trip Cost Assistant" })}
        </h1>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {tt({ de: "Neue Fahrt", en: "New Trip" })}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tt({ de: "Gesamte km", en: "Total km" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKm.toLocaleString(locale)} km</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tt({ de: "Erstattung", en: "Reimbursement" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString(locale, { minimumFractionDigits: 2 })} €</div>
          </CardContent>
        </Card>
      </div>

      {/* Trips list */}
      {trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">{tt({ de: "Keine Fahrten erfasst", en: "No trips recorded" })}</p>
            <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {tt({ de: "Erste Fahrt erfassen", en: "Record first trip" })}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tt({ de: "Datum", en: "Date" })}</TableHead>
                    <TableHead>{tt({ de: "Strecke", en: "Route" })}</TableHead>
                    <TableHead className="text-right">{tt({ de: "km", en: "km" })}</TableHead>
                    <TableHead className="text-right">{tt({ de: "Betrag", en: "Amount" })}</TableHead>
                    <TableHead>{tt({ de: "Zweck", en: "Purpose" })}</TableHead>
                    <TableHead className="text-right">{tt({ de: "Aktionen", en: "Actions" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="whitespace-nowrap">{new Date(trip.date).toLocaleDateString(locale)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{trip.start_location} → {trip.end_location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{trip.distance_km}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{trip.amount.toFixed(2)} €</TableCell>
                      <TableCell className="max-w-[150px] truncate">{trip.purpose || "–"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => generatePdfEigenbeleg(trip)} title="PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(trip.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {trips.map((trip) => (
              <Card key={trip.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold">{trip.amount.toFixed(2)} €</span>
                    <span className="text-xs text-muted-foreground">{new Date(trip.date).toLocaleDateString(locale)}</span>
                  </div>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {trip.start_location} → {trip.end_location}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{trip.distance_km} km · {trip.purpose || "–"}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => generatePdfEigenbeleg(trip)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(trip.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* New Trip Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tt({ de: "Neue Fahrt erfassen", en: "Record New Trip" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{tt({ de: "Datum", en: "Date" })}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "Startort", en: "Start Location" })}</Label>
              <Input value={startLocation} onChange={(e) => setStartLocation(e.target.value)} placeholder={tt({ de: "z.B. Büro Köln", en: "e.g. Office Cologne" })} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "Zielort", en: "Destination" })}</Label>
              <Input value={endLocation} onChange={(e) => setEndLocation(e.target.value)} placeholder={tt({ de: "z.B. Kunde Düsseldorf", en: "e.g. Client Düsseldorf" })} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "Entfernung (km)", en: "Distance (km)" })}</Label>
              <Input type="number" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="0" className="h-11" />
              {distanceKm && parseFloat(distanceKm) > 0 && (
                <p className="text-sm font-medium text-primary">
                  = {calculatedAmount.toFixed(2)} € ({tt({ de: `${RATE_PER_KM.toFixed(2)} €/km`, en: `${RATE_PER_KM.toFixed(2)} €/km` })})
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "Zweck der Fahrt", en: "Trip Purpose" })}</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={tt({ de: "z.B. Kundentermin", en: "e.g. Client meeting" })} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>{tt({ de: "Kennzeichen (optional)", en: "License Plate (optional)" })}</Label>
              {savedVehicles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {savedVehicles.map((v) => (
                    <button
                      key={v.license_plate}
                      type="button"
                      onClick={() => setLicensePlate(v.license_plate)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-colors ${
                        licensePlate === v.license_plate
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      🚗 {v.license_plate}{v.name ? ` · ${v.name}` : ""}
                    </button>
                  ))}
                </div>
              )}
              <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder={tt({ de: "z.B. K-AB 1234", en: "e.g. K-AB 1234" })} className="h-11 font-mono uppercase" />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving || !startLocation.trim() || !endLocation.trim() || !distanceKm}>
              {tt({ de: "Fahrt speichern", en: "Save Trip" })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fahrtkosten;
