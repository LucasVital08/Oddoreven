"use client";

import Jazzicon, { jsNumberForAddress } from "react-jazzicon";

export function Identicon({ address, size = 40 }: { address?: string; size?: number }) {
  if (!address) {
    return (
      <div
        className="rounded-full bg-panel-3 ring-1 ring-line-2"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="overflow-hidden rounded-full ring-1 ring-line-2"
      style={{ width: size, height: size }}
    >
      <Jazzicon diameter={size} seed={jsNumberForAddress(address)} />
    </div>
  );
}
