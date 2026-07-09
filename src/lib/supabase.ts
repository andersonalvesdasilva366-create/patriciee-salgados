import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://swzfjksxrsupkekwpyor.supabase.co";
const supabaseAnonKey = "sb_publishable_JsYyYlBFR2tgZru2s25J7w_z8EoOIEP";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          imageUrl: string | null;
          price: number;
          stock: number;
          orderBalance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          imageUrl?: string | null;
          price: number;
          stock?: number;
          orderBalance?: number | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          imageUrl?: string | null;
          price?: number;
          stock?: number;
          orderBalance?: number | null;
        };
      };
      orders: {
        Row: {
          id: string;
          customerName: string;
          whatsapp: string;
          notes: string | null;
          items: any;
          total: number;
          status: string;
          scheduledAt: string | null;
          createdAt: string;
        };
        Insert: {
          customerName: string;
          whatsapp: string;
          notes?: string | null;
          items: any;
          total: number;
          status?: string;
          scheduledAt?: string | null;
        };
        Update: {
          status?: string;
          scheduledAt?: string | null;
        };
      };
    };
  };
};
