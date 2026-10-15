'use client';

// Authenticated Worker upload to durable KV, retaining XHR progress.

export interface MediaUploadOptions {
  // Kept for call-site compatibility with the old @vercel/blob/client
  // signature; unused here.
  access?: 'public';
  handleUploadUrl: string;
  onUploadProgress?: (event: { percentage: number }) => void;
}

export interface MediaUploadResult {
  url: string;
}

export async function upload(pathname: string, file: File, opts: MediaUploadOptions): Promise<MediaUploadResult> {
  const separator = opts.handleUploadUrl.includes('?') ? '&' : '?';
  const url = `${opts.handleUploadUrl}${separator}pathname=${encodeURIComponent(pathname)}`;

  return new Promise<MediaUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = 60000;
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
    xhr.ontimeout = () => reject(new Error('upload_timeout'));
    xhr.onabort = () => reject(new Error('upload_cancelled'));
    xhr.send(file);
  });
}
