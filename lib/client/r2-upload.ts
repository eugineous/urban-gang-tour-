'use client';

// Client-side upload helper - replaces @vercel/blob/client's upload().
// Mirrors its call shape (pathname, file, {access, handleUploadUrl,
// onUploadProgress}) so call sites (app/admin/docs/DocGen.tsx,
// app/admin/ops/Gallery.tsx) only needed an import swap, not a rewrite.
//
// Flow: POST the file bytes straight to handleUploadUrl (pathname passed as
// a query param, content-type as the Content-Type header), via XHR so upload
// progress is observable. The server route (see app/api/admin/gallery/upload
// and app/api/admin/docs/hero-upload) writes it to R2 through the native
// binding (lib/server/r2.ts) and responds with {url}.
//
// Note this is a proxy upload (file bytes pass through our server), unlike
// the old @vercel/blob/client (and an earlier version of this file) which
// PUT the file directly to storage via a presigned URL. R2 presigned URLs
// still require R2 API credentials even from inside a Worker - this app
// deliberately holds none, using the zero-credential R2 binding instead - so
// there's no direct-to-storage path available here. Fine for these
// admin-only, low-traffic upload flows.

export interface R2UploadOptions {
  // Kept for call-site compatibility with the old @vercel/blob/client
  // signature; unused here.
  access?: 'public';
  handleUploadUrl: string;
  onUploadProgress?: (event: { percentage: number }) => void;
}

export interface R2UploadResult {
  url: string;
}

export async function upload(pathname: string, file: File, opts: R2UploadOptions): Promise<R2UploadResult> {
  const url = `${opts.handleUploadUrl}?pathname=${encodeURIComponent(pathname)}`;

  return new Promise<R2UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && opts.onUploadProgress) {
        opts.onUploadProgress({ percentage: (ev.loaded / ev.total) * 100 });
      }
    };
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* fall through to the status check below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.url) {
        resolve({ url: data.url });
      } else {
        reject(new Error(data?.error || `upload_failed_${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('network_error'));
    xhr.send(file);
  });
}
