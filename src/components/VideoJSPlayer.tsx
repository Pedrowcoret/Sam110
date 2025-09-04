import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, AlertCircle, RotateCcw, ExternalLink, Activity, Eye, Clock } from 'lucide-react';

interface VideoJSPlayerProps {
  src?: string;
  title?: string;
  isLive?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
  streamStats?: {
    viewers?: number;
    bitrate?: number;
    uptime?: string;
    quality?: string;
    isRecording?: boolean;
  };
}

declare global {
  interface Window {
    videojs: any;
  }
}

const VideoJSPlayer: React.FC<VideoJSPlayerProps> = ({
  src,
  title,
  isLive = false,
  autoplay = false,
  muted = false,
  controls = true,
  className = '',
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  streamStats
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Carregar Video.js dinamicamente
  useEffect(() => {
    const loadVideoJS = async () => {
      // Verificar se Video.js já está carregado
      if (window.videojs) {
        initializePlayer();
        return;
      }

      try {
        // Carregar CSS do Video.js
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://vjs.zencdn.net/8.6.1/video-js.css';
        document.head.appendChild(cssLink);

        // Carregar JavaScript do Video.js
        const script = document.createElement('script');
        script.src = 'https://vjs.zencdn.net/8.6.1/video.min.js';
        script.onload = () => {
          // Carregar plugin HLS
          const hlsScript = document.createElement('script');
          hlsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/videojs-contrib-hls/5.15.0/videojs-contrib-hls.min.js';
          hlsScript.onload = () => {
            initializePlayer();
          };
          document.head.appendChild(hlsScript);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Erro ao carregar Video.js:', error);
        setError('Erro ao carregar player');
      }
    };

    loadVideoJS();

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
        } catch (error) {
          console.warn('Erro ao limpar player:', error);
        }
      }
    };
  }, []);

  // Atualizar fonte quando src mudar
  useEffect(() => {
    if (isPlayerReady && playerRef.current && src) {
      updatePlayerSource();
    }
  }, [src, isPlayerReady]);

  const initializePlayer = () => {
    if (!videoRef.current || !window.videojs) return;

    try {
      setLoading(true);
      setError(null);

      const player = window.videojs(videoRef.current, {
        controls: controls,
        responsive: true,
        fluid: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        html5: {
          hls: {
            overrideNative: true,
            enableLowInitialPlaylist: isLive,
            smoothQualityChange: true,
            handlePartialData: true
          },
          vhs: {
            overrideNative: true
          }
        },
        liveui: isLive,
        liveTracker: isLive ? {
          trackingThreshold: 20,
          liveTolerance: 15
        } : false,
        plugins: {
          // Configurar plugins se necessário
        }
      });

      // Event listeners
      player.ready(() => {
        console.log('✅ Video.js player pronto');
        setIsPlayerReady(true);
        setLoading(false);
        if (onReady) onReady();
        
        // Configurar fonte inicial
        if (src) {
          updatePlayerSource();
        }
      });

      player.on('play', () => {
        console.log('▶️ Video.js play');
        if (onPlay) onPlay();
      });

      player.on('pause', () => {
        console.log('⏸️ Video.js pause');
        if (onPause) onPause();
      });

      player.on('ended', () => {
        console.log('🔚 Video.js ended');
        if (onEnded) onEnded();
      });

      player.on('error', (e: any) => {
        console.error('❌ Video.js error:', e);
        const errorObj = player.error();
        
        let errorMessage = 'Erro ao carregar vídeo';
        if (errorObj) {
          switch (errorObj.code) {
            case 1:
              errorMessage = 'Reprodução abortada';
              break;
            case 2:
              errorMessage = 'Erro de rede';
              break;
            case 3:
              errorMessage = 'Erro de decodificação';
              break;
            case 4:
              errorMessage = 'Formato não suportado';
              break;
            default:
              errorMessage = errorObj.message || 'Erro desconhecido';
          }
        }
        
        setError(errorMessage);
        setLoading(false);
        if (onError) onError(e);
      });

      player.on('loadstart', () => {
        setLoading(true);
        setError(null);
      });

      player.on('canplay', () => {
        setLoading(false);
      });

      player.on('waiting', () => {
        setLoading(true);
      });

      player.on('playing', () => {
        setLoading(false);
      });

      playerRef.current = player;
    } catch (error) {
      console.error('Erro ao inicializar Video.js:', error);
      setError('Erro ao inicializar player');
      setLoading(false);
    }
  };

  const updatePlayerSource = () => {
    if (!playerRef.current || !src) return;

    try {
      console.log('🎥 Atualizando fonte Video.js:', src);
      
      // Detectar tipo de fonte
      const isHLS = src.includes('.m3u8') || isLive;
      
      const sourceConfig = {
        src: src,
        type: isHLS ? 'application/x-mpegURL' : 'video/mp4',
        withCredentials: false
      };

      // Configurar headers de autenticação se necessário
      if (src.includes('/content/') || src.includes('/api/')) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          sourceConfig.withCredentials = true;
          // Para Video.js, configurar headers via xhr
          playerRef.current.ready(() => {
            const tech = playerRef.current.tech();
            if (tech && tech.hls) {
              tech.hls.xhr.beforeRequest = (options: any) => {
                options.headers = options.headers || {};
                options.headers['Authorization'] = `Bearer ${token}`;
                return options;
              };
            }
          });
        }
      }

      playerRef.current.src(sourceConfig);
      
      if (autoplay) {
        setTimeout(() => {
          playerRef.current.play().catch((error: any) => {
            console.warn('Autoplay falhou:', error);
          });
        }, 100);
      }
    } catch (error) {
      console.error('Erro ao atualizar fonte:', error);
      setError('Erro ao carregar vídeo');
    }
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    if (playerRef.current && src) {
      updatePlayerSource();
    }
  };

  const openInNewTab = () => {
    if (src) {
      // Para vídeos que precisam de token, construir URL externa
      if (src.includes('/content/') || src.includes('/api/')) {
        const token = localStorage.getItem('auth_token');
        const separator = src.includes('?') ? '&' : '?';
        const externalUrl = `${src}${separator}auth_token=${encodeURIComponent(token || '')}`;
        window.open(externalUrl, '_blank');
      } else {
        window.open(src, '_blank');
      }
    }
  };

  return (
    <div className={`videojs-player-container relative ${className}`}>
      {/* Estatísticas do stream */}
      {streamStats && showStats && (
        <div className="absolute top-4 left-4 z-20 bg-black bg-opacity-80 text-white p-3 rounded-lg text-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Eye className="h-3 w-3" />
              <span>{streamStats.viewers || 0} espectadores</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-3 w-3" />
              <span>{streamStats.bitrate || 0} kbps</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>{streamStats.uptime || '00:00:00'}</span>
            </div>
            {streamStats.quality && (
              <div className="flex items-center space-x-2">
                <Settings className="h-3 w-3" />
                <span>{streamStats.quality}</span>
              </div>
            )}
            {streamStats.isRecording && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Gravando</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indicador de transmissão ao vivo */}
      {isLive && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-red-600 text-white px-3 py-1 rounded-full flex items-center space-x-2 text-sm font-medium">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>AO VIVO</span>
          </div>
        </div>
      )}

      {/* Botão de estatísticas */}
      {streamStats && (
        <div className="absolute top-4 right-20 z-20">
          <button
            onClick={() => setShowStats(!showStats)}
            className="bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-opacity-80 transition-opacity"
            title="Estatísticas"
          >
            <Activity className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black bg-opacity-50 rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white text-sm">Carregando Video.js...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black bg-opacity-75 rounded-lg">
          <div className="flex flex-col items-center space-y-4 text-white text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Erro de Reprodução</h3>
              <p className="text-sm text-gray-300 mb-4">{error}</p>
              <div className="flex space-x-3">
                <button
                  onClick={retry}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Tentar Novamente</span>
                </button>
                <button
                  onClick={openInNewTab}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Abrir em Nova Aba</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder quando não há vídeo */}
      {!src && (
        <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex flex-col items-center justify-center text-white">
          <Play className="h-16 w-16 mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Video.js Player</h3>
          <p className="text-gray-400 text-center max-w-md">
            Player profissional com suporte completo a HLS, MP4 e recursos avançados
          </p>
        </div>
      )}

      {/* Elemento de vídeo para Video.js */}
      <video
        ref={videoRef}
        className={`video-js vjs-default-skin w-full ${!src ? 'hidden' : ''}`}
        controls={controls}
        preload="auto"
        data-setup="{}"
        playsInline
        crossOrigin="anonymous"
      />

      {/* Título do vídeo */}
      {title && src && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none rounded-b-lg">
          <h3 className="text-white text-lg font-semibold truncate">{title}</h3>
          {streamStats && (
            <div className="text-white text-sm opacity-80 mt-1">
              {streamStats.quality && <span>{streamStats.quality}</span>}
              {streamStats.bitrate && <span> • {streamStats.bitrate} kbps</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoJSPlayer;