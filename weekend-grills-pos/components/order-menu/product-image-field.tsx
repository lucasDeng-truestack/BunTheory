'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '@/services/upload.service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ProductImageFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function ProductImageField({ value, onChange }: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <Label className="font-display text-xs">Food photo</Label>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Main product image only — not for combo options or sizes.
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative aspect-[4/3] w-full max-w-[200px] overflow-hidden rounded-xl border border-border bg-muted/30">
          {value ? (
            <Image
              src={value}
              alt="Product preview"
              fill
              className="object-cover"
              sizes="200px"
              unoptimized
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-3 text-center text-muted-foreground">
              <Upload className="h-6 w-6 opacity-40" aria-hidden />
              <span className="font-display text-[10px] font-semibold uppercase tracking-wide">
                No photo
              </span>
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin text-bbq-flame" />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-display text-xs"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {value ? 'Replace photo' : 'Upload photo'}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-display text-xs text-destructive hover:bg-destructive/10"
              disabled={uploading}
              onClick={() => onChange(null)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
