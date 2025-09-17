import { supabase } from "../src/supabase";

async function testConnection() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Supabase connection failed:", error);
  } else {
    console.log("Supabase connection OK, data:", data);
  }
}

testConnection();