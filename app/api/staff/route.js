import { NextResponse } from 'next/server';
import { verifyStaffSession, getServiceRoleClient } from '../../../lib/supabaseServer';

// GET /api/staff?cafe_id=... — list staff rows + email
export async function GET(req) {
  try {
    const { staff: callerStaff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    const { searchParams } = new URL(req.url);
    const cafeId = searchParams.get('cafe_id') || callerStaff.cafe_id;

    // Enforce boundary
    if (callerStaff.role !== 'super_admin' && cafeId !== callerStaff.cafe_id) {
      return NextResponse.json({ success: false, error: 'No access.' }, { status: 403 });
    }
    if (!cafeId) {
      return NextResponse.json({ success: false, error: 'cafe_id is required.' }, { status: 400 });
    }

    const { data: staffRows, error } = await supabaseAdmin
      .from('staff')
      .select('user_id, cafe_id, role, station, full_name, active, created_at')
      .eq('cafe_id', cafeId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Fetch auth user emails for each staff member
    const enriched = await Promise.all(
      (staffRows || []).map(async (s) => {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(s.user_id);
        return { ...s, email: authUser?.user?.email || null };
      })
    );

    return NextResponse.json({ success: true, staff: enriched });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// POST /api/staff — create a bartender
export async function POST(req) {
  try {
    const { staff: callerStaff } = await verifyStaffSession(req, ['cafe_admin', 'super_admin']);
    const supabaseAdmin = getServiceRoleClient();

    const body = await req.json();
    const { full_name, email, password, station, cafe_id } = body;

    const targetCafeId =
      callerStaff.role === 'super_admin' ? (cafe_id || callerStaff.cafe_id) : callerStaff.cafe_id;

    // Enforce cafe boundary for cafe_admin
    if (callerStaff.role !== 'super_admin' && cafe_id && cafe_id !== callerStaff.cafe_id) {
      return NextResponse.json({ success: false, error: 'No access.' }, { status: 403 });
    }

    if (!targetCafeId) {
      return NextResponse.json({ success: false, error: 'cafe_id is required.' }, { status: 400 });
    }

    // Validate inputs
    if (!full_name?.trim()) {
      return NextResponse.json({ success: false, error: 'Enter a name and a valid email.' }, { status: 400 });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email?.trim() || !emailRe.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'Enter a name and a valid email.' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    // Create auth user (email already confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (authError) {
      const msg = authError.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.includes('already registered')) {
        return NextResponse.json({ success: false, error: 'This email is already used.' }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // Insert staff row
    const { data: newStaff, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        user_id: newUserId,
        cafe_id: targetCafeId,
        role: 'bartender',
        station: station || null,
        full_name: full_name.trim(),
        active: true,
      })
      .select()
      .single();

    if (staffError) {
      // Rollback: delete the auth user so nothing is half-created
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ success: false, error: staffError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      staff: { ...newStaff, email: email.trim().toLowerCase() },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
