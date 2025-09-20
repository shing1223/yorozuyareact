// types/cart.ts

// 定義通用的幣別型別（可以限制，也可以開放 string）
export type CurrencyCode = 'TWD' | 'USD' | 'JPY' | 'EUR' | string;

export type CartItem = {
  merchant_slug: string;
  ig_media_id: string;
  title: string;
  image: string;
  permalink?: string;
  caption?: string;
  price?: number;          // ← 商品定價
  currency?: CurrencyCode; // ← 幣別
  qty: number;
};

export type Cart = {
  items: CartItem[];
};

// 用來在加入購物車時傳入，qty 可省略，預設 1
export type CartItemInput = Omit<CartItem, 'qty'> & { qty?: number };