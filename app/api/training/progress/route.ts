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

    // Validate user access token
    if (!session.user.accessToken) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }

    // Fetch user's training progress from PHP backend with increased timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

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
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Server configuration error: Expected JSON response');
        }

        let errorMessage;
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || 'Failed to fetch training progress';
        } catch {
          errorMessage = response.statusText || 'Failed to fetch training progress';
        }
        throw new Error(errorMessage);
      }

      let progressData;
      try {
        progressData = await response.json();

        // Validate and process the progress data
        if (Array.isArray(progressData)) {
          let lastCompletedOrder = -1;

          progressData = progressData.map(item => {
            const questionsCompleted = parseInt(item.questionsCompleted, 10) || 0;
            const totalQuestions = parseInt(item.totalQuestions, 10) || 0;
            const orderNumber = parseInt(item.orderNumber, 10);

            // Ensure completion logic is accurate
            // Mark as completed if:
            // 1. For videos without questions (totalQuestions === 0): video must be marked as watched in DB (completed = "1")
            // 2. For videos with questions: video must be watched AND all questions completed
            const isVideoWatched = item.completed === "1";
            const hasQuestions = totalQuestions > 0;
            const allQuestionsCompleted = hasQuestions ? questionsCompleted >= totalQuestions : isVideoWatched;
            
            // Enhanced completion logic that handles videos with no questions correctly
            const isCompleted = hasQuestions ? (isVideoWatched && allQuestionsCompleted) : isVideoWatched;

            // Update lastCompletedOrder based on completion status
            if (isCompleted) {
              lastCompletedOrder = Math.max(lastCompletedOrder, orderNumber);
            }

            const isUnlocked = orderNumber === 1 || (lastCompletedOrder >= orderNumber - 1);

            return {
              ...item,
              completed: isCompleted ? "1" : "0",
              questionsCompleted,
              orderNumber,
              isLocked: !isUnlocked,
              questions: Array.isArray(item.questions) ? item.questions : []
            };
          });
        }

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