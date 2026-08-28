import React, { useState } from "react";
import { Camera, Loader } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function AvatarUpload({ avatar_url, onUpload, loading: externalLoading }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not load image"));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 512;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas not supported")); return; }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error("Compression failed")); return; }
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.8
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast({ title: "Image too large", description: "Max size is 10MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      let fileToUpload;
      try {
        fileToUpload = await compressImage(file);
      } catch {
        // Fallback: upload the original file if compression fails
        fileToUpload = file;
      }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
      onUpload(file_url);
    } catch (err) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const busy = uploading || externalLoading;

  return (
    <div className="relative group">
      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex items-center justify-center text-lg shrink-0 cursor-pointer">
        {busy ? (
          <Loader className="w-4 h-4 text-muted-foreground animate-spin" />
        ) : avatar_url ? (
          <img src={avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          "🤙"
        )}
      </div>
      <label
        className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors opacity-0 group-hover:opacity-100"
        title="Upload photo"
      >
        {busy ? (
          <Loader className="w-3 h-3 text-primary-foreground animate-spin" />
        ) : (
          <Camera className="w-3 h-3 text-primary-foreground" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={busy}
        />
      </label>
    </div>
  );
}