import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product, Order, StoreSettings, CartItem, OrderStatus } from '../types';
import { DEFAULT_STORE_SETTINGS, DEFAULT_CONTACT_NUMBERS, STORE_NAME, hasLegacyBrandText, sanitizeStoreName, sanitizeBrandText, hasWrongPhoneText, sanitizeStorePhone, replaceWrongPhoneText, buildWhatsAppUrl } from '../data/constants';
import { useAuth } from './AuthContext';

export interface StatusNotice {
  orderId: string;
  status: OrderStatus;
  message: string;
  timestamp: number;
}

interface StoreContextType {
  products: Product[];
  orders: Order[]; // All orders for owner
  customerOrders: Order[]; // Customer's own order history
  settings: StoreSettings;
  cart: CartItem[];
  wishlist: string[];
  loadingProducts: boolean;
  loadingOrders: boolean;
  loadingSettings: boolean;
  orderStatusNotice: StatusNotice | null;
  clearStatusNotice: () => void;
  
  // Cart Actions
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotalCount: number;
  deliveryFee: number;
  cartFinalTotal: number;
  
  // Wishlist Actions
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Order Actions
  createOrder: (orderData: {
    customerName: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
    deliveryMethod?: 'courier' | 'pickup';
  }) => Promise<{ orderId: string; whatsappUrl: string; message: string }>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderDeliveryCharges: (orderId: string, deliveryCharges: number) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrderById: (orderId: string) => Promise<Order | null>;

  // Admin Product Actions
  addProduct: (productData: Omit<Product, 'id'>) => Promise<string>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Settings Actions
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  addBusinessCategory: (categoryName: string) => Promise<void>;
  removeBusinessCategory: (categoryName: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'ag_crown_cart_v3';
const WISHLIST_STORAGE_KEY = 'ag_crown_wishlist_v3';
const SETTINGS_STORAGE_KEY = 'ag_crown_settings_cache_v3';
const LEGACY_CART_KEYS = ['SAAD_TRADING_COMPANY_cart_clean_v2', 'as_empire_cart_v1'];
const LEGACY_WISHLIST_KEYS = ['saad_trading_company_wishlist_clean_v2', 'as_empire_wishlist_v1'];
const LEGACY_SETTINGS_KEYS = ['saad_trading_company_settings_cache_v2', 'as_empire_settings_cache_v1'];

function sanitizeSettingsObject(raw: Partial<StoreSettings>): StoreSettings {
  const merged = { ...DEFAULT_STORE_SETTINGS, ...raw };
  return {
    ...merged,
    storeName: sanitizeStoreName(merged.storeName),
    whatsappNumber: sanitizeStorePhone(merged.whatsappNumber, DEFAULT_CONTACT_NUMBERS[0]),
    whatsappNumber2: sanitizeStorePhone(merged.whatsappNumber2, DEFAULT_CONTACT_NUMBERS[1]),
    whatsappNumber3: sanitizeStorePhone(merged.whatsappNumber3, DEFAULT_CONTACT_NUMBERS[2]),
    contactPhone: sanitizeStorePhone(merged.contactPhone, DEFAULT_CONTACT_NUMBERS[0]),
    announcement: merged.announcement
      ? replaceWrongPhoneText(sanitizeBrandText(merged.announcement))
      : DEFAULT_STORE_SETTINGS.announcement,
    aboutText: merged.aboutText
      ? replaceWrongPhoneText(sanitizeBrandText(merged.aboutText))
      : DEFAULT_STORE_SETTINGS.aboutText,
    paymentInstructions: merged.paymentInstructions
      ? replaceWrongPhoneText(merged.paymentInstructions)
      : DEFAULT_STORE_SETTINGS.paymentInstructions,
    easyPaisaAccount: merged.easyPaisaAccount ? replaceWrongPhoneText(merged.easyPaisaAccount) : merged.easyPaisaAccount,
    jazzCashAccount: merged.jazzCashAccount ? replaceWrongPhoneText(merged.jazzCashAccount) : merged.jazzCashAccount,
    bankAccountDetails: merged.bankAccountDetails ? replaceWrongPhoneText(merged.bankAccountDetails) : merged.bankAccountDetails,
  };
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOwner, currentUser } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const migratedFirestoreRef = React.useRef<boolean>(false);

  // Initialize with cached settings and scrub any legacy store names from localStorage/sessionStorage
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      for (const oldKey of LEGACY_SETTINGS_KEYS) {
        localStorage.removeItem(oldKey);
        sessionStorage.removeItem(oldKey);
      }
      // Scrub any stray sessionStorage/localStorage cached settings containing old names
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && /settings|store/i.test(k)) {
          const val = sessionStorage.getItem(k);
          if (val && (hasLegacyBrandText(val) || hasWrongPhoneText(val))) {
            sessionStorage.setItem(k, replaceWrongPhoneText(sanitizeBrandText(val)));
          }
        }
      }

      const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<StoreSettings>;
        const cleaned = sanitizeSettingsObject(parsed);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STORE_SETTINGS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      for (const oldKey of LEGACY_CART_KEYS) {
        const oldSaved = localStorage.getItem(oldKey);
        if (oldSaved) {
          localStorage.setItem(CART_STORAGE_KEY, oldSaved);
          localStorage.removeItem(oldKey);
          return JSON.parse(oldSaved);
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      for (const oldKey of LEGACY_WISHLIST_KEYS) {
        const oldSaved = localStorage.getItem(oldKey);
        if (oldSaved) {
          localStorage.setItem(WISHLIST_STORAGE_KEY, oldSaved);
          localStorage.removeItem(oldKey);
          return JSON.parse(oldSaved);
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);

  // Save cart
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  // Save wishlist
  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error(e);
    }
  }, [wishlist]);

  // Real-time Settings Listener
  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'website');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remote = docSnap.data() as Partial<StoreSettings>;
          const merged = sanitizeSettingsObject(remote);
          setSettings(merged);
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {
            console.error(e);
          }

          // One-time Firestore migration: overwrite legacy brand name, missing 3-number fields, or wrong 3rd phone number in settings/website
          const hasLegacyRemote =
            hasLegacyBrandText(remote.storeName) ||
            hasLegacyBrandText(remote.announcement) ||
            hasLegacyBrandText(remote.aboutText);
          const missingExtraPhones =
            !remote.whatsappNumber?.trim() ||
            !remote.whatsappNumber2?.trim() ||
            !remote.whatsappNumber3?.trim();
          const hasWrongPhoneRemote =
            hasWrongPhoneText(remote.whatsappNumber) ||
            hasWrongPhoneText(remote.whatsappNumber2) ||
            hasWrongPhoneText(remote.whatsappNumber3) ||
            hasWrongPhoneText(remote.contactPhone) ||
            hasWrongPhoneText(remote.announcement) ||
            hasWrongPhoneText(remote.aboutText) ||
            hasWrongPhoneText(remote.paymentInstructions) ||
            hasWrongPhoneText(remote.easyPaisaAccount) ||
            hasWrongPhoneText(remote.jazzCashAccount) ||
            hasWrongPhoneText(remote.bankAccountDetails);

          if (isOwner && (hasLegacyRemote || missingExtraPhones || hasWrongPhoneRemote) && !migratedFirestoreRef.current) {
            migratedFirestoreRef.current = true;
            setDoc(
              settingsDocRef,
              {
                storeName: merged.storeName,
                announcement: merged.announcement,
                aboutText: merged.aboutText,
                whatsappNumber: merged.whatsappNumber,
                whatsappNumber2: merged.whatsappNumber2,
                whatsappNumber3: merged.whatsappNumber3,
                contactPhone: merged.contactPhone,
                paymentInstructions: merged.paymentInstructions,
                easyPaisaAccount: merged.easyPaisaAccount || '',
                jazzCashAccount: merged.jazzCashAccount || '',
                bankAccountDetails: merged.bankAccountDetails || '',
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            ).catch((err) => console.warn('Settings migration note:', err));
          }
        } else {
          setSettings(DEFAULT_STORE_SETTINGS);
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_STORE_SETTINGS));
          } catch (e) {
            console.error(e);
          }
        }
        setLoadingSettings(false);
      },
      (error) => {
        console.warn('Settings load error (falling back to defaults):', error);
        setSettings(DEFAULT_STORE_SETTINGS);
        setLoadingSettings(false);
      }
    );

    return () => unsubscribe();
  }, [isOwner]);

  // Real-time Products Listener (starts with 0 products until owner adds them)
  useEffect(() => {
    const productsRef = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const loaded: Product[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Product, 'id'>)
          });
        });
        setProducts(loaded);
        setLoadingProducts(false);
      },
      (error) => {
        console.error('Products listener error:', error);
        setLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time Orders Listener for Owner Dashboard
  useEffect(() => {
    if (!isOwner) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setLoadingOrders(true);
    const ordersRef = collection(db, 'orders');
    const unsubscribe = onSnapshot(
      ordersRef,
      (snapshot) => {
        const loaded: Order[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Order, 'id'>)
          });
        });
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(loaded);
        setLoadingOrders(false);
      },
      (error) => {
        console.warn('Orders listener error (owner):', error);
        setLoadingOrders(false);
      }
    );

    return () => unsubscribe();
  }, [isOwner]);

  const [orderStatusNotice, setOrderStatusNotice] = useState<StatusNotice | null>(null);
  const clearStatusNotice = () => setOrderStatusNotice(null);

  const previousStatusesRef = React.useRef<Record<string, OrderStatus>>({});
  const isFirstCustomerLoadRef = React.useRef<boolean>(true);

  // Real-time Customer Orders (Order History for logged-in Customer)
  useEffect(() => {
    if (!currentUser || isOwner) {
      setCustomerOrders([]);
      previousStatusesRef.current = {};
      isFirstCustomerLoadRef.current = true;
      return;
    }

    const q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Order[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...(d.data() as Omit<Order, 'id'>) });
        });
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCustomerOrders(loaded);

        // Real-time status change detection
        if (!isFirstCustomerLoadRef.current) {
          for (const ord of loaded) {
            const oldStatus = previousStatusesRef.current[ord.id];
            if (oldStatus && oldStatus !== ord.status) {
              let msg = `Your order #${ord.id} status changed to ${ord.status}`;
              if (ord.status === 'Awaiting Payment') {
                msg = `Your order #${ord.id} is awaiting advance payment. Please share your payment screenshot on WhatsApp.`;
              } else if (ord.status === 'Confirmed') {
                msg = `Advance payment verified! Your order #${ord.id} has been confirmed by ${settings.storeName || STORE_NAME}.`;
              } else if (ord.status === 'Shipped') {
                msg = `Your order #${ord.id} has been shipped! It is on the way.`;
              } else if (ord.status === 'Delivered') {
                msg = `Your order #${ord.id} has been delivered! Enjoy your items.`;
              } else if (ord.status === 'Cancelled') {
                msg = `Your order #${ord.id} has been cancelled.`;
              }
              setOrderStatusNotice({
                orderId: ord.id,
                status: ord.status,
                message: msg,
                timestamp: Date.now()
              });
              break;
            }
          }
        } else {
          isFirstCustomerLoadRef.current = false;
        }

        const newMap: Record<string, OrderStatus> = {};
        loaded.forEach((o) => {
          newMap[o.id] = o.status;
        });
        previousStatusesRef.current = newMap;
      },
      (err) => {
        console.warn('Customer orders history note:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isOwner]);

  // Cart Management
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, Math.max(1, quantity)) }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const max = item.product.stock || 999;
          return { ...item, quantity: Math.min(max, quantity) };
        }
        return item;
      })
    );
  };

  const clearCart = () => setCart([]);

  const cartSubtotal = cart.reduce((sum, item) => {
    const itemPrice = item.product.discountPrice ?? item.product.price;
    return sum + itemPrice * item.quantity;
  }, 0);

  const cartTotalCount = cart.reduce((count, item) => count + item.quantity, 0);

  const deliveryFee = settings.deliveryFee ?? 250;

  const cartFinalTotal = cartSubtotal + deliveryFee;

  // Wishlist
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => 
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Order creation and WhatsApp message generator
  const createOrder = async (orderData: {
    customerName: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
    deliveryMethod?: 'courier' | 'pickup';
  }) => {
    if (cart.length === 0) {
      throw new Error('Your shopping cart is empty.');
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ASE-${new Date().getFullYear()}-${randomSuffix}`;

    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.discountPrice ?? item.product.price,
      quantity: item.quantity,
      image: item.product.images?.[0] || '',
      category: item.product.category || 'Mobile Spare'
    }));

    const isPickup = orderData.deliveryMethod === 'pickup';
    const computedDeliveryFee = isPickup ? 0 : deliveryFee;
    const computedGrandTotal = cartSubtotal + computedDeliveryFee;

    const finalOrder: Order = {
      id: orderId,
      ...(currentUser?.uid ? { customerId: currentUser.uid } : {}),
      customerName: orderData.customerName.trim(),
      customerEmail: currentUser?.email || '',
      phone: orderData.phone.trim(),
      address: orderData.address.trim(),
      city: orderData.city.trim(),
      items: orderItems,
      subtotal: cartSubtotal,
      deliveryCharges: computedDeliveryFee,
      deliveryMethod: orderData.deliveryMethod || 'courier',
      totalAmount: computedGrandTotal,
      paymentType: 'Advance Payment',
      status: 'Awaiting Payment',
      statusUpdatedAt: new Date().toISOString(),
      notes: orderData.notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Clean all undefined values to ensure Firestore compatibility
    const orderPayload = Object.fromEntries(
      Object.entries(finalOrder).filter(([_, v]) => v !== undefined)
    );

    // Save order directly into Firestore
    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await setDoc(orderDocRef, orderPayload);
      
      // Update local state immediately for instant feedback
      setOrders((prev) => [finalOrder, ...prev.filter((o) => o.id !== orderId)]);
      if (currentUser?.uid) {
        setCustomerOrders((prev) => [finalOrder, ...prev.filter((o) => o.id !== orderId)]);
      }
    } catch (error) {
      console.error('Order creation error:', error);
      handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
    }

    // Format WhatsApp message for owner
    const itemsFormatted = orderItems
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.name}* (${it.category || 'Product'})\n   Quantity: ${it.quantity} | Price: Rs. ${(it.price * it.quantity).toLocaleString('en-PK')}`
      )
      .join('\n');

    const activeStoreName = settings.storeName || STORE_NAME;
    const whatsappMessage = 
`📱 *NEW ORDER – ${activeStoreName.toUpperCase()}*
*Order Tracking ID:* #${orderId}
─────────────────────
*Customer Information:*
• Name: ${finalOrder.customerName}
• WhatsApp / Mobile: ${finalOrder.phone}
• City: ${finalOrder.city}
• Delivery Address: ${finalOrder.address}
${finalOrder.notes ? `• Special Notes: ${finalOrder.notes}\n` : ''}─────────────────────
*Ordered Displays / Products:*
${itemsFormatted}
─────────────────────
*Total Amount (PKR):*
• Subtotal: Rs. ${finalOrder.subtotal.toLocaleString('en-PK')}
• Delivery Charges: ${finalOrder.deliveryCharges > 0 ? `Rs. ${finalOrder.deliveryCharges.toLocaleString('en-PK')}` : 'Store Pickup / Confirmed on WhatsApp'}
• *GRAND TOTAL: Rs. ${finalOrder.totalAmount.toLocaleString('en-PK')} PKR*
─────────────────────
*Payment Type:*
• *Advance Payment Only* (EasyPaisa / JazzCash / Bank Transfer)
• *Status:* Awaiting Advance Payment
─────────────────────
_Assalam-o-Alaikum ${activeStoreName}! I have placed this order on your website. I am sending the advance payment screenshot here on WhatsApp to confirm my order._`;

    const primaryPhone = settings.whatsappNumber || DEFAULT_CONTACT_NUMBERS[0];
    const whatsappUrl = buildWhatsAppUrl(primaryPhone, whatsappMessage);

    clearCart();

    return { orderId, whatsappUrl, message: whatsappMessage };
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const now = new Date().toISOString();
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status,
        statusUpdatedAt: now,
        updatedAt: now
      });
      // Reflect in local state immediately
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status, statusUpdatedAt: now, updatedAt: now } : o));
      setCustomerOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status, statusUpdatedAt: now, updatedAt: now } : o));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const updateOrderDeliveryCharges = async (orderId: string, deliveryCharges: number) => {
    try {
      const targetOrder = orders.find((o) => o.id === orderId) || customerOrders.find((o) => o.id === orderId);
      const subtotal = targetOrder ? targetOrder.subtotal : 0;
      const cleanDelivery = Math.max(0, Math.round(deliveryCharges));
      const newTotal = subtotal + cleanDelivery;
      const now = new Date().toISOString();
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        deliveryCharges: cleanDelivery,
        totalAmount: newTotal,
        updatedAt: now
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, deliveryCharges: cleanDelivery, totalAmount: newTotal, updatedAt: now } : o))
      );
      setCustomerOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, deliveryCharges: cleanDelivery, totalAmount: newTotal, updatedAt: now } : o))
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const cancelOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'Cancelled');
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await deleteDoc(orderRef);
      // Remove from local order lists immediately
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setCustomerOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (error) {
      console.error('Error deleting order:', error);
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const getOrderById = async (orderId: string): Promise<Order | null> => {
    try {
      const orderRef = doc(db, 'orders', orderId.trim());
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as Omit<Order, 'id'>) };
      }
      return null;
    } catch (error) {
      console.warn('Error fetching order by ID:', error);
      return null;
    }
  };

  // Product Admin Operations
  const addProduct = async (productData: Omit<Product, 'id'>): Promise<string> => {
    const newId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const fullProduct: Product = {
      ...productData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'products', newId), fullProduct);
      return newId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${newId}`);
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const prodRef = doc(db, 'products', id);
      await updateDoc(prodRef, {
        ...productData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  // Settings update
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      const settingsRef = doc(db, 'settings', 'website');
      const updated = {
        ...sanitizeSettingsObject({ ...settings, ...newSettings }),
        updatedAt: new Date().toISOString()
      };
      setSettings(updated);
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      await setDoc(settingsRef, updated, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/website');
    }
  };

  const addBusinessCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed || settings.categories?.includes(trimmed)) return;
    const updated = [...(settings.categories || []), trimmed];
    await updateSettings({ categories: updated });
  };

  const removeBusinessCategory = async (categoryName: string) => {
    const updated = (settings.categories || []).filter((c) => c !== categoryName);
    await updateSettings({ categories: updated });
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        orders,
        customerOrders,
        settings,
        cart,
        wishlist,
        loadingProducts,
        loadingOrders,
        loadingSettings,
        orderStatusNotice,
        clearStatusNotice,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartSubtotal,
        cartTotalCount,
        deliveryFee,
        cartFinalTotal,
        toggleWishlist,
        isInWishlist,
        createOrder,
        updateOrderStatus,
        updateOrderDeliveryCharges,
        cancelOrder,
        deleteOrder,
        getOrderById,
        addProduct,
        updateProduct,
        deleteProduct,
        updateSettings,
        addBusinessCategory,
        removeBusinessCategory,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
