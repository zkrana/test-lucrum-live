import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const endpoint =
      process.env.NODE_ENV === "development"
        ? "http://localhost:8000/api/rest-api/auth/forgot-password.php"
        : "https://admin.lucrumindustries.com/api/rest-api/auth/forgot-password.php";

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    // Return success response with message from backend if available
    return NextResponse.json(
      { 
        message: data.message || 'If an account exists with this email, you will receive password reset instructions.' 
      },
      { status: response.ok ? 200 : 500 }
    );
  } catch (error) {
    console.error('Password reset error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}