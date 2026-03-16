"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface User {
  id: string;
  username: string;
}

export default function NuevoPagoPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [deudaEnUSD, setDeudaEnUSD] = useState<any>(null);
  const [cotizacionDolar, setCotizacionDolar] = useState("");
  const [form, setForm] = useState({
    toUserId: "",
    amount: "",
    comment: "",
    currency: "ARS",
  });

  const userId = session?.user?.id || "";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        // Filter out current user
        setUsers(data.filter((u: User) => u.id !== userId));
      } catch (error) {
        toast.error("Error al cargar usuarios");
        console.error(error);
      }
    };

    if (userId) {
      fetchUsers();
    }
  }, [userId]);

  const loadDeudaEnUSD = async (toUserId: string) => {
    if (!toUserId) {
      setDeudaEnUSD(null);
      return;
    }

    try {
      const res = await fetch(`/api/debts?userId=${toUserId}&isAdmin=true`);
      const debts = await res.json();

      // Find USD debts where the current user is the creditor
      const deuda = debts.find(
        (d: any) => d.currency === "USD" && d.debtorId === userId && d.creditorId === toUserId
      );

      setDeudaEnUSD(deuda || null);
    } catch (error) {
      console.error("Error cargando deudas:", error);
      setDeudaEnUSD(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe superar 5MB");
        return;
      }
      // Validate file type
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.toUserId || !form.amount) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    if (!file) {
      toast.error("El comprobante de pago es requerido");
      return;
    }

    setLoading(true);
    try {
      let receiptUrl = null;

      // Upload file if provided
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "receipts");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Error al cargar la imagen");
        }

        const uploadData = await uploadRes.json();
        receiptUrl = uploadData.url;
      }

      // Create payment
      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: userId,
          toUserId: form.toUserId,
          amount: parseInt(form.amount) * 100, // Convert to cents
          currency: form.currency,
          exchangeRate: cotizacionDolar ? parseFloat(cotizacionDolar) : null,
          comment: form.comment || null,
          receiptUrl: receiptUrl,
        }),
      });

      if (!paymentRes.ok) {
        throw new Error("Error al crear el pago");
      }

      toast.success("Pago registrado correctamente");
      router.push("/dashboard/pagos");
    } catch (error) {
      toast.error("Error al registrar el pago");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Registrar Nuevo Pago</CardTitle>
          <CardDescription>
            Registra un pago a otro usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="to">Para (Usuario)</Label>
              <Select
                value={form.toUserId}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, toUserId: value }));
                  loadDeudaEnUSD(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona destino" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deudaEnUSD && (
                <p className="text-sm text-amber-600 mt-2">
                  ⚠️ Este usuario tiene una deuda pendiente de ${(deudaEnUSD.amount / 100).toFixed(2)} USD
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="100.000"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS (Pesos Argentinos)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {deudaEnUSD && form.currency === "ARS" && (
              <div className="space-y-2">
                <Label htmlFor="cotizacion">
                  Cotización del Dólar (ARS)
                </Label>
                <Input
                  id="cotizacion"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ej: 1200.50"
                  value={cotizacionDolar}
                  onChange={(e) => setCotizacionDolar(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  El pago de ${(parseInt(form.amount || "0")).toFixed(0)} ARS equivaldrá a aproximadamente ${(parseInt(form.amount || "0") / (parseFloat(cotizacionDolar) || 1)).toFixed(2)} USD
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comment">Comentario (opcional)</Label>
              <Input
                id="comment"
                type="text"
                placeholder="Ej: Transferencia bancaria"
                value={form.comment}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, comment: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt">
                Comprobante de Pago <span className="text-red-500">*</span> (imagen - máx 5MB)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  required
                />
              </div>
              {file && (
                <Badge variant="secondary" className="mt-2">
                  <Upload className="h-3 w-3 mr-1" />
                  {file.name}
                </Badge>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Registrando..." : "Registrar Pago"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
