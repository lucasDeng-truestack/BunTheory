export interface MenuOption {
  id: string;
  label: string;
  priceDelta: number;
  sortOrder: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  sortOrder: number;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isFavorite: boolean;
  available: boolean;
  maxQuantity: number | null;
  sortOrder: number;
  createdAt: string;
  soldOut: boolean;
  soldQuantity: number;
  optionGroups: MenuOptionGroup[];
}
