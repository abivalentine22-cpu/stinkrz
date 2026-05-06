import React, { useRef } from "react";
import { Camera, Loader } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AvatarUpload({ avatar_url, onUpload, loading }) {
  const inputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
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