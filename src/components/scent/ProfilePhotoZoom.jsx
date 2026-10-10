import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Expand } from "lucide-react";

/** Display a cropped thumbnail with an accessible, uncropped photo viewer. */
export default function ProfilePhotoZoom({ src, name, children }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" aria-label={`View full photo of ${name || "member"}`}
          className="relative block w-full h-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          {children}
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2 text-white pointer-events-none">
            <Expand size={16} aria-hidden="true" />
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/90" style={{ zIndex: 2000 }} />
        <Dialog.Content aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 w-[94vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 outline-none"
          style={{ zIndex: 2001 }}>
          <Dialog.Title className="sr-only">Full photo of {name || "member"}</Dialog.Title>
          <img src={src} alt={`Full photo of ${name || "member"}`}
            className="block w-full object-contain" style={{ height: "80dvh", maxHeight: "80vh" }} />
          <Dialog.Close aria-label="Close full photo"
            className="absolute right-0 top-0 rounded-full bg-black/80 p-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <X size={24} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
