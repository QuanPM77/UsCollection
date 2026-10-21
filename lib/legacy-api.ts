import { NextResponse } from "next/server";

export function legacyApiResponse() {
  return NextResponse.json(
    { success: false, message: "API này đã ngừng hoạt động. Vui lòng dùng luồng ứng dụng hiện tại." },
    { status: 410 },
  );
}
