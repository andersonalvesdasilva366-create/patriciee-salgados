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
          partner: boolean | null;
          promotion: boolean | null;
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
          partner?: boolean;
          promotion?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          imageUrl?: string | null;
          price?: number;
          stock?: number;
          orderBalance?: number | null;
          partner?: boolean;
          promotion?: boolean;
        };
      };
      orders: {
        Row: {
          id: string;
          customername: string;
          whatsapp: string;
          notes: string | null;
          items: any;
          total: number;
          status: string;
          scheduledat: string | null;
          createdat: string;
          feedback: string | null;
        };
        Insert: {
          customername: string;
          whatsapp: string;
          notes?: string | null;
          items: any;
          total: number;
          status?: string;
          scheduledat?: string | null;
          feedback?: string | null;
        };
        Update: {
          status?: string;
          scheduledat?: string | null;
          feedback?: string | null;
        };
      };
      revenue_entries: {
        Row: {
          id: string;
          description: string | null;
          amount: number | null;
          category: string | null;
          received_at: string | null;
          status: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          description?: string | null;
          amount?: number | null;
          category?: string | null;
          received_at?: string | null;
          status?: string | null;
          notes?: string | null;
        };
        Update: {
          description?: string | null;
          amount?: number | null;
          category?: string | null;
          received_at?: string | null;
          status?: string | null;
          notes?: string | null;
        };
      };
    };
  };
};
