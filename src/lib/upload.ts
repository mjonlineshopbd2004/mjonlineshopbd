import { toast } from 'sonner';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 0.8;

const resizeImage = (file: File): Promise<File | Blob> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', QUALITY);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const uploadFile = async (file: File, idToken: string): Promise<string | null> => {
  try {
    const processedFile = await resizeImage(file);
    const formData = new FormData();
    formData.append('file', processedFile);

    const response = await fetch('/api/upload/single', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      body: formData,
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }
      const errorText = await response.text();
      console.error(`Upload failed (${response.status}). Response body:`, errorText.substring(0, 500));
      if (response.status === 413) {
        throw new Error('File is too large for the server to process. Please try a smaller file.');
      }
      if (response.status === 504) {
        throw new Error('Upload timed out. The file might be too large or the server is slow.');
      }
      throw new Error(`Upload failed with status ${response.status}`);
    }

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but received:', text.substring(0, 500));
      
      // If it looks like HTML, it might be a bot protection or error page
      if (text.trim().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
        if (text.includes('<title>Cookie check</title>') || text.includes('Cookie check')) {
          throw new Error('Session challenge detected. Please refresh the page and try again.');
        }
        throw new Error('Server returned an HTML page instead of JSON. This often happens when a request is blocked by a security layer or if the server is down.');
      }
      
      throw new Error('Server returned an invalid response format (not JSON)');
    }

    const data = await response.json();
    return data.url;
  } catch (error: any) {
    console.error('Upload error:', error);
    toast.error(error.message || 'Failed to upload file');
    return null;
  }
};

export const uploadMultipleFiles = async (files: FileList | File[], idToken: string): Promise<string[]> => {
  try {
    const formData = new FormData();
    const processedFiles = await Promise.all(Array.from(files).map(file => resizeImage(file as File)));
    
    processedFiles.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch('/api/upload/multiple', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      body: formData,
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }
      const errorText = await response.text();
      console.error(`Upload failed (${response.status}). Response body:`, errorText.substring(0, 500));
      if (response.status === 413) {
        throw new Error('File is too large for the server to process. Please try a smaller file.');
      }
      if (response.status === 504) {
        throw new Error('Upload timed out. The file might be too large or the server is slow.');
      }
      throw new Error(`Upload failed with status ${response.status}`);
    }

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but received:', text.substring(0, 500));
      
      // If it looks like HTML, it might be a bot protection or error page
      if (text.trim().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
        if (text.includes('<title>Cookie check</title>') || text.includes('Cookie check')) {
          throw new Error('Session challenge detected. Please refresh the page and try again.');
        }
        throw new Error('Server returned an HTML page instead of JSON. This often happens when a request is blocked by a security layer or if the server is down.');
      }
      
      throw new Error('Server returned an invalid response format (not JSON)');
    }

    const data = await response.json();
    return data.urls;
  } catch (error: any) {
    console.error('Upload error:', error);
    toast.error(error.message || 'Failed to upload files');
    return [];
  }
};
