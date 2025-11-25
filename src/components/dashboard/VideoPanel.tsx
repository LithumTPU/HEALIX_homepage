import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Video, Camera, Wifi, WifiOff } from 'lucide-react';
import { toast } from "sonner";

const STREAM_URL = 'http://your-stream-ip:port'; // Configure this

export function VideoPanel() {
  const [enabled, setEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const toggleStream = (checked: boolean) => {
    setEnabled(checked);
    if (checked) {
        if (!STREAM_URL || STREAM_URL.includes('your-stream-ip')) {
            toast.error("Stream URL not configured in code");
            // We allow it to try anyway for demo purposes or show placeholder
            setConnected(false);
            return;
        }
        // Logic to connect would go here - usually setting src
        setConnected(true);
        if (videoRef.current) videoRef.current.src = STREAM_URL;
        if (imgRef.current) imgRef.current.src = STREAM_URL;
    } else {
        setConnected(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = "";
        }
        if (imgRef.current) imgRef.current.src = "";
    }
  };

  return (
    <Card className="h-full border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Video className="h-5 w-5 text-blue-600" />
            Live Monitor
            </CardTitle>
            <Switch checked={enabled} onCheckedChange={toggleStream} />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 shadow-inner">
            {!enabled ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <Video className="h-12 w-12 opacity-20" />
                    <p className="mt-2 text-sm font-medium">Stream Disabled</p>
                </div>
            ) : !connected ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <WifiOff className="h-12 w-12 opacity-20" />
                    <p className="mt-2 text-sm font-medium">Connection Failed / Invalid URL</p>
                </div>
            ) : (
                <>
                    {/* Try Video tag first, fallback to IMG for MJPEG */}
                    <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (imgRef.current) imgRef.current.style.display = 'block';
                    }} />
                    <img ref={imgRef} className="hidden h-full w-full object-cover" alt="Stream" />
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold text-red-500 backdrop-blur-md">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                        LIVE
                    </div>
                </>
            )}
        </div>
        
        <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
                {connected ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3" />}
                {connected ? 'Connected' : 'Disconnected'}
            </div>
            <Button variant="outline" size="sm" disabled={!connected}>
                <Camera className="mr-2 h-3 w-3" />
                Snapshot
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
