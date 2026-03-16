"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Asset {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category?: string;
  comment?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    currency: "ARS",
    category: "",
    comment: "",
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      setAssets(data);
      setLoading(false);
    } catch (error) {
      toast.error("Error al cargar los activos");
      setLoading(false);
    }
  };

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        description: asset.description,
        amount: String(asset.amount / 100),
        currency: asset.currency,
        category: asset.category || "none",
        comment: asset.comment || "",
      });
    } else {
      setEditingAsset(null);
      setFormData({
        description: "",
        amount: "",
        currency: "ARS",
        category: "none",
        comment: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.amount) {
      toast.error("Descripción y monto son requeridos");
      return;
    }

    try {
      const categoryValue = formData.category === "none" ? null : formData.category;
      
      if (editingAsset) {
        const res = await fetch("/api/assets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: editingAsset.id,
            description: formData.description,
            amount: Math.round(parseFloat(formData.amount) * 100),
            currency: formData.currency,
            category: categoryValue,
            comment: formData.comment || null,
          }),
        });

        if (!res.ok) throw new Error("Error al actualizar");
        toast.success("Activo actualizado");
      } else {
        const res = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: formData.description,
            amount: Math.round(parseFloat(formData.amount) * 100),
            currency: formData.currency,
            category: categoryValue,
            comment: formData.comment || null,
          }),
        });

        if (!res.ok) throw new Error("Error al crear");
        toast.success("Activo creado");
      }

      setDialogOpen(false);
      fetchAssets();
    } catch (error) {
      toast.error("Error al guardar el activo");
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este activo?")) {
      return;
    }

    try {
      const res = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });

      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Activo eliminado");
      fetchAssets();
    } catch (error) {
      toast.error("Error al eliminar el activo");
    }
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR");
  };

  const totalByAssets = assets.reduce((acc, asset) => {
    const key = asset.currency;
    if (!acc[key]) acc[key] = 0;
    acc[key] += asset.amount;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">dónde está mi plata</h1>
            <p className="text-gray-600">
              Gestiona y rastrea la ubicación de tus activos
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>+ Nuevo Activo</Button>
        </div>

      {/* Summary Cards */}
      {Object.entries(totalByAssets).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(totalByAssets).map(([currency, total]) => (
            <Card key={currency}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total {currency}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ${formatAmount(total)} {currency}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activos</CardTitle>
          <CardDescription>
            Total de {assets.length} activos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No hay activos registrados</p>
              <Button onClick={() => handleOpenDialog()}>
                Crear primer activo
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comentario</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">
                        {asset.description}
                      </TableCell>
                      <TableCell>
                        ${formatAmount(asset.amount)} {asset.currency}
                      </TableCell>
                      <TableCell>
                        {asset.category && (
                          <Badge variant="outline">{asset.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(asset.date)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {asset.comment && (
                          <div className="max-w-xs truncate" title={asset.comment}>
                            {asset.comment}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(asset)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(asset.id)}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for creating/editing assets */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? "Editar Activo" : "Nuevo Activo"}
            </DialogTitle>
            <DialogDescription>
              {editingAsset
                ? "Actualiza los detalles de tu activo"
                : "Registra dónde está tu plata"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Input
                id="description"
                placeholder="Ej: Invertí en un negocio, Ahorros en casa"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  <SelectItem value="business">Negocio</SelectItem>
                  <SelectItem value="savings">Ahorros</SelectItem>
                  <SelectItem value="home">Casa</SelectItem>
                  <SelectItem value="bank">Banco</SelectItem>
                  <SelectItem value="investment">Inversión</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="comment">Comentario</Label>
              <textarea
                id="comment"
                placeholder="Ej: En casa, desde el 2024, etc"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingAsset ? "Actualizar" : "Crear"} Activo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}
