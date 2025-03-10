import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch user's training progress from PHP backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      
      const apiUrl = 
      process.env.NODE_ENV === "development"
        ? "http://localhost:8000/api/rest-api/training/TrainingApi.php"
        : "https://admin.lucrumindustries.com/api/rest-api/training/TrainingApi.php";
        
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
        // Check if response is HTML (indicating server error)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Server configuration error: Expected JSON response');
        }

        // Try to parse error as JSON, fallback to status text if not possible
        let errorMessage;
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || 'Failed to fetch training progress';
        } catch {
          errorMessage = response.statusText || 'Failed to fetch training progress';
        }
        throw new Error(errorMessage);
      }

      // Safely parse JSON response
      let progressData;
      try {
        progressData = await response.json();
      } catch (parseError) {
        console.error('Error parsing progress response:', parseError);
        throw new Error('Invalid response format from server');
      }

      return NextResponse.json(progressData);
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout: Server took too long to respond');
        }
        throw fetchError;
      }
      throw new Error('An unknown error occurred');
    }
  } catch (error) {
    console.error('Error fetching training progress:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}