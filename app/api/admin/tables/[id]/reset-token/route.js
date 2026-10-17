import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../../../../lib/supabaseServer';

// POST /api/admin/tables/[id]/reset-token — call reset_table_token RPC
export async function POST(req, { params }) {
  try {
    const { staff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();
    const { id } = params;

    // Verify ownership before resetting token
    const { data: tbl, error: fetchErr } = await supabaseAdmin
      .from('tables')
      .select('id, cafe_id, name')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !tbl) {
      return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });
    }

    if (staff.role === 'cafe_admin' && tbl.cafe_id !== staff.cafe_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Call the database RPC to reset the token
    const { data, error: rpcErr } = await supabaseAdmin.rpc('reset_table_token', {
      p_table_id: id,
    });

    if (rpcErr) {
      return NextResponse.json({ success: false, error: rpcErr.message }, { status: 500 });
    }

    // Fetch the updated table to return the new token
    const { data: updated, error: fetchUpdErr } = await supabaseAdmin
      .from('tables')
      .select('id, cafe_id, name, token, active, sort_order')
      .eq('id', id)
      .single();

    if (fetchUpdErr) {
      return NextResponse.json({ success: false, error: fetchUpdErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, table: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
