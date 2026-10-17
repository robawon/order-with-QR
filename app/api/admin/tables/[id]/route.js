import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../../../lib/supabaseServer';

// PATCH /api/admin/tables/[id] — rename or toggle active
export async function PATCH(req, { params }) {
  try {
    const { staff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();
    const { id } = params;

    // Fetch the table to check ownership
    const { data: tbl, error: fetchErr } = await supabaseAdmin
      .from('tables')
      .select('id, cafe_id, name')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !tbl) {
      return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });
    }

    // Enforce ownership for cafe_admin
    if (staff.role === 'cafe_admin' && tbl.cafe_id !== staff.cafe_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.active !== undefined) updates.active = !!body.active;
    if (body.sort_order !== undefined) updates.sort_order = parseInt(body.sort_order, 10);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    // Check name uniqueness within the cafe if renaming
    if (updates.name) {
      const { data: existing } = await supabaseAdmin
        .from('tables')
        .select('id')
        .eq('cafe_id', tbl.cafe_id)
        .eq('name', updates.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ success: false, error: `A table named "${updates.name}" already exists.` }, { status: 409 });
      }
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('tables')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, table: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// DELETE /api/admin/tables/[id] — remove a table
export async function DELETE(req, { params }) {
  try {
    const { staff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();
    const { id } = params;

    // Fetch to verify ownership
    const { data: tbl, error: fetchErr } = await supabaseAdmin
      .from('tables')
      .select('id, cafe_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !tbl) {
      return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });
    }

    if (staff.role === 'cafe_admin' && tbl.cafe_id !== staff.cafe_id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { error: deleteErr } = await supabaseAdmin.from('tables').delete().eq('id', id);

    if (deleteErr) {
      return NextResponse.json({ success: false, error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
