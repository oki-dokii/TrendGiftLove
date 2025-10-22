import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";

export interface FilterState {
  priceRange: [number, number];
  category?: string;
  minRating?: number;
  primeOnly: boolean;
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApply: () => void;
  onClear: () => void;
}

const CATEGORIES = [
  "All Categories",
  "Technology",
  "Books",
  "Music",
  "Art",
  "Sports",
  "Cooking",
  "Travel",
  "Gaming",
  "Fashion",
  "Fitness",
];

export default function FilterBar({
  filters,
  onFiltersChange,
  onApply,
  onClear,
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.category !== undefined ||
    filters.minRating !== undefined ||
    filters.primeOnly ||
    filters.priceRange[0] !== 0 ||
    filters.priceRange[1] !== 50000;

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Price Range</Label>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-16">
            ₹{filters.priceRange[0]}
          </span>
          <Slider
            value={filters.priceRange}
            onValueChange={(value) =>
              updateFilter("priceRange", value as [number, number])
            }
            min={0}
            max={50000}
            step={500}
            className="flex-1"
            data-testid="slider-price-range"
          />
          <span className="text-sm text-muted-foreground w-20 text-right">
            ₹{filters.priceRange[1]}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={filters.category || "All Categories"}
          onValueChange={(value) =>
            updateFilter("category", value === "All Categories" ? undefined : value)
          }
        >
          <SelectTrigger data-testid="select-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Minimum Rating</Label>
        <Select
          value={filters.minRating?.toString() || "all"}
          onValueChange={(value) =>
            updateFilter("minRating", value === "all" ? undefined : parseFloat(value))
          }
        >
          <SelectTrigger data-testid="select-rating">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="4">4⭐ and above</SelectItem>
            <SelectItem value="4.5">4.5⭐ and above</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="prime-only">Prime Only</Label>
        <Switch
          id="prime-only"
          checked={filters.primeOnly}
          onCheckedChange={(checked) => updateFilter("primeOnly", checked)}
          data-testid="switch-prime-only"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onApply} className="flex-1" data-testid="button-apply-filters">
          Apply Filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClear}
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5" />
            <h3 className="font-semibold">Filters</h3>
            {hasActiveFilters && (
              <span className="ml-auto text-xs text-muted-foreground">
                {[
                  filters.category && "Category",
                  filters.minRating && "Rating",
                  filters.primeOnly && "Prime",
                  (filters.priceRange[0] !== 0 || filters.priceRange[1] !== 50000) &&
                    "Price",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
          <FilterContent />
        </Card>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full" data-testid="button-open-filters">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  Active
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
