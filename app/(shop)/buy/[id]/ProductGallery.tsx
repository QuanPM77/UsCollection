"use client";

import { useState } from "react";

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];

  return <div>
    <div className="aspect-square overflow-hidden rounded-3xl bg-white">
      {current ? <img src={current} alt={`${name} - ảnh ${selected + 1}`} decoding="async" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-8xl">💎</div>}
    </div>
    {images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
      {images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setSelected(index)} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={selected === index} className={`aspect-square overflow-hidden rounded-xl border-2 ${selected === index ? "border-pink-deep" : "border-transparent"}`}>
        <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full bg-white object-contain" />
      </button>)}
    </div>}
  </div>;
}
