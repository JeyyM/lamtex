import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...\n');

  try {
    // Test reading orders
    console.log('📦 Fetching orders...');
    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching orders:', error.message);
      console.error('Details:', error);
      return;
    }

    console.log(`✅ Connected successfully!`);
    console.log(`📊 Total orders in database: ${count}`);
    
    if (data && data.length > 0) {
      console.log(`\n📋 First ${data.length} orders:\n`);
      data.forEach((order, idx) => {
        console.log(`${idx + 1}. Order ID: ${order.id}`);
        console.log(`   Customer: ${order.customer_name || 'N/A'}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Total: ₱${order.total_amount || 0}`);
        console.log(`   Date: ${order.order_date || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('\n📭 No orders found in database (table is empty)');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();
