import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../../lib/supabaseServer';

// PATCH /api/staff/[id] — edit full_name, station, or active
// [id] = user_id of the target staff member
export async function PATCH(req, { params }) {
  try {
    const { id: targetUserId } = params;
    const { user: callerUser, staff: callerStaff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    // Fetch target staff
    const { data: targetStaff, error: targetError } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetError || !targetStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    // Cafe_admin can only manage their own cafe
    if (callerStaff.role !== 'super_admin' && targetStaff.cafe_id !== callerStaff.cafe_id) {
      return NextResponse.json({ success: false, error: 'No access.' }, { status: 403 });
    }

    // Cafe_admin cannot change another admin's account
    if (callerStaff.role !== 'super_admin' && targetStaff.role !== 'bartender') {
      return NextResponse.json({ success: false, error: 'Only the super admin can change admins.' }, { status: 403 });
    }

    const body = await req.json();
    const { full_name, station, active } = body;

    // Cannot disable yourself
    if (callerUser.id === targetUserId && active === false) {
      return NextResponse.json({ success: false, error: 'You cannot disable yourself.' }, { status: 400 });
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (station !== undefined) updates.station = station || null;
    if (active !== undefined) updates.active = Boolean(active);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'Nothing to update.' }, { status: 400 });
    }

    // Apply to staff table
    const { data: updatedStaff, error: updateError } = await supabaseAdmin
      .from('staff')
      .update(updates)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
    }

    // Sync ban status with auth — disabling bans the user immediately (kills active sessions)
    if (active !== undefined) {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: active ? 'none' : '876000h', // 100 years = effectively permanent ban
      });
      if (banError) {
        // Log but don't fail — the DB row was updated, the auth ban is best-effort
        console.error('Auth ban sync error:', banError.message);
      }
    }

    // Fetch email for return value
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    return NextResponse.json({
      success: true,
      staff: { ...updatedStaff, email: authData?.user?.email || null },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
