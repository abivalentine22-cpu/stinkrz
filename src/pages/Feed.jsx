import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import PostComposer from "@/components/feed/PostComposer";
import StatusCard from "@/components/feed/StatusCard";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";

export default function Feed() {
  const [me, setMe] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isBlocked } = useBlockedUsers();

  useEffect(() => {
    base44.auth.me().then(async (user) => {
      setMe(user);
      if (user) {
        const profiles = await base44.entities.ScentProfile.filter({ user_email: user.email });
        setMyProfile(profiles[0] || null);
      }
    });
  }, []);

  // Auto-refresh every 30s
  const { data: posts = [] } = useQuery({
    queryKey: ["status-posts"],
    queryFn: () => base44.entities.StatusPost.list("-created_date", 100),
    refetchInterval: 30000,
    enabled: !!me,
  });

  // Filter expired posts and blocked users client-side
  const activePosts = posts.filter((p) => {
    if (isBlocked(p.user_email)) return false;
    if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
    return true;
  });

  const postMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.StatusPost.create({
        ...data,
        user_email: me.email,
        display_name: myProfile?.display_name || me.full_name || "Anonymous",
        avatar_url: myProfile?.avatar_url || null,
        scent_category: myProfile?.scent_category || null,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["status-posts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StatusPost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["status-posts"] }),
  });

  const handleMessage = async (post) => {
    // Trigger notification for post owner
    await base44.functions.invoke('createStatusInteractionNotification', {
      post_id: post.id,
      interactor_email: me.email,
      interactor_name: myProfile?.display_name || me.full_name,
      interactor_avatar: myProfile?.avatar_url,
      post_owner_email: post.user_email,
    }).catch(() => {});
    
    navigate("/messages", {
      state: {
        openConversationWith: {
          user_email: post.user_email,
          display_name: post.display_name,
          avatar_url: post.avatar_url,
          scent_category: post.scent_category,
        },
      },
    });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold leading-none">Live Feed</h1>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            {activePosts.length} active vibe{activePosts.length !== 1 ? "s" : ""} right now
          </p>
        </div>
      </div>

      {/* Composer */}
      {me && (
        <PostComposer
          myProfile={myProfile}
          onPost={(data) => postMutation.mutate(data)}
        />
      )}

      {/* Feed */}
      <div className="space-y-3">
        {activePosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <p className="text-4xl mb-3">💨</p>
            <p className="font-body text-sm">No active vibes yet. Be the first to post!</p>
          </div>
        ) : (
          activePosts.map((post) => (
            <StatusCard
              key={post.id}
              post={post}
              currentUserEmail={me?.email}
              onDelete={(id) => deleteMutation.mutate(id)}
              onMessage={handleMessage}
            />
          ))
        )}
      </div>
    </div>
  );
}