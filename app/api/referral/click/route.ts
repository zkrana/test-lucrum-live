import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get referral data from request
    const { referrerId } = await request.json();
    if (!referrerId) {
      return NextResponse.json({ error: 'Referrer ID is required' }, { status: 400 });
    }

    // Send request to PHP backend
    const endpoint =
      process.env.NODE_ENV === "development"
        ? "http://localhost:8000/api/rest-api/referral/track-click.php"
        : "https://admin.lucrumindustries.com/api/rest-api/referral/track-click.php";

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.accessToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        referrerId,
        clickedBy: session.user.id,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to track referral click');
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Referral click tracked successfully',
      data
    });

  } catch (error) {
    console.error('Referral click tracking error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}