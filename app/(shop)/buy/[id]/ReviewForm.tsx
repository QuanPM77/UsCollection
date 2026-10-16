"use client";

import { useState } from "react";
import { submitReview } from "./actions";

export default function ReviewForm({ productId, rating: initialRating = 5, comment: initialComment = "" }: { productId: string; rating?: number; comment?: string }) {
  const [rating, setRating] = useState(initialRating);

  return <form action={submitReview.bind(null, productId)} className="mt-5 rounded-2xl bg-pink-light/40 p-4 sm:p-5">
    <p className="text-sm font-semibold">{initialComment ? "Cập nhật đánh giá của bạn" : "Viết đánh giá"}</p>
    <fieldset className="mt-3">
      <legend className="text-xs font-medium text-pink-text/65">Đánh giá số sao</legend>
      <input type="hidden" name="rating" value={rating} />
      <div className="mt-1 flex items-center gap-1" role="group" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => setRating(star)} aria-label={`${star} sao`} aria-pressed={rating === star} className={`text-3xl leading-none ${star <= rating ? "text-amber-500" : "text-gray-300"}`}>★</button>)}
      </div>
    </fieldset>
    <label className="mt-4 block text-xs font-medium text-pink-text/65">Bình luận
      <textarea name="comment" required minLength={2} maxLength={2000} defaultValue={initialComment} rows={4} placeholder="Chia sẻ cảm nhận của bạn về chiếc vòng..." className="mt-1.5 w-full rounded-xl border border-pink-mid/40 bg-white px-3 py-2.5 text-sm text-pink-text outline-none focus:border-pink-deep focus:ring-2 focus:ring-pink-mid/30" />
    </label>
    <button className="mt-4 rounded-xl bg-pink-deep px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-text">Gửi đánh giá</button>
  </form>;
}
