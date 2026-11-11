type SignedUpload = { signedUrl: string; token: string; path: string; publicKey: string };
function xhrUpload(url: string, file: Blob, progress: (loaded: number) => void, method = "PUT", headers: Record<string, string> = {}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open(method, url); xhr.timeout = 10 * 60 * 1000;
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = e => progress(e.loaded);
    xhr.onerror = xhr.ontimeout = () => reject(new Error("Mạng bị gián đoạn khi tải mô hình."));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Không tải được file (${xhr.status}).`));
    xhr.send(file);
  });
}
export async function uploadModelFile(signed: SignedUpload, file: File, progress: (percent: number) => void) {
  const chunkSize = 6 * 1024 * 1024;
  if (file.size <= chunkSize) {
    return xhrUpload(signed.signedUrl, file, bytes => progress(Math.round(bytes / file.size * 100)), "PUT", { "Content-Type": "model/gltf-binary", "x-upsert": "false" });
  }
  // TUS resume within the current upload: after an interrupted PATCH, ask the
  // server for its offset before retrying. The signed token is scoped to one path.
  const origin = new URL(signed.signedUrl).origin;
  const headers: Record<string, string> = { "Tus-Resumable": "1.0.0", "x-signature": signed.token, "x-upsert": "false" };
  if (signed.publicKey) headers.apikey = signed.publicKey;
  const metadata = { bucketName: "bead-model-originals", objectName: signed.path, contentType: "model/gltf-binary", cacheControl: "3600" };
  const created = await fetch(`${origin}/storage/v1/upload/resumable/sign`, { method: "POST", headers: {
    ...headers, "Upload-Length": String(file.size), "Upload-Metadata": Object.entries(metadata).map(([k, v]) => `${k} ${btoa(v)}`).join(","),
  } });
  const location = created.headers.get("location");
  if (!created.ok || !location) throw new Error("Không thể bắt đầu tải file lớn. Hãy kiểm tra quyền kho lưu trữ.");
  const url = new URL(location, origin).href;
  if (new URL(url).origin !== origin) throw new Error("Địa chỉ tải file không hợp lệ.");
  let offset = 0; let retries = 0;
  while (offset < file.size) {
    const start = offset; const chunk = file.slice(start, Math.min(start + chunkSize, file.size));
    try {
      await xhrUpload(url, chunk, bytes => progress(Math.round((start + bytes) / file.size * 100)), "PATCH", { ...headers, "Content-Type": "application/offset+octet-stream", "Upload-Offset": String(start) });
      offset += chunk.size; retries = 0;
    } catch (error) {
      if (++retries > 3) throw error;
      await new Promise(resolve => setTimeout(resolve, retries * 1000));
      const state = await fetch(url, { method: "HEAD", headers });
      const rawOffset = state.headers.get("Upload-Offset");
      const resumed = Number(rawOffset);
      if (!state.ok || rawOffset === null || !Number.isSafeInteger(resumed) || resumed < 0 || resumed > file.size) throw error;
      offset = resumed;
    }
  }
  progress(100);
}
