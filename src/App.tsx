import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DrawingUtils,
  FaceLandmarker,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { AppState } from './types';
import { useCamera } from './hooks/useCamera';
import { useAlarm } from './hooks/useAlarm';
import { useFaceLandmarker } from './hooks/useFaceLandmarker';
import { usePoseLandmarker } from './hooks/usePoseLandmarker';
import { StartScreen } from './components/StartScreen';
import { MonitoringScreen } from './components/MonitoringScreen';
import { PenaltyScreen } from './components/PenaltyScreen';

const EAR_THRESHOLD = 0.2;
const DROWSY_DURATION_SEC = 3;
const REQUIRED_SQUATS = 5;

function App() {
  const [appState, setAppState] = useState<AppState>('start');
  const [loading, setLoading] = useState(false);
  const [ear, setEar] = useState(0.3);
  const [drowsySeconds, setDrowsySeconds] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [squatCount, setSquatCount] = useState(0);
  const [isSquatting, setIsSquatting] = useState(false);
  const [kneeAngle, setKneeAngle] = useState(180);

  const { videoRef, startCamera, attachStream } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const { unlockAudio, startAlarm, stopAlarm } = useAlarm();
  const faceLandmarker = useFaceLandmarker();
  const poseLandmarker = usePoseLandmarker();

  const animFrameRef = useRef(0);
  const drowsyStartRef = useRef<number | null>(null);
  const lastTimestampRef = useRef(0);

  // --- Canvas helpers ---
  const getDrawingUtils = useCallback(() => {
    if (drawingUtilsRef.current) return drawingUtilsRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    drawingUtilsRef.current = new DrawingUtils(ctx);
    return drawingUtilsRef.current;
  }, []);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }
  }, [videoRef]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const drawFaceLandmarks = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      syncCanvasSize();
      clearCanvas();
      const du = getDrawingUtils();
      if (!du) return;

      // Tesselation grid — white wireframe like the MediaPipe demo
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: 'rgba(255, 255, 255, 0.18)',
        lineWidth: 0.5,
      });

      // Face contours — slightly brighter white on top of the grid
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_CONTOURS, {
        color: 'rgba(255, 255, 255, 0.5)',
        lineWidth: 1,
      });

      // Eyes — bright green to stand out
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
        color: 'rgba(57, 255, 20, 0.8)',
        lineWidth: 2,
      });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
        color: 'rgba(57, 255, 20, 0.8)',
        lineWidth: 2,
      });

      // Irises — purple accent
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, {
        color: 'rgba(168, 85, 247, 0.9)',
        lineWidth: 2,
      });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, {
        color: 'rgba(168, 85, 247, 0.9)',
        lineWidth: 2,
      });
    },
    [syncCanvasSize, clearCanvas, getDrawingUtils],
  );

  const drawPoseLandmarks = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      syncCanvasSize();
      clearCanvas();
      const du = getDrawingUtils();
      if (!du) return;

      // Skeleton connections
      du.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: '#00d4ff',
        lineWidth: 3,
      });

      // Landmark points
      du.drawLandmarks(landmarks, {
        color: '#ff2d55',
        fillColor: '#ff2d55',
        lineWidth: 1,
        radius: 4,
      });
    },
    [syncCanvasSize, clearCanvas, getDrawingUtils],
  );

  // --- Monitoring loop ---
  const runMonitoringLoop = useCallback(() => {
    const loop = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      if (now <= lastTimestampRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }
      lastTimestampRef.current = now;

      const result = faceLandmarker.detectEAR(video, now);

      if (result) {
        setFaceDetected(true);
        setEar(result.average);
        drawFaceLandmarks(result.landmarks);

        if (result.average < EAR_THRESHOLD) {
          if (drowsyStartRef.current === null) {
            drowsyStartRef.current = now;
          }
          const elapsed = (now - drowsyStartRef.current) / 1000;
          setDrowsySeconds(elapsed);

          if (elapsed >= DROWSY_DURATION_SEC) {
            cancelAnimationFrame(animFrameRef.current);
            clearCanvas();
            setAppState('penalty');
            return;
          }
        } else {
          drowsyStartRef.current = null;
          setDrowsySeconds(0);
        }
      } else {
        setFaceDetected(false);
        clearCanvas();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [faceLandmarker, videoRef, drawFaceLandmarks, clearCanvas]);

  // --- Penalty (squat) loop ---
  const runPenaltyLoop = useCallback(() => {
    let localSquatCount = 0;

    const loop = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      if (now <= lastTimestampRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }
      lastTimestampRef.current = now;

      const result = poseLandmarker.detectSquat(video, now);

      if (result) {
        setIsSquatting(result.isSquatting);
        setKneeAngle(result.kneeAngle);
        drawPoseLandmarks(result.landmarks);

        // The hook handles debounce + cooldown and tells us when to count
        if (result.counted) {
          localSquatCount++;
          setSquatCount(localSquatCount);

          if (localSquatCount >= REQUIRED_SQUATS) {
            cancelAnimationFrame(animFrameRef.current);
            clearCanvas();
            setAppState('monitoring');
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [poseLandmarker, videoRef, drawPoseLandmarks, clearCanvas]);

  // --- State transition effects ---
  useEffect(() => {
    // Reset drawing utils when canvas remounts
    drawingUtilsRef.current = null;

    if (appState === 'monitoring') {
      setDrowsySeconds(0);
      drowsyStartRef.current = null;
      lastTimestampRef.current = 0;
      stopAlarm();

      poseLandmarker.close();
      faceLandmarker.init().then(() => {
        runMonitoringLoop();
      });
    }

    if (appState === 'penalty') {
      setSquatCount(0);
      setIsSquatting(false);
      lastTimestampRef.current = 0;
      startAlarm();

      faceLandmarker.close();
      poseLandmarker.init().then(() => {
        runPenaltyLoop();
      });
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  // --- Re-attach stream whenever video element mounts ---
  useEffect(() => {
    if (appState !== 'start') {
      attachStream();
    }
  }, [appState, attachStream]);

  // --- Start handler ---
  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      unlockAudio();
      await startCamera();
      setAppState('monitoring');
    } catch (err) {
      console.error('Failed to start:', err);
      alert('カメラの使用許可が必要です。ブラウザの設定を確認してください。');
    } finally {
      setLoading(false);
    }
  }, [unlockAudio, startCamera]);

  const showVideo = appState !== 'start';

  return (
    <div className="h-screen w-screen bg-dark-bg text-white relative overflow-hidden">
      {/* Persistent video element */}
      {showVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover -scale-x-100"
          playsInline
          muted
          autoPlay
        />
      )}

      {/* Landmark overlay canvas — mirrored to match video */}
      {showVideo && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none"
        />
      )}

      {/* State-specific overlays */}
      {appState === 'start' && (
        <StartScreen onStart={handleStart} loading={loading} />
      )}
      {appState === 'monitoring' && (
        <MonitoringScreen
          ear={ear}
          drowsySeconds={drowsySeconds}
          faceDetected={faceDetected}
        />
      )}
      {appState === 'penalty' && (
        <PenaltyScreen
          squatCount={squatCount}
          requiredSquats={REQUIRED_SQUATS}
          isSquatting={isSquatting}
        />
      )}
    </div>
  );
}

export default App;
