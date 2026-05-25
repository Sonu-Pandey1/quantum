import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fpctiatltwnczbodbuqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_9IgkvSMmP5q2Rx6vTHkmuQ_NyNkjKCh';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Fetching executions...");
  const { data, error } = await supabase.from('executions').select('*');
  if (error) {
    console.error("DB Fetch Error:", error);
  } else {
    console.log("Found executions count:", data.length);
    console.log("Last 10 executions:", data.slice(-10));
  }
}
check();
