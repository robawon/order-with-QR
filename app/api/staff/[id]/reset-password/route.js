import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../../../lib/supabaseServer';

// No-lookalike charset: excludes 0, O, 1, l, I
const SAFE_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';

function generatePassword(len = 10) {
  let pass = '';
  // Ensure at least one digit and one letter
  const digits = '23456789';
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  pass += digits[Math.floor(Math.random() * digits.length)];
  pass += upper[Math.floor(Math.random() * upper.length)];
  for (let i = 2; i < len; i++) {
    pass += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  // Shuffle
  return pass.split('').sort(() => Math.random() - 0.5).join('');
}

// POST /api/staff/[id]/reset-password
export async function POST(req, { params }) {
  try {
    const { id: targetUserId } = params;
    const { user: callerUser, staff: callerStaff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    // Fetch target staff
    const { data: targetStaff, error: targetError } = await supabaseAdmin
      .from('staff')
      .select('user_id, cafe_id, role, full_name')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetError || !targetStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }

    // Cafe boundary check
    if (callerStaff.role !== 'super_admin' && targetStaff.cafe_id !== callerStaff.cafe_id) {
      return NextResponse.json({ success: false, error: 'No access.' }, { status: 403 });
    }

    // Cafe_admin cannot reset another admin's password
    if (callerStaff.role !== 'super_admin' && targetStaff.role !== 'bartender') {
      return NextResponse.json({ success: false, error: 'Only the super admin can reset admin passwords.' }, { status: 403 });
    }

    // Cannot reset your own password via this endpoint (use auth directly)
    if (callerUser.id === targetUserId && callerStaff.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Use the login page to change your own password.' }, { status: 400 });
    }

    const newPassword = generatePassword(10);

    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (resetError) {
      return NextResponse.json({ success: false, error: resetError.message }, { status: 400 });
    }

    // Fetch email for the response
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

    return NextResponse.json({
      success: true,
      new_password: newPassword,
      email: authData?.user?.email || null,
      full_name: targetStaff.full_name,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
