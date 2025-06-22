import { NextRequest, NextResponse } from 'next/server';

// This interface describes the expected structure of a Firebase Storage URL
interface GitbookImageParams {
  url: string;
  width?: string;
  quality?: string;
  dpr?: string;
  sign?: string;
  sv?: string;
}

/**
 * Image proxy API route that fetches images from external URLs
 * and serves them through our own domain to bypass CORS restrictions.
 * This is especially useful for html2canvas when generating PDFs.
 * 
 * Enhanced with special handling for Gitbook URLs which have a complex structure.
 */
export async function GET(request: NextRequest) {
  try {
    // Extract the URL parameter
    const { searchParams } = new URL(request.url);
    let imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }
    
    // Log the request to help with debugging
    console.log(`Image proxy request received for URL: ${imageUrl.substring(0, 100)}...`);
    
    // Special handling for Gitbook URLs
    const isGitbookUrl = imageUrl.includes('gitbook.io') || imageUrl.includes('gitbook.com') || imageUrl.includes('~gitbook');
    
    // Handle potentially multiple levels of URL encoding
    let decodedUrl = imageUrl;
    try {
      // Try to decode multiple times in case of nested encodings
      let prevUrl = '';
      let decodingCount = 0;
      const maxDecodings = isGitbookUrl ? 8 : 5;
      
      while (prevUrl !== decodedUrl && decodingCount < maxDecodings) {
        prevUrl = decodedUrl;
        try {
          decodedUrl = decodeURIComponent(prevUrl);
        } catch (decodeError) {
          console.warn(`Decode error at iteration ${decodingCount}:`, decodeError);
          break;
        }
        decodingCount++;
        
        // Break if we've reached a URL that can't be further decoded
        if (prevUrl === decodedUrl) break;
      }
      
      // For Gitbook URLs, do additional checks and transformations
      if (isGitbookUrl) {
        console.log('Detected Gitbook URL, applying special handling');
        
        // Handle the specific format of ~gitbook/image URLs
        if (decodedUrl.includes('~gitbook/image?url=')) {
          // Extract the actual image URL from the query parameter
          const urlMatch = decodedUrl.match(/url=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            // Get the actual image URL and decode it again
            let extractedUrl = urlMatch[1];
            try {
              extractedUrl = decodeURIComponent(extractedUrl);
            } catch (e) {
              console.warn('Could not decode extracted URL:', e);
            }
            console.log(`Extracted inner URL from Gitbook: ${extractedUrl.substring(0, 100)}...`);
            decodedUrl = extractedUrl;
          }
        }
        
        // Clean up Gitbook Firebase Storage URLs
        if (decodedUrl.includes('files.gitbook.io') || decodedUrl.includes('gitbook-x-prod.appspot.com')) {
          // Extract just the core Firebase Storage URL with token
          const tokenMatch = decodedUrl.match(/^([^?]+\?[^&]*alt=media[^&]*&[^&]*token=[^&]+)/);
          if (tokenMatch && tokenMatch[1]) {
            decodedUrl = tokenMatch[1];
            console.log(`Cleaned Firebase Storage URL: ${decodedUrl.substring(0, 100)}...`);
          }
        }
      }
      
      console.log(`Final decoded URL (${decodingCount} decodings): ${decodedUrl.substring(0, 100)}...`);
    } catch (e) {
      console.warn('Error fully decoding URL:', e);
    }
    
    // Validate the final URL
    try {
      new URL(decodedUrl);
    } catch (err) {
      console.error(`Invalid URL after decoding: ${decodedUrl}`);
      return new NextResponse(`Invalid URL: ${decodedUrl}`, { status: 400 });
    }
    
    console.log(`Proxying image: ${decodedUrl}`);
    
    // Set up a controller for fetch timeout
    const controller = new AbortController();
    const timeout = isGitbookUrl ? 30000 : 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Prepare headers for the request
      const requestHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      };
      
      // For Gitbook URLs, add specific headers
      if (isGitbookUrl) {
        requestHeaders['Origin'] = 'https://docs.flytbase.com';
        requestHeaders['Referer'] = 'https://docs.flytbase.com/';
      }
      
      const response = await fetch(decodedUrl, {
        headers: requestHeaders,
        signal: controller.signal,
        redirect: 'follow',
        cache: 'no-store',
        mode: 'cors',
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`Failed to fetch image: HTTP ${response.status} ${response.statusText} for URL: ${decodedUrl.substring(0, 100)}...`);
        
        // For Gitbook URLs that fail, try alternative strategies
        if (isGitbookUrl && response.status >= 400) {
          console.log('Trying alternative Gitbook fetch strategies...');
          
          // Strategy 1: Try without some headers
          try {
            const altResponse = await fetch(decodedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*,*/*;q=0.8',
              },
              signal: controller.signal,
              redirect: 'follow',
              mode: 'no-cors', // Try no-cors mode
            });
            
            if (altResponse.ok) {
              console.log('Alternative fetch strategy succeeded!');
              const imageData = await altResponse.arrayBuffer();
              
              return new NextResponse(imageData, {
                headers: {
                  'Content-Type': altResponse.headers.get('content-type') || 'image/jpeg',
                  'Access-Control-Allow-Origin': '*',
                  'Cache-Control': 'public, max-age=86400',
                }
              });
            }
          } catch (altError) {
            console.error('Alternative strategy also failed:', altError);
          }
        }
        
        return new NextResponse(`Failed to fetch image: ${response.status} ${response.statusText}`, {
          status: response.status >= 400 && response.status < 500 ? response.status : 502
        });
      }
      
      // Get the image data
      const imageData = await response.arrayBuffer();
      
      if (imageData.byteLength === 0) {
        return new NextResponse('Received empty image data', { status: 502 });
      }
      
      console.log(`Successfully proxied image (${imageData.byteLength} bytes)`);
      
      // Create response with proper headers
      const imageResponse = new NextResponse(imageData);
      
      // Set content type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        imageResponse.headers.set('Content-Type', contentType);
      } else {
        // Try to determine content type from URL or default to jpeg
        if (decodedUrl.includes('.png')) {
          imageResponse.headers.set('Content-Type', 'image/png');
        } else if (decodedUrl.includes('.gif')) {
          imageResponse.headers.set('Content-Type', 'image/gif');
        } else if (decodedUrl.includes('.webp')) {
          imageResponse.headers.set('Content-Type', 'image/webp');
        } else {
          imageResponse.headers.set('Content-Type', 'image/jpeg');
        }
      }
      
      // Copy useful headers
      const headersToProxy = ['etag', 'last-modified', 'content-length'];
      headersToProxy.forEach((header) => {
        const value = response.headers.get(header);
        if (value) {
          imageResponse.headers.set(header, value);
        }
      });
      
      // Set CORS and caching headers
      imageResponse.headers.set('Access-Control-Allow-Origin', '*');
      imageResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      imageResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      imageResponse.headers.set('Cache-Control', 'public, max-age=86400');
      imageResponse.headers.set('Vary', 'Origin');
      
      return imageResponse;
      
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`Fetch timeout for image: ${decodedUrl.substring(0, 100)}...`);
        return new NextResponse('Image fetch timed out', { status: 504 });
      }
      
      console.error('Error fetching image:', error);
      return new NextResponse(`Error proxying image: ${error instanceof Error ? error.message : String(error)}`, {
        status: 500
      });
    }
    
  } catch (outerError) {
    console.error('Error in image proxy:', outerError);
    return new NextResponse(`Error proxying image: ${outerError instanceof Error ? outerError.message : String(outerError)}`, {
      status: 500
    });
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}