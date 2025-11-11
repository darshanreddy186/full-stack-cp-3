import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent, NodeViewProps, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Image as ImageIcon, Sparkles, Loader2, X } from 'lucide-react';
import { uploadImage, deleteImage } from '../lib/supabase';
import './RichDiaryEditor.css';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// --- TYPES & INTERFACES ---
export interface Memory { image_url: string; context: string; mood: string; }
interface Notification { message: string; description?: string; type: 'success' | 'error'; }
interface RichDiaryEditorProps { content: string; isEditable: boolean; onChange: (htmlContent: string) => void; onSaveMemory: (memory: Memory) => Promise<void>; showNotification: (notification: Notification) => void; }

// --- 1. THE CUSTOM IMAGE NODE (for individual images) ---
const CustomImageComponent = ({ node, deleteNode, editor }: NodeViewProps) => {
  const { src } = node.attrs;
  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try { await deleteImage(src); deleteNode(); } catch (error) { console.error("Failed to delete image:", error); deleteNode(); }
  };
  return (
    <NodeViewWrapper as="span" className="image-wrapper">
      <img src={src} alt="diary entry" className="diary-image" onClick={() => (window as any).openLightbox(src)} />
      {editor.isEditable && (
        <button type="button" className="delete-image-button" onClick={handleDelete}><X size={16} color="white" /></button>
      )}
    </NodeViewWrapper>
  );
};

// --- 2. THE NEW IMAGE GALLERY NODE (the container) ---
const ImageGalleryNode = Node.create({
  name: 'imageGallery',
  group: 'block',
  content: 'image*', // Allows zero or more image nodes inside
  parseHTML() { return [{ tag: 'div[data-type="image-gallery"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', { ...HTMLAttributes, 'data-type': 'image-gallery', class: 'image-gallery' }, 0]; },
});

// --- 3. THE CUSTOM IMAGE EXTENSION (to be used inside the gallery) ---
const CustomImageExtension = Image.extend({
  name: 'image',
  addNodeView() { return ReactNodeViewRenderer(CustomImageComponent); },
});

// --- MEMORY MODAL (No changes needed here) ---
const useMemoryModal = (onSave: RichDiaryEditorProps['onSaveMemory'], showNotification: RichDiaryEditorProps['showNotification']) => {
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const open = (urls: string[]) => setImageQueue(urls);
  useEffect(() => { if (imageQueue.length > 0 && !currentImage) setCurrentImage(imageQueue[0]); }, [imageQueue, currentImage]);
  const processNextImage = () => { const nextQueue = imageQueue.slice(1); setImageQueue(nextQueue); setCurrentImage(nextQueue[0] || null); setContext(''); };
  const handleSave = async () => { if (!currentImage || !context.trim()) { showNotification({ message: "Please add some context.", type: "error" }); return; } setIsLoading(true); await onSave({ image_url: currentImage, context, mood: 'Neutral' }); setIsLoading(false); processNextImage(); };
  const ModalComponent = currentImage ? ( <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onMouseDown={processNextImage}><div className="relative w-full max-w-lg p-6 bg-white border rounded-lg shadow-lg" onMouseDown={e => e.stopPropagation()}><h2 className="text-lg font-semibold">Create a Memory ({imageQueue.length} left)</h2><div className="py-4 space-y-4"><img src={currentImage} alt="Memory preview" className="object-contain w-full rounded-lg max-h-64" /><textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Your thoughts about this image..." className="w-full p-2 border rounded-md" rows={3} /></div><div className="flex justify-end gap-2"><button onClick={processNextImage} className="px-4 py-2 text-sm rounded-md hover:bg-zinc-100">Skip</button><button onClick={handleSave} disabled={isLoading} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm text-white bg-zinc-900 rounded-md hover:bg-zinc-800 disabled:opacity-50">{isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Add Memory</button></div></div></div> ) : null;
  return { open, ModalComponent };
};

// --- MAIN EDITOR COMPONENT ---
export const RichDiaryEditor = (props: RichDiaryEditorProps) => {
  const { content, isEditable, onChange, onSaveMemory, showNotification } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { open: openMemoryModal, ModalComponent } = useMemoryModal(onSaveMemory, showNotification);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [imageSources, setImageSources] = useState<{ src: string }[]>([]);

  const editor = useEditor({
    extensions: [StarterKit, CustomImageExtension, ImageGalleryNode], // Use the new gallery and image nodes
    content,
    editorProps: { attributes: { class: 'diary-editor-prose focus:outline-none' } },
    editable: isEditable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  
  useEffect(() => {
    (window as any).openLightbox = (src: string) => {
      if (!editor) return;
      const sources = Array.from(editor.view.dom.querySelectorAll('img.diary-image')).map(img => ({ src: (img as HTMLImageElement).src }));
      const newIndex = sources.findIndex(item => item.src === src);
      if (newIndex !== -1) { setImageSources(sources); setLightboxIndex(newIndex); }
    };
    return () => { delete (window as any).openLightbox; }
  }, [editor]);

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);
  
  useEffect(() => {
    if (editor && editor.isEditable !== isEditable) {
      editor.setEditable(isEditable);
    }
  }, [isEditable, editor]);

  const addImages = useCallback(async (files: FileList) => {
    if (!editor || files.length === 0) return;
    setIsUploading(true);
    showNotification({ message: `Uploading ${files.length} image(s)...`, type: 'success' });
    try {
      const publicUrls = await Promise.all(Array.from(files).map(file => uploadImage(file, 'diary_images')));
      const { state, dispatch } = editor.view;
      const { tr, doc } = state;
      const imageNodes = publicUrls.map(url => state.schema.nodes.image.create({ src: url }));
      
      let galleryNodePos: number | null = null;
      doc.descendants((node, pos) => {
        if (node.type.name === 'imageGallery') {
          galleryNodePos = pos;
        }
      });
      
      if (galleryNodePos !== null) {
        // Gallery exists, insert images inside it at the start of its content
        tr.insert(galleryNodePos + 1, imageNodes);
      } else {
        // No gallery, create a new one at the end of the document
        const newGallery = state.schema.nodes.imageGallery.create({}, imageNodes);
        tr.insert(doc.content.size, newGallery);
      }
      dispatch(tr);
      openMemoryModal(publicUrls);
    } catch (error: any) {
      showNotification({ message: 'Upload failed', description: error.message, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  }, [editor, openMemoryModal, showNotification]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) addImages(e.target.files); };

  return (
    <div className="diary-container border border-zinc-200 rounded-lg">
      {isEditable && ( <div className="diary-toolbar p-2 border-b border-zinc-200 flex items-center gap-2"> <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" multiple /> <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-zinc-200 bg-transparent h-9 px-3 hover:bg-zinc-100 disabled:opacity-50"> {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />} Add Image(s) </button> </div> )}
      <EditorContent editor={editor} className="diary-paper p-4" /> 
      {ModalComponent}
      <Lightbox open={lightboxIndex > -1} close={() => setLightboxIndex(-1)} slides={imageSources} index={lightboxIndex} />
    </div>
  );
};