import axios, { AxiosInstance } from 'axios';

export interface ShopifyCustomer {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  total_spent: string;
  orders_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle?: string;
  vendor?: string;
  product_type?: string;
  status?: string;
  variants: Array<{
    price: string;
    compare_at_price?: string;
    inventory_quantity?: number;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ShopifyOrder {
  id: string;
  order_number?: number;
  email?: string;
  financial_status?: string;
  fulfillment_status?: string;
  total_price: string;
  subtotal_price?: string;
  total_tax?: string;
  total_discounts?: string;
  currency?: string;
  customer?: {
    id: string;
  };
  line_items: Array<{
    id: string;
    product_id?: string;
    title: string;
    quantity: number;
    price: string;
    total_discount?: string;
    sku?: string;
    variant_title?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export class ShopifyService {
  private client: AxiosInstance;
  private shopDomain: string;
  private accessToken: string;

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.client = axios.create({
      baseURL: `https://${shopDomain}/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  // Fetch all customers with pagination
  async getCustomers(limit: number = 250): Promise<ShopifyCustomer[]> {
    const allCustomers: ShopifyCustomer[] = [];
    let pageInfo: string | null = null;

    do {
      const params: any = { limit };
      if (pageInfo) {
        params.page_info = pageInfo;
      }

      const response = await this.client.get('/customers.json', { params });
      const customers = response.data.customers || [];
      allCustomers.push(...customers);

      // Check for pagination link
      const linkHeader = response.headers.link;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>; rel="next"/);
        pageInfo = nextMatch ? nextMatch[1] : null;
      } else {
        pageInfo = null;
      }
    } while (pageInfo);

    return allCustomers;
  }

  // Fetch all products with pagination
  async getProducts(limit: number = 250): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let pageInfo: string | null = null;

    do {
      const params: any = { limit };
      if (pageInfo) {
        params.page_info = pageInfo;
      }

      const response = await this.client.get('/products.json', { params });
      const products = response.data.products || [];
      allProducts.push(...products);

      const linkHeader = response.headers.link;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>; rel="next"/);
        pageInfo = nextMatch ? nextMatch[1] : null;
      } else {
        pageInfo = null;
      }
    } while (pageInfo);

    return allProducts;
  }

  // Fetch all orders with pagination
  async getOrders(limit: number = 250, status: string = 'any'): Promise<ShopifyOrder[]> {
    const allOrders: ShopifyOrder[] = [];
    let pageInfo: string | null = null;

    do {
      const params: any = { limit, status };
      if (pageInfo) {
        params.page_info = pageInfo;
      }

      const response = await this.client.get('/orders.json', { params });
      const orders = response.data.orders || [];
      allOrders.push(...orders);

      const linkHeader = response.headers.link;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>; rel="next"/);
        pageInfo = nextMatch ? nextMatch[1] : null;
      } else {
        pageInfo = null;
      }
    } while (pageInfo);

    return allOrders;
  }

  // Fetch a single customer by ID
  async getCustomer(customerId: string): Promise<ShopifyCustomer | null> {
    try {
      const response = await this.client.get(`/customers/${customerId}.json`);
      return response.data.customer || null;
    } catch (error) {
      return null;
    }
  }

  // Fetch a single product by ID
  async getProduct(productId: string): Promise<ShopifyProduct | null> {
    try {
      const response = await this.client.get(`/products/${productId}.json`);
      return response.data.product || null;
    } catch (error) {
      return null;
    }
  }

  // Fetch a single order by ID
  async getOrder(orderId: string): Promise<ShopifyOrder | null> {
    try {
      const response = await this.client.get(`/orders/${orderId}.json`);
      return response.data.order || null;
    } catch (error) {
      return null;
    }
  }
}

