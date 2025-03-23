import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid session' }, { status: 401 });
    }

    // Parse request body
    const { videoId, completed, questionsCompleted, totalQuestions } = await request.json();

    // Add debug logs
    console.log('Training progress update request received:', {
      videoId,
      completed,
      questionsCompleted,
      totalQuestions,
      hasQuestions: totalQuestions > 0
    });

    // Validate request data
    if (!videoId || typeof completed !== 'boolean') {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    // Handle videos with no questions and normalize questionsCompleted
    const normalizedQuestionsCompleted = totalQuestions === 0 ? 0 : Number(questionsCompleted);
    // For videos with questions, only mark as completed if all questions are answered
    const shouldMarkCompleted = totalQuestions === 0 ? completed : (completed && normalizedQuestionsCompleted >= totalQuestions);
    const isLocked = !shouldMarkCompleted;

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
        completed: shouldMarkCompleted,
        questionsCompleted: normalizedQuestionsCompleted,
        timestamp: new Date().toISOString(),
        preventDuplicates: true,
        isLocked
      }),
    });

    // Handle response
    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || 'Failed to update training progress';
      } catch {
        errorMessage = await response.text();
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Fetch fresh data directly from the PHP backend (no caching)
    const freshDataResponse = await fetch(phpApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.user.accessToken}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (freshDataResponse.ok) {
      const freshData = await freshDataResponse.json();
      return NextResponse.json({
        success: true,
        data: freshData
      });
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