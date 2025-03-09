import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Clean up userId by removing any Next.js Image parameters
    const cleanUserId = userId?.split('?')[0]?.split('&')[0];

    if (!cleanUserId || cleanUserId.trim() === '') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch image from PHP backend
    const response = await fetch(`https://admin.lucrumindustries.com/api/rest-api/profile/ProfileApi.php?userId=${cleanUserId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.user.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const imageData = Buffer.from(imageBuffer);

    // Determine content type from response headers or magic numbers
    let contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      if (imageData[0] === 0x89 && imageData[1] === 0x50) {
        contentType = 'image/png';
      } else if (imageData[0] === 0x47 && imageData[1] === 0x49) {
        contentType = 'image/gif';
      }
    }

    // Set appropriate headers for image response
    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageData.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Error serving profile image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}