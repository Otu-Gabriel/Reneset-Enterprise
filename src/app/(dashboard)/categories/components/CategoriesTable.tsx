"use client";

import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Search, Plus, Upload, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { TablePageSkeleton } from "@/components/ui/table-skeletons";
import {
  dashboardSectionCardClass,
  dashboardSectionCardHeaderClass,
  dashboardSectionCardTitleClass,
  dashboardSectionTableContentClass,
} from "@/lib/dashboard-card";
import { EditCategoryModal } from "./EditCategoryModal";
import { AddCategoryModal } from "./AddCategoryModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const SEARCH_DEBOUNCE_MS = 400;

interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    brands: number;
  };
}

interface CategoriesTableProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function CategoriesTable({
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: CategoriesTableProps) {
  const { data: session } = useSession();
  const showCategoryActions = canEdit || canDelete;
  const categoryColumnCount = showCategoryActions ? 5 : 4;
  const categoryColumnLabels = [
    "Name",
    "Description",
    "Brands",
    "Created",
    ...(showCategoryActions ? ["Actions"] : []),
  ];
  const [categories, setCategories] = useState<Category[]>([]);
  const isFirstFetch = useRef(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch((prev) => {
        if (prev !== searchInput) {
          setPage(1);
        }
        return searchInput;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    fetchCategories();
  }, [page, search]);

  const fetchCategories = async () => {
    try {
      if (isFirstFetch.current) {
        setInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);

      const response = await fetch(`/api/categories?${params}`);
      const data = await response.json();
      setCategories(data.categories || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
      isFirstFetch.current = false;
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Please select a file");
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/categories/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setImportResults(data.results);
        fetchCategories();
        if (data.results.failed === 0) {
          setImportOpen(false);
          setImportFile(null);
        }
      } else {
        alert(data.error || "Failed to import categories");
      }
    } catch (error) {
      console.error("Error importing categories:", error);
      alert("Failed to import categories");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category");
    }
  };

  if (initialLoading) {
    return (
      <TablePageSkeleton
        columnCount={categoryColumnCount}
        rowCount={10}
        toolbar="filters"
        columnLabels={categoryColumnLabels}
      />
    );
  }

  return (
    <>
      <Card className={dashboardSectionCardClass}>
        <CardHeader className={dashboardSectionCardHeaderClass}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <CardTitle
              className={`${dashboardSectionCardTitleClass} hidden sm:block`}
            >
              Categories
            </CardTitle>
            <div className="flex items-center flex-col sm:flex-row sm:flex-wrap gap-2 w-full sm:w-auto">
              {canCreate && (
                <>
                  <AddCategoryModal onSuccess={fetchCategories}>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  </AddCategoryModal>
                  <Dialog open={importOpen} onOpenChange={setImportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import Categories from Excel</DialogTitle>
                        <DialogDescription>
                          Upload an Excel file with columns: Name, Description
                          (optional)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="file">Excel File</Label>
                          <Input
                            id="file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) =>
                              setImportFile(e.target.files?.[0] || null)
                            }
                          />
                        </div>
                        {importResults && (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="font-medium mb-2">
                              Import Results: {importResults.success} succeeded,{" "}
                              {importResults.failed} failed
                            </p>
                            {importResults.errors.length > 0 && (
                              <div className="mt-2 max-h-40 overflow-y-auto">
                                <p className="text-sm font-medium text-red-600 mb-1">
                                  Errors:
                                </p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {importResults.errors
                                    .slice(0, 10)
                                    .map((error, idx) => (
                                      <li key={idx}>{error}</li>
                                    ))}
                                  {importResults.errors.length > 10 && (
                                    <li>
                                      ... and {importResults.errors.length - 10}{" "}
                                      more
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setImportOpen(false);
                            setImportFile(null);
                            setImportResults(null);
                          }}
                        >
                          Close
                        </Button>
                        <Button
                          onClick={handleImport}
                          disabled={importing || !importFile}
                        >
                          {importing ? "Importing..." : "Import"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              <div className="relative w-full sm:w-auto ">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search categories..."
                  className="pl-9 sm:w-64 w-full"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                  aria-busy={isRefreshing}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`relative ${dashboardSectionTableContentClass}`}>
          <div className="relative overflow-x-auto">
            {isRefreshing && (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/40 pt-12 backdrop-blur-[1px]"
                aria-live="polite"
              >
                <span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Updating results…
                </span>
              </div>
            )}
          <Table
            className={isRefreshing ? "opacity-60 transition-opacity" : ""}
          >
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Brands</TableHead>
                <TableHead>Created</TableHead>
                {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit || canDelete ? 5 : 4}
                    className="text-center py-8"
                  >
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {category._count.brands} brand
                        {category._count.brands !== 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(category.createdAt).toLocaleDateString()}
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(category.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          onSuccess={fetchCategories}
        />
      )}
    </>
  );
}
