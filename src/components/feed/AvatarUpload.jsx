import React, { useRef } from "react";
import { Camera, Loader } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AvatarUpload({ avatar_url, onUpload, loading }) {
  const inputRef = useRef(null);

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
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
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
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
    
    const compressedFile = await compressImage(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
    onUpload(file_url);
  };

  return (
    <div className="relative group">
      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex items-center justify-center text-lg shrink-0 cursor-pointer">
        {avatar_url ? (
          <img src={avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          "🤙"
        )}
      </div>
      <label
        className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors opacity-0 group-hover:opacity-100"
        title="Upload photo"
      >
        {loading ? (
          <Loader className="w-3 h-3 text-primary-foreground animate-spin" />
        ) : (
          <Camera className="w-3 h-3 text-primary-foreground" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />
      </label>
    </div>
  );
}