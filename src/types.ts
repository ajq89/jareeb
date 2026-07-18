/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export type SubscriptionPlan = 'starter' | 'pro' | 'enterprise';

export interface Vendor {
  id: string;
  uid: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  phone?: string;
  instagram?: string;
  location?: string;
  iban: string;
  plan?: SubscriptionPlan;
  subscriptionStatus?: 'active' | 'expired' | 'trial';
  subscriptionEndDate?: string;
  createdAt: string;
  pickupRegion?: string;
  pickupTimes?: string;
  pickupDetails?: string;
  bankName?: string;
  bankAccountName?: string;
  ownerName?: string;
  isClosedByUser?: boolean;
  isPublic?: boolean;
  customDomain?: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface Size {
  id: string;
  name: string;
  price: number;
  label: string;
}

export type ProductCategory = 'drink' | 'meal' | 'canned' | 'other';

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: ProductCategory;
  addons?: Addon[];
  sizes?: Size[];
  stock?: number;
  isOutOfStock?: boolean;
  // Category specific fields
  volume?: string;
  calories?: string;
  weight?: string;
  expiryDate?: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'processing' | 'ready' | 'arrived' | 'completed';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  selectedAddons?: Addon[];
  selectedSize?: Size;
}

export interface CarDetails {
  type: string;
  color: string;
  plate: string;
}

export interface Order {
  id: string;
  vendorId: string;
  customerName: string;
  customerPhone: string;
  pickupTime: string;
  pickupOption: 'asap' | 'scheduled';
  scheduledPickupTime?: string; // ISO format
  status: OrderStatus | 'upgrade_approved';
  items: OrderItem[];
  total: number;
  carDetails?: CarDetails;
  notifyWhenReady?: boolean;
  receiptUrl?: string;
  onMyWay?: boolean;
  createdAt: string;
  newPlan?: SubscriptionPlan;
}

export interface Customer {
  id: string;
  vendorId: string;
  name: string;
  phone: string;
  notes?: string;
  createdAt: string;
}

