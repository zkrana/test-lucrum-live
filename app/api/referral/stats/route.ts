import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
    try {
      const session = await getServerSession(authOptions);
      if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
  
      if (!session.user.accessToken) {
        return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
      }
  
      const apiUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:8000/api/rest-api/referral/track-click.php"
          : "https://admin.lucrumindustries.com/api/rest-api/referral/track-click.php";
  
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
  
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          signal: controller.signal
        });
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error('Server configuration error: Expected JSON response');
          }
  
          let errorMessage;
          try {
            const error = await response.json();
            errorMessage = error.message || error.error || 'Failed to fetch referral progress';
          } catch {
            errorMessage = response.statusText || 'Failed to fetch referral progress';
          }
          throw new Error(errorMessage);
        }
  
        let referralData;
        try {
          referralData = await response.json();
        } catch (parseError) {
          console.error('Error parsing referral stats response:', parseError);
          throw new Error('Invalid response format from server');
        }
  
        // ✅ Ensure correct field names
        return NextResponse.json({
          referralCode: referralData.referral_code, // ✅ Correct field name
          totalClicks: referralData.total_clicks || 0,
          uniqueClicks: referralData.unique_clicks || 0,
        });
      } catch (fetchError) {
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout: Server took too long to respond');
          }
          throw fetchError;
        }
        throw new Error('An unknown error occurred');
      }
    } catch (error) {
      console.error('Error fetching referral progress:', error);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Internal Server Error',
          details: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  }