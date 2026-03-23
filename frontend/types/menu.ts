export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
  createdAt: string;
}
