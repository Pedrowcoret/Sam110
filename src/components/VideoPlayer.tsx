import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStream } from '../context/StreamContext';
import VideoJSPlayer from './VideoJSPlayer';

interface VideoPlayerProps {
  playlistVideo?: {
    id: number;
    nome: string;
    url: string;
    duracao?: number;
  };
  onVideoEnd?: () => void;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  height?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  playlistVideo, 
  onVideoEnd, 
  className = "w-full",
  autoplay = false,
  controls = true,
  height = "h-96"
}) => {
  const { user } = useAuth();
  
  const [obsStreamActive, setObsStreamActive] = useState(false);
  const [obsStreamUrl, setObsStreamUrl] = useState<string>('');

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);

  useEffect(() => {
    checkOBSStream();
  }, []);

  const checkOBSStream = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/streaming/obs-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.obs_stream.is_live) {
          setObsStreamActive(true);
          setObsStreamUrl(`http://samhost.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8`);
        } else {
          setObsStreamActive(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar stream OBS:', error);
    }
  };
  
  // Determinar fonte de vídeo
  const getVideoSource = () => {
    if (playlistVideo?.url) {
      return playlistVideo.url;
    } else if (streamData.isLive) {
      return `http://samhost.wcore.com.br:1935/samhost/${userLogin}_live/playlist.m3u8`;
    } else if (obsStreamActive) {
      return obsStreamUrl;
    }
    return '';
  };

  const getVideoTitle = () => {
    return playlistVideo?.nome || 
      (streamData.isLive ? streamData.title || 'Transmissão ao Vivo' : 
       obsStreamActive ? 'Transmissão OBS ao Vivo' : undefined);
  };

  const isLive = !playlistVideo && (streamData.isLive || obsStreamActive);

  return (
    <VideoJSPlayer
      src={getVideoSource()}
      title={getVideoTitle()}
      isLive={isLive}
      autoplay={autoplay}
      controls={controls}
      className={`${className} ${height}`}
      onEnded={onVideoEnd}
      onError={(error) => {
        console.error('Erro no Video.js player:', error);
      }}
      onReady={() => {
        console.log('Video.js player pronto');
      }}
      onPlay={() => {
        console.log('Video.js player iniciado');
      }}
      onPause={() => {
        console.log('Video.js player pausado');
      }}
      streamStats={isLive ? {
        viewers: Math.floor(Math.random() * 50) + 5,
        bitrate: 2500,
        uptime: '00:15:30',
        quality: '1080p',
        isRecording: false
      } : undefined}
    />
  );
};

export default VideoPlayer;