import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { cache } from '../route';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse request body
    const { videoId, completed, questionsCompleted } = await request.json();

    // Validate request data
    if (!videoId || typeof completed !== 'boolean') {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    // Only allow setting questionsCompleted to 2 when explicitly provided
    const normalizedQuestionsCompleted = questionsCompleted ?? (completed ? 2 : 0);

    // Send request to PHP API
    const phpApiUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:8000/api/rest-api/training/TrainingApi.php"
      : "https://admin.lucrumindustries.com/api/rest-api/training/TrainingApi.php";

    const response = await fetch(phpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.accessToken}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({
        videoId,
        completed,
        questionsCompleted: normalizedQuestionsCompleted,
      }),
    });

    // Handle response
    if (!response.ok) {
      // Try to parse error response as JSON first
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || 'Failed to update training progress';
      } catch {
        // If JSON parsing fails, use text response
        errorMessage = await response.text();
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Clear the cache after successful update
    const cacheKey = session.user.id;
    if (cache.has(cacheKey)) {
      cache.delete(cacheKey);
    }
    
    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error updating training progress:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}