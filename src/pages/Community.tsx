import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Toaster, toast } from 'sonner';
import { Plus, MessageCircle, Users, Send, ArrowLeft, Heart, Shield, Sparkles, LoaderCircle, Phone, XCircle, Eye, EyeOff, Tag, Clock, Filter } from 'lucide-react';

// --- AI Moderation Setup (Client-Side) ---
// WARNING: This exposes your API key to the browser. Use with extreme caution.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY1;
if (!GEMINI_API_KEY) {
    console.warn("VITE_GEMINI_API_KEY is not set. AI moderation will be disabled.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

type ModerationCategory = 'urgent_risk' | 'harmful_instruction' | 'support_needed' | 'safe';
interface ModerationResult {
    category: ModerationCategory;
    reason: string;
    analysis: object;
}

/**
 * Universal moderation function with contextual awareness.
 * @param contentToModerate The new text to analyze.
 * @param postContext The original post's content, if available.
 * @returns A promise resolving to a ModerationResult object.
 */
async function moderateContent(contentToModerate: string, postContext: string | null = null): Promise<ModerationResult> {
    if (!GEMINI_API_KEY) return { category: 'safe', reason: 'API Key not configured.', analysis: {} };

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-latest" });
    const system_prompt = `You are a sophisticated AI safety moderator for a mental health support community. Your job is to analyze user-submitted text for safety and intent, often with the context of an original post.

    Categories & Rules:
    1.  'urgent_risk': The user is expressing a clear, FIRST-PERSON, immediate intention to self-harm (e.g., "I am going to kill myself"). This is a cry for help from the author of the text being analyzed.
    2.  'harmful_instruction': The user is telling SOMEONE ELSE to self-harm or do something dangerous. This is a malicious command, ESPECIALLY if the original post context is about sadness or suicide (e.g., Comment: "do the same yourself" in reply to Post: "my friend committed suicide").
    3.  'support_needed': The text is safe, but the author expresses significant sadness or distress, but not an immediate crisis (e.g., "I feel so empty").
    4.  'safe': The text is supportive, neutral, or otherwise harmless.

    Analyze the content provided and respond in JSON format ONLY, with no markdown:
    {
      "category": "urgent_risk|harmful_instruction|support_needed|safe",
      "reason": "A brief explanation of your classification based on the provided context."
    }`;
    
    let fullPrompt = system_prompt;
    if (postContext) {
        fullPrompt += `\n\n[ORIGINAL POST FOR CONTEXT]:\n"${postContext}"\n\n[NEW COMMENT TO ANALYZE]:\n"${contentToModerate}"`;
    } else {
        fullPrompt += `\n\n[NEW POST TO ANALYZE]:\n"${contentToModerate}"`;
    }

    try {
        const result = await model.generateContent(fullPrompt);
        const responseText = await result.response.text();
        const jsonString = responseText.substring(responseText.indexOf('{'), responseText.lastIndexOf('}') + 1);
        const analysis = JSON.parse(jsonString);
        return { category: analysis.category, reason: analysis.reason, analysis };
    } catch (error) {
        console.error('Moderation error:', error);
        return { category: 'safe', reason: "AI check failed.", analysis: { error: "AI check failed" } };
    }
}

/**
 * Generates a short, empathetic message for users who seem to be struggling.
 * @param content The user's original content.
 * @returns A promise resolving to a supportive string.
 */
async function generateSupportiveMessage(content: string): Promise<string> {
    if (!GEMINI_API_KEY) return "It sounds like you're going through a lot. Please remember to be kind to yourself.";
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-latest" });
    const prompt = `A user wrote: "${content}". Write a short, gentle, and empathetic message (1-2 sentences) acknowledging their feelings. Do not give advice. Start with "It sounds like you're going through a lot right now."`;
    try {
        const result = await model.generateContent(prompt);
        return await result.response.text();
    } catch {
        return "It sounds like you're going through a lot right now. Please remember to be kind to yourself.";
    }
}

// --- TypeScript Interfaces ---
interface Post { id: string; created_at: string; content: string; user_id: string | null; author_name: string | null; tags: string[] | null; comment_count: number; }
interface Comment { id: string; created_at: string; content: string; post_id: string; user_id: string; author_name: string | null; parent_comment_id: string | null; replies: Comment[]; }

// --- React Component ---
export function Community() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCrisisModal, setShowCrisisModal] = useState(false);
    const [postFilter, setPostFilter] = useState<'all' | 'yours'>('all');
    const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
    const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const [postFormData, setPostFormData] = useState({ content: '', author_name: '', tags: '' });
    const [commentFormData, setCommentFormData] = useState({ content: '', author_name: '' });

    const loadPosts = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('posts').select('*');
        if (postFilter === 'yours' && user) {
            query = query.eq('user_id', user.id);
        }
        query = query.order('created_at', { ascending: false });
        try {
            const { data, error } = await query;
            if (error) throw error;
            setPosts(data || []);
        } catch (error) { 
            toast.error("Failed to load posts."); 
        } finally { 
            setLoading(false); 
        }
    }, [postFilter, user]);

    const loadComments = useCallback(async (postId: string) => {
        try {
            const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
            if (error) throw error;
            const commentMap = new Map((data || []).map(c => [c.id, { ...c, replies: [] }]));
            const threadedComments: Comment[] = [];
            for (const comment of commentMap.values()) {
                if (comment.parent_comment_id && commentMap.has(comment.parent_comment_id)) {
                    commentMap.get(comment.parent_comment_id)?.replies.push(comment as Comment);
                } else {
                    threadedComments.push(comment as Comment);
                }
            }
            setComments(threadedComments);
            // FIX: Return the raw data for accurate counting
            return data || [];
        } catch (error) { 
            console.error('Error loading comments:', error);
            // FIX: Return empty array on error
            return [];
        }
    }, []);

    useEffect(() => {
        if (!selectedPost) {
            loadPosts();
        } else {
            loadComments(selectedPost.id);
        }
    }, [selectedPost, postFilter, user, loadPosts, loadComments]);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!postFormData.content.trim()) return;
        setIsSubmitting(true);

        const moderationResult = await moderateContent(postFormData.content);

        if (moderationResult.category === 'urgent_risk') {
            setShowCrisisModal(true);
            setIsSubmitting(false);
            return;
        }

        try {
            const tagArray = postFormData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            const { data, error } = await supabase.from('posts').insert([{ content: postFormData.content, author_name: postFormData.author_name || 'Anonymous', user_id: user?.id, tags: tagArray, ai_analysis: moderationResult.analysis }]).select().single();
            if (error) throw error;
            setPosts([data, ...posts]);
            setPostFormData({ content: '', author_name: '', tags: '' });
            setShowCreateForm(false);
            toast.success("Your story has been shared!", {
                description: "Thank you for being brave and sharing your experience."
            });
        } catch (error) { 
            toast.error("Failed to share your story."); 
        } finally { 
            setIsSubmitting(false); 
        }
    };
    
    const proceedWithPosting = async (ai_analysis: object) => {
        if (!commentFormData.content.trim() || !selectedPost) return;
        setIsSubmitting(true);
    
        try {
            if (!user) throw new Error("You must be logged in to post a response.");
            
            // Insert the new comment
            const { error } = await supabase.from('comments').insert([{
                post_id: selectedPost.id,
                content: commentFormData.content,
                author_name: commentFormData.author_name || 'Anonymous',
                user_id: user.id,
                parent_comment_id: replyTo?.id,
                ai_analysis
            }]).select().single();
    
            if (error) throw error;
    
            // --- FIX: Recalculate comment count accurately after posting ---
            // 1. Reload all comments for the post and get the raw data
            const allComments = await loadComments(selectedPost.id);
            const newCount = allComments.length;
    
            // 2. Update the count in the Supabase 'posts' table
            await supabase.from('posts').update({ comment_count: newCount }).eq('id', selectedPost.id);
    
            // 3. Update the local state for both the detailed view and the main list view
            setSelectedPost(currentPost => currentPost ? { ...currentPost, comment_count: newCount } : null);
            setPosts(currentPosts => currentPosts.map(p =>
                p.id === selectedPost.id ? { ...p, comment_count: newCount } : p
            ));
            // --- End of FIX ---
    
            toast.success("Your response was posted.", {
                description: "Thank you for contributing to the community."
            });
            setCommentFormData({ content: '', author_name: '' });
            setReplyTo(null);
        } catch (error) {
            toast.error("Could not save your response.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateResponse = async () => {
        if (!commentFormData.content.trim() || !selectedPost) return;
        setIsSubmitting(true);

        const moderationResult = await moderateContent(commentFormData.content, selectedPost.content);
        
        switch (moderationResult.category) {
            case 'urgent_risk':
                setShowCrisisModal(true);
                setIsSubmitting(false);
                break;
            case 'harmful_instruction':
                toast.error("Harmful or instructional comments are not permitted.", { 
                    icon: <XCircle className="text-red-500" />,
                    description: "Please keep our community safe and supportive."
                });
                setIsSubmitting(false);
                break;
            case 'support_needed':
                const supportMessage = await generateSupportiveMessage(commentFormData.content);
                toast(
                    <div className="space-y-1">
                        <p className='font-bold flex items-center gap-2'>
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            AI Peace of Mind
                        </p>
                        <p className="text-sm text-gray-600">{supportMessage}</p>
                    </div>, {
                        duration: 10000,
                        action: { 
                            label: 'Post Anyway', 
                            onClick: () => proceedWithPosting(moderationResult.analysis) 
                        },
                        onDismiss: () => setIsSubmitting(false),
                        onAutoClose: () => setIsSubmitting(false)
                    }
                );
                break;
            case 'safe':
                await proceedWithPosting(moderationResult.analysis);
                break;
            default:
                setIsSubmitting(false);
        }
    };
    
    const handleReplyClick = (comment: Comment) => {
        setReplyTo({ id: comment.id, authorName: comment.author_name || 'Anonymous' });
        commentInputRef.current?.focus();
        commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const togglePostExpansion = (postId: string) => {
        const newExpanded = new Set(expandedPosts);
        if (newExpanded.has(postId)) {
            newExpanded.delete(postId);
        } else {
            newExpanded.add(postId);
        }
        setExpandedPosts(newExpanded);
    };

    const totalCommentCount = comments.reduce((acc, comment) => acc + 1 + comment.replies.length, 0);

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        // FIX: Prevent negative seconds due to clock skew between client and server
        const diffSec = Math.max(0, Math.floor(diffMs / 1000));
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);

        if (diffSec < 60) return `${diffSec}s ago`;
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffHour < 48) return 'Yesterday';
        return date.toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
            <div className="max-w-4xl mx-auto space-y-6 p-4 pb-20">
                <Toaster 
                    richColors 
                    position="top-right" 
                    toastOptions={{
                        style: {
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px'
                        }
                    }}
                />
                <CrisisModal isOpen={showCrisisModal} onClose={() => setShowCrisisModal(false)} />

                {selectedPost ? (
                    // --- Enhanced Post Detail View ---
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <div className="sticky top-4 z-10 mb-6">
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm p-3">
                                <button 
                                    onClick={() => setSelectedPost(null)} 
                                    className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 font-medium transition-colors group"
                                >
                                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                                    <span>Back to Community</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Enhanced Original Post Card */}
                        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm mb-8 border border-white/50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                            
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <span className="text-xl text-white font-bold">
                                        {selectedPost.author_name ? selectedPost.author_name[0].toUpperCase() : 'A'}
                                    </span>
                                </div>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-gray-800">{selectedPost.author_name || 'Anonymous'}</h3>
                                        <span className="text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full shadow-sm">
                                            Original Author
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        <span>{getTimeAgo(selectedPost.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="prose max-w-none">
                                <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg">
                                    {selectedPost.content}
                                </p>
                            </div>

                            {selectedPost.tags && selectedPost.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                                    {selectedPost.tags.map(tag => (
                                        <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                            <Tag className="w-3 h-3" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <MessageCircle className="w-4 h-4" />
                                    <span>{totalCommentCount} community responses</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                    <Heart className="w-4 h-4" />
                                    <span>Supported by {totalCommentCount > 0 ? `${totalCommentCount} members` : 'the community'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Community Responses Section */}
                        <div className="space-y-6 " style={{ marginBottom: '150px' }}>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-gray-800">Community Responses</h2>
                                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                                    {totalCommentCount}
                                </span>
                            </div>
                            
                            {comments.length > 0 ? (
                                <div className="space-y-4">
                                    {comments.map(comment => (
                                        <CommentComponent 
                                            key={comment.id} 
                                            comment={comment} 
                                            user={user} 
                                            postAuthorId={selectedPost.user_id} 
                                            onReplyClick={handleReplyClick}
                                            getTimeAgo={getTimeAgo}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white/50 rounded-2xl border border-gray-100">
                                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 text-lg">Be the first to show support</p>
                                    <p className="text-gray-400 text-sm mt-1">Your words can make a difference</p>
                                </div>
                            )}
                        </div>

                        {/* Enhanced Comment Input Form */}
                        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 z-20">
                            <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50">
                                {replyTo && (
                                    <div className="flex justify-between items-center text-sm text-gray-600 mb-3 p-2 bg-purple-50 rounded-lg">
                                        <span className="flex items-center gap-2">
                                            <ArrowLeft className="w-4 h-4 text-purple-500" />
                                            Replying to <span className="font-semibold text-purple-700">{replyTo.authorName}</span>
                                        </span>
                                        <button 
                                            onClick={() => setReplyTo(null)} 
                                            className="text-red-500 hover:text-red-700 font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                                
                                <div className="flex flex-col gap-3">
                                    <AutoGrowTextarea 
                                        ref={commentInputRef} 
                                        value={commentFormData.content} 
                                        onChange={(e) => setCommentFormData({...commentFormData, content: e.target.value})} 
                                        placeholder="Share your thoughts and support..." 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl transition-all resize-none"
                                    />
                                    
                                    <div className='flex gap-3'>
                                        <input 
                                            type="text" 
                                            value={commentFormData.author_name} 
                                            onChange={(e) => setCommentFormData({...commentFormData, author_name: e.target.value})} 
                                            placeholder="Name (Optional)" 
                                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl transition-all"
                                        />
                                        <button 
                                            onClick={handleCreateResponse} 
                                            disabled={!commentFormData.content.trim() || isSubmitting} 
                                            className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-105"
                                        >
                                            {isSubmitting ? (
                                                <LoaderCircle className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-5 h-5 mr-2" />
                                                    <span>Send</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- Enhanced Community Overview ---
                    <div className="space-y-8">
                        {/* Enhanced Header */}
                        <header className="text-center py-8">
                            <div className="inline-flex items-center gap-4 mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
                                    <Heart className="w-10 h-10 text-white" />
                                </div>
                                <div className="text-left">
                                    <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 bg-clip-text text-transparent">
                                        Safe Space
                                    </h1>
                                    <p className="text-lg text-gray-600 mt-1">Where every story matters</p>
                                </div>
                            </div>
                            
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
                                A supportive community powered by compassion, protected by AI, and united by shared understanding.
                            </p>
                            
                            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
                                <div className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full">
                                    <Shield className="w-4 h-4 text-purple-500" />
                                    <span>AI-Protected</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full">
                                    <Users className="w-4 h-4 text-pink-500" />
                                    <span>Anonymous Friendly</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    <span>24/7 Support</span>
                                </div>
                            </div>
                        </header>

                        {/* Enhanced Action Button */}
                        <div className="text-center">
                            <button 
                                onClick={() => setShowCreateForm(!showCreateForm)} 
                                className="group inline-flex items-center px-10 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                            >
                                <Plus className="w-6 h-6 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                                <span className="text-lg">Share Your Story</span>
                                <div className="ml-3 opacity-75 group-hover:opacity-100 transition-opacity">✨</div>
                            </button>
                        </div>

                        {/* Enhanced Create Form */}
                        {showCreateForm && (
                            <div className="animate-in slide-in-from-top-4 duration-300">
                                <form onSubmit={handleCreatePost} className="space-y-6 p-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                                            <Heart className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-800">Share Your Story</h2>
                                            <p className="text-gray-600">Your voice matters and you're not alone</p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Your Story</label>
                                        <textarea 
                                            required 
                                            rows={6} 
                                            value={postFormData.content} 
                                            onChange={(e) => setPostFormData({...postFormData, content: e.target.value})} 
                                            className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                                            placeholder="Share what's on your mind. Your story could help someone else feel less alone..."
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                                            <input 
                                                type="text" 
                                                value={postFormData.author_name} 
                                                onChange={(e) => setPostFormData({...postFormData, author_name: e.target.value})} 
                                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                                                placeholder="Anonymous"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Leave blank to post anonymously</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                            <input 
                                                type="text" 
                                                value={postFormData.tags} 
                                                onChange={(e) => setPostFormData({...postFormData, tags: e.target.value})} 
                                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                                                placeholder="anxiety, relationships, support"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowCreateForm(false)} 
                                            className="px-6 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting || !postFormData.content.trim()} 
                                            className="flex items-center justify-center min-w-[160px] px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-105"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <LoaderCircle className="w-5 h-5 animate-spin mr-2" />
                                                    <span>Sharing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Heart className="w-5 h-5 mr-2" />
                                                    <span>Share Story</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Enhanced Filter Section */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-purple-600" />
                                    <span className="font-medium text-gray-700">Filter Stories</span>
                                </div>
                                <div className="flex rounded-xl bg-gray-100 p-1">
                                    <button 
                                        onClick={() => setPostFilter('all')} 
                                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${postFilter === 'all' 
                                            ? 'bg-white text-purple-600 shadow-sm' 
                                            : 'text-gray-600 hover:text-purple-600'}`}
                                    >
                                        All Stories
                                    </button>
                                    {user && (
                                        <button 
                                            onClick={() => setPostFilter('yours')} 
                                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${postFilter === 'yours' 
                                                ? 'bg-white text-purple-600 shadow-sm' 
                                                : 'text-gray-600 hover:text-purple-600'}`}
                                        >
                                            Your Stories
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Posts Grid */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-16">
                                    <LoaderCircle className="w-12 h-12 animate-spin mx-auto text-purple-500 mb-4" />
                                    <p className="text-gray-600">Loading stories...</p>
                                </div>
                            ) : posts.length > 0 ? (
                                posts.map((post) => {
                                    const isExpanded = expandedPosts.has(post.id);
                                    const shouldTruncate = post.content.length > 300;
                                    const displayContent = isExpanded || !shouldTruncate 
                                        ? post.content 
                                        : post.content.substring(0, 300) + '...';
                                    
                                    return (
                                        <div 
                                            key={post.id} 
                                            className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-white/50 relative overflow-hidden hover:scale-[1.01]"
                                            onClick={() => setSelectedPost(post)}
                                        >
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                                    <span className="text-xl text-white font-bold">
                                                        {post.author_name ? post.author_name[0].toUpperCase() : 'A'}
                                                    </span>
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-gray-800 group-hover:text-purple-700 transition-colors">
                                                            {post.author_name || 'Anonymous'}
                                                        </h3>
                                                        {post.user_id === user?.id && (
                                                            <span className="text-xs font-semibold text-white bg-blue-500 px-2 py-1 rounded-full">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{getTimeAgo(post.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="prose max-w-none mb-4">
                                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                    {displayContent}
                                                </p>
                                                
                                                {shouldTruncate && !isExpanded && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePostExpansion(post.id);
                                                        }}
                                                        className="mt-2 text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Read more
                                                    </button>
                                                )}
                                                
                                                {isExpanded && shouldTruncate && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePostExpansion(post.id);
                                                        }}
                                                        className="mt-2 text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1"
                                                    >
                                                        <EyeOff className="w-4 h-4" />
                                                        Show less
                                                    </button>
                                                )}
                                            </div>

                                            {post.tags && post.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {post.tags.slice(0, 3).map(tag => (
                                                        <span 
                                                            key={tag} 
                                                            className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                                                        >
                                                            <Tag className="w-3 h-3" />
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {post.tags.length > 3 && (
                                                        <span className="text-xs text-gray-500 px-2 py-1">
                                                            +{post.tags.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <MessageCircle className="w-4 h-4" />
                                                    <span>{post.comment_count || 0} responses</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-gray-400 group-hover:text-purple-600 transition-colors">
                                                    <Heart className="w-4 h-4" />
                                                    <span>Click to support</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-16 bg-white/50 rounded-2xl border border-gray-100">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Heart className="w-10 h-10 text-purple-500" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                        {postFilter === 'yours' ? "Your Stories Await" : "Be the First to Share"}
                                    </h3>
                                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                        {postFilter === 'yours' 
                                            ? "You haven't shared any stories yet. Your experiences could help others feel less alone." 
                                            : "This community is waiting for its first story. Your courage to share could inspire others."
                                        }
                                    </p>
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Share Your Story
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Enhanced Sub-Components ---
const CommentComponent = ({ 
    comment, 
    user, 
    postAuthorId, 
    onReplyClick, 
    getTimeAgo 
}: { 
    comment: Comment; 
    user: any; 
    postAuthorId: string | null; 
    onReplyClick: (comment: Comment) => void;
    getTimeAgo: (dateString: string) => string;
}) => {
    const isAuthor = comment.user_id === postAuthorId;
    const isYou = comment.user_id === user?.id;
    // --- THIS IS THE FIX ---
    // Allow any logged-in user to reply to any comment.
    const canReply = user;

    return (
        <div className="flex gap-4">
            {/* Enhanced Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <span className="text-base text-white font-bold">
                    {comment.author_name ? comment.author_name[0].toUpperCase() : 'A'}
                </span>
            </div>
            
            <div className="flex-grow">
                {/* Enhanced Comment Body */}
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-sm text-gray-800">{comment.author_name || 'Anonymous'}</span>
                        {isAuthor && (
                            <span className="text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-1 rounded-full">
                                Original Author
                            </span>
                        )}
                        {isYou && !isAuthor && (
                            <span className="text-xs font-semibold text-white bg-blue-500 px-2 py-1 rounded-full">
                                You
                            </span>
                        )}
                    </div>
                    <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                </div>
                
                {/* Enhanced Actions */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 pl-2">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getTimeAgo(comment.created_at)}</span>
                    </div>
                    {canReply && (
                        <button 
                            onClick={() => onReplyClick(comment)} 
                            className="font-semibold hover:text-purple-600 transition-colors flex items-center gap-1"
                        >
                            <MessageCircle className="w-3 h-3" />
                            Reply
                        </button>
                    )}
                </div>
                
                {/* Enhanced Replies with better visual hierarchy */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-6 border-l-2 border-purple-200">
                        {comment.replies.map(reply => (
                            <CommentComponent 
                                key={reply.id} 
                                comment={reply} 
                                user={user} 
                                postAuthorId={postAuthorId} 
                                onReplyClick={onReplyClick}
                                getTimeAgo={getTimeAgo}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const AutoGrowTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current!);
    
    useLayoutEffect(() => { 
        const t = internalRef.current; 
        if (t) { 
            t.style.height = 'auto'; 
            t.style.height = `${t.scrollHeight}px`; 
        }
    }, [props.value]);
    
    return <textarea {...props} ref={internalRef} rows={1} />;
});

AutoGrowTextarea.displayName = 'AutoGrowTextarea';

const CrisisModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-pink-500"></div>
                
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                    <Phone className="h-10 w-10 text-red-600" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Immediate Help Available</h3>
                
                <div className="mb-6">
                    <p className="text-gray-600 leading-relaxed">
                        We noticed your message suggests you might be in crisis. Your safety matters, and there are people ready to help right now. Your content was not posted for your protection.
                    </p>
                </div>
                
                <div className="bg-red-50 p-6 rounded-2xl mb-6 text-left">
                    <h4 className="font-bold text-red-800 mb-4 text-center">Crisis Resources</h4>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-red-700">
                            <Phone className="w-5 h-5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">National Suicide Prevention Lifeline</p>
                                <p className="text-xl font-bold">988</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-red-700">
                            <MessageCircle className="w-5 h-5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Crisis Text Line</p>
                                <p>Text <span className="font-bold">HOME</span> to <span className="font-bold">741741</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-xl hover:from-red-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
};