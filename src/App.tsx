import { useState, useRef, useCallback, useEffect } from 'react';
import {
  DrawingUtils,
  FaceLandmarker,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { AppState, ExerciseMode } from './types';
import { useCamera } from './hooks/useCamera';
import { useAlarm } from './hooks/useAlarm';
import { useFaceLandmarker } from './hooks/useFaceLandmarker';
import { usePoseLandmarker } from './hooks/usePoseLandmarker';
import { useHeadTiltDetector } from './hooks/useHeadTiltDetector';
import { StartScreen } from './components/StartScreen';
import { MonitoringScreen } from './components/MonitoringScreen';
import { PenaltyScreen } from './components/PenaltyScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { captureScreenshot } from './utils/captureScreenshot';
import { sendDiscordWebhook } from './utils/sendDiscordWebhook';
import { getWebhookUrl, isValidWebhookUrl } from './utils/webhookSettings';
import { getExerciseMode, setExerciseMode as saveExerciseMode } from './utils/exerciseModeSettings';
import { WebhookToast } from './components/WebhookToast';
import { useSessionLogger } from './hooks/useSessionLogger';

const EAR_THRESHOLD_LOW = 0.20;   // Enter drowsy state below this
const EAR_THRESHOLD_HIGH = 0.24;  // Exit drowsy state above this (hysteresis)
const DROWSY_DURATION_SEC = 3;
const REQUIRED_SQUATS = 5;

function App() {
  const [appState, setAppState] = useState<AppState>('start');
  const [loading, setLoading] = useState(false);
  const [ear, setEar] = useState(0.3);
  const [drowsySeconds, setDrowsySeconds] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [squatCount, setSquatCount] = useState(0);
  const [penaltyComplete, setPenaltyComplete] = useState(false);
  const [isSquatting, setIsSquatting] = useState(false);
  const [kneeAngle, setKneeAngle] = useState(180);
  const [fullBodyVisible, setFullBodyVisible] = useState(true);
  const [exerciseMode, setExerciseMode] = useState<ExerciseMode>(getExerciseMode);
  const [isTilted, setIsTilted] = useState(false);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [upperBodyVisible, setUpperBodyVisible] = useState(true);
  const [monitoringStartedAt, setMonitoringStartedAt] = useState(0);
  const [webhookToast, setWebhookToast] = useState<{
    imageUrl: string;
    message: string;
    success: boolean;
  } | null>(null);

  const { videoRef, startCamera, attachStream } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const { unlockAudio, startAlarm, stopAlarm } = useAlarm();
  const faceLandmarker = useFaceLandmarker();
  const poseLandmarker = usePoseLandmarker();
  const headTiltDetector = useHeadTiltDetector();

  const { startSession, logDrowsiness, logExerciseCompletion, endSession } = useSessionLogger();

  const animFrameRef = useRef(0);
  const drowsyStartRef = useRef<number | null>(null);
  const lastTimestampRef = useRef(0);
  const isDrowsyRef = useRef(false);
  const prevAppStateRef = useRef<AppState>('start');

  // Guard against browser close with active session
  useEffect(() => {
    const handler = () => {
      endSession();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [endSession]);

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
    (
      landmarks: NormalizedLandmark[],
      segmentationMask?: Float32Array | null,
      maskWidth?: number,
      maskHeight?: number,
    ) => {
      syncCanvasSize();
      clearCanvas();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      // Draw segmentation mask overlay
      if (ctx && segmentationMask && maskWidth && maskHeight) {
        const imageData = ctx.createImageData(maskWidth, maskHeight);
        const data = imageData.data;
        for (let i = 0; i < segmentationMask.length; i++) {
          const confidence = segmentationMask[i];
          const px = i * 4;
          // Neon cyan overlay: rgb(0, 212, 255) with confidence-based alpha
          data[px] = 0;
          data[px + 1] = 212;
          data[px + 2] = 255;
          data[px + 3] = confidence > 0.3 ? confidence * 80 : 0;
        }
        // Draw mask scaled to canvas size
        const tmpCanvas = maskCanvasRef.current;
        if (tmpCanvas.width !== maskWidth || tmpCanvas.height !== maskHeight) {
          tmpCanvas.width = maskWidth;
          tmpCanvas.height = maskHeight;
        }
        tmpCanvas.getContext('2d')!.putImageData(imageData, 0, 0);
        ctx.drawImage(tmpCanvas, 0, 0, canvas.width, canvas.height);
      }

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

  const handleExerciseModeChange = useCallback((mode: ExerciseMode) => {
    setExerciseMode(mode);
    saveExerciseMode(mode);
  }, []);

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

        // Hysteresis: different thresholds for entering/exiting drowsy state
        if (!isDrowsyRef.current && result.average < EAR_THRESHOLD_LOW) {
          isDrowsyRef.current = true;
        } else if (isDrowsyRef.current && result.average > EAR_THRESHOLD_HIGH) {
          isDrowsyRef.current = false;
        }

        if (isDrowsyRef.current) {
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
        isDrowsyRef.current = false;
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

      if (!result) {
        setFullBodyVisible(false);
      } else {
        setIsSquatting(result.isSquatting);
        setKneeAngle(result.kneeAngle);
        setFullBodyVisible(result.fullBodyVisible);
        drawPoseLandmarks(result.landmarks, result.segmentationMask, result.maskWidth, result.maskHeight);

        // The hook handles debounce + cooldown and tells us when to count
        if (result.counted) {
          localSquatCount++;
          setSquatCount(localSquatCount);

          if (localSquatCount >= REQUIRED_SQUATS) {
            cancelAnimationFrame(animFrameRef.current);
            clearCanvas();
            stopAlarm();
            setPenaltyComplete(true);
            setTimeout(() => {
              setPenaltyComplete(false);
              setAppState('monitoring');
            }, 3000);
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [poseLandmarker, videoRef, drawPoseLandmarks, clearCanvas, stopAlarm]);

  // --- Head tilt penalty loop ---
  const runHeadTiltPenaltyLoop = useCallback(() => {
    let localTiltCount = 0;

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

      const result = headTiltDetector.detectTilt(video, now);

      if (result) {
        setIsTilted(result.isTilted);
        setTiltAngle(result.tiltAngle);
        setUpperBodyVisible(result.upperBodyVisible);
        drawFaceLandmarks(result.landmarks);

        if (result.counted) {
          localTiltCount++;
          setSquatCount(localTiltCount);

          if (localTiltCount >= REQUIRED_SQUATS) {
            cancelAnimationFrame(animFrameRef.current);
            clearCanvas();
            stopAlarm();
            setPenaltyComplete(true);
            setTimeout(() => {
              setPenaltyComplete(false);
              setAppState('monitoring');
            }, 3000);
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [headTiltDetector, videoRef, drawFaceLandmarks, clearCanvas, stopAlarm]);

  // --- State transition effects ---
  useEffect(() => {
    const prev = prevAppStateRef.current;
    prevAppStateRef.current = appState;

    // Discord webhook notifications with toast feedback
    const sendWithToast = async (message: string) => {
      const url = getWebhookUrl();
      if (!url || !isValidWebhookUrl(url)) return;

      const video = videoRef.current;
      if (!video) return;

      const blob = await captureScreenshot(video);
      if (!blob) return;
      const imageUrl = URL.createObjectURL(blob);
      const success = await sendDiscordWebhook(message, blob);
      setWebhookToast({ imageUrl, message, success });
    };

    if (prev === 'start' && appState === 'monitoring') {
      startSession();
    }
    if (prev === 'monitoring' && appState === 'penalty') {
      logDrowsiness(DROWSY_DURATION_SEC * 1000);
      sendWithToast('居眠りを検知しました！');
    }
    if (prev === 'penalty' && appState === 'monitoring') {
      logExerciseCompletion(REQUIRED_SQUATS, exerciseMode);
      sendWithToast(exerciseMode === 'fullbody' ? 'スクワット5回完了！' : '首ストレッチ5回完了！');
    }
    if (prev === 'monitoring' && appState === 'start') {
      endSession();
    }

    // Reset drawing utils when canvas remounts
    drawingUtilsRef.current = null;

    if (appState === 'monitoring') {
      if (prev === 'start') setMonitoringStartedAt(Date.now());
      setDrowsySeconds(0);
      drowsyStartRef.current = null;
      isDrowsyRef.current = false;
      lastTimestampRef.current = 0;
      stopAlarm();

      poseLandmarker.close();
      headTiltDetector.close();
      faceLandmarker.init().then(() => {
        runMonitoringLoop();
      });
    }

    if (appState === 'penalty') {
      setSquatCount(0);
      setPenaltyComplete(false);
      setIsSquatting(false);
      setIsTilted(false);
      setFullBodyVisible(false);
      setUpperBodyVisible(false);
      lastTimestampRef.current = 0;
      startAlarm();

      faceLandmarker.close();
      if (exerciseMode === 'fullbody') {
        headTiltDetector.close();
        poseLandmarker.init().then(() => {
          runPenaltyLoop();
        });
      } else {
        poseLandmarker.close();
        headTiltDetector.init().then(() => {
          runHeadTiltPenaltyLoop();
        });
      }
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

  const handleStop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    clearCanvas();
    faceLandmarker.close();
    poseLandmarker.close();
    headTiltDetector.close();
    stopAlarm();
    setPenaltyComplete(false);
    setAppState('start');
  }, [clearCanvas, faceLandmarker, poseLandmarker, headTiltDetector, stopAlarm]);

  const handleDashboard = useCallback(() => {
    setAppState('dashboard');
  }, []);

  const handleDashboardBack = useCallback(() => {
    setAppState('start');
  }, []);

  const handleToastDone = useCallback(() => {
    setWebhookToast((prev) => {
      if (prev?.imageUrl) URL.revokeObjectURL(prev.imageUrl);
      return null;
    });
  }, []);

  const showVideo = appState === 'monitoring' || appState === 'penalty';

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
        <StartScreen
          onStart={handleStart}
          loading={loading}
          onDashboard={handleDashboard}
          exerciseMode={exerciseMode}
          onExerciseModeChange={handleExerciseModeChange}
        />
      )}
      {appState === 'dashboard' && (
        <DashboardScreen onBack={handleDashboardBack} />
      )}
      {appState === 'monitoring' && (
        <MonitoringScreen
          ear={ear}
          drowsySeconds={drowsySeconds}
          faceDetected={faceDetected}
          onStop={handleStop}
          sessionStartedAt={monitoringStartedAt}
        />
      )}
      {(appState === 'penalty' || penaltyComplete) && (
        <PenaltyScreen
          squatCount={squatCount}
          requiredSquats={REQUIRED_SQUATS}
          isSquatting={isSquatting}
          fullBodyVisible={fullBodyVisible}
          exerciseMode={exerciseMode}
          isTilted={isTilted}
          tiltAngle={tiltAngle}
          upperBodyVisible={upperBodyVisible}
          penaltyComplete={penaltyComplete}
        />
      )}

      {webhookToast && (
        <WebhookToast
          imageUrl={webhookToast.imageUrl}
          message={webhookToast.message}
          success={webhookToast.success}
          onDone={handleToastDone}
        />
      )}
    </div>
  );
}

export default App;
