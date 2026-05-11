import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import PostComposer from "@/components/feed/PostComposer";
import StatusCard from "@/components/feed/StatusCard";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";

export default function Feed() {
  const [me, setMe] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const navigate = useNavigate();
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

  // Real-time posts via subscribe
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!me) return;
    base44.entities.StatusPost.list("-created_date", 100).then(setPosts);

    const unsub = base44.entities.StatusPost.subscribe((event) => {
      if (event.type === "create") {
        setPosts(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setPosts(prev => prev.map(p => p.id === event.id ? event.data : p));
      } else if (event.type === "delete") {
        setPosts(prev => prev.filter(p => p.id !== event.id));
      }
    });
    return unsub;
  }, [me]);

  const [userPrefs, setUserPrefs] = useState(null);
  useEffect(() => {
    if (!me?.email) return;
    base44.entities.UserPreferences.filter({ user_email: me.email }).then(r => setUserPrefs(r[0] || null));
  }, [me?.email]);

  // Filter expired posts and blocked users client-side
  const activePosts = posts.filter((p) => {
    if (isBlocked(p.user_email)) return false;
    if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
    return true;
  });

  // Separate recommended vs all posts
  const recommendedPosts = activePosts.filter(
    (p) =>
      p.user_email !== me?.email &&
      userPrefs?.preferred_scent_categories?.includes(p.scent_category)
  );
  const otherPosts = activePosts.filter(
    (p) =>
      p.user_email !== me?.email &&
      !userPrefs?.preferred_scent_categories?.includes(p.scent_category)
  );
  const ownPosts = activePosts.filter((p) => p.user_email === me?.email);

  const handlePost = async (data) => {
    // Optimistic: add immediately
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      ...data,
      user_email: me.email,
      display_name: myProfile?.display_name || me.full_name || "Anonymous",
      avatar_url: myProfile?.avatar_url || null,
      scent_category: myProfile?.scent_category || null,
      created_date: new Date().toISOString(),
    };
    setPosts(prev => [optimistic, ...prev]);
    const created = await base44.entities.StatusPost.create({
      ...data,
      user_email: me.email,
      display_name: myProfile?.display_name || me.full_name || "Anonymous",
      avatar_url: myProfile?.avatar_url || null,
      scent_category: myProfile?.scent_category || null,
    });
    // Replace temp with real record
    setPosts(prev => prev.map(p => p.id === tempId ? created : p));
  };

  const handleDelete = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    base44.entities.StatusPost.delete(id);
  };

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
          onPost={handlePost}
        />
      )}

      {/* Feed */}
      <div className="space-y-5">
        {/* Your posts */}
        {ownPosts.length > 0 && (
          <div>
            <p className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Posts</p>
            <div className="space-y-3">
              {ownPosts.map((post) => (
                <StatusCard
                  key={post.id}
                  post={post}
                  currentUserEmail={me?.email}
                  onDelete={handleDelete}
                  onMessage={handleMessage}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recommended matches */}
        {recommendedPosts.length > 0 && (
          <div>
            <p className="font-heading text-xs font-semibold text-primary uppercase tracking-wide mb-2">🎯 Recommended Matches</p>
            <div className="space-y-3">
              {recommendedPosts.map((post) => (
                <StatusCard
                  key={post.id}
                  post={post}
                  currentUserEmail={me?.email}
                  onDelete={handleDelete}
                  onMessage={handleMessage}
                  isRecommended={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* All other posts */}
        {otherPosts.length > 0 && (
          <div>
            <p className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">All Vibes</p>
            <div className="space-y-3">
              {otherPosts.map((post) => (
                <StatusCard
                  key={post.id}
                  post={post}
                  currentUserEmail={me?.email}
                  onDelete={handleDelete}
                  onMessage={handleMessage}
                />
              ))}
            </div>
          </div>
        )}

        {activePosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <p className="text-4xl mb-3">💨</p>
            <p className="font-body text-sm">No active vibes yet. Be the first to post!</p>
          </div>
        )}
      </div>
    </div>
  );
}