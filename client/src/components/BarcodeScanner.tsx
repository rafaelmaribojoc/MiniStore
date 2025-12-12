import { useEffect, useRef, useState } from "react";
import {
  Camera,
  X,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
} from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // Get available video devices
    reader
      .listVideoInputDevices()
      .then((videoDevices) => {
        setDevices(videoDevices);
        // Prefer back camera
        const backCameraIndex = videoDevices.findIndex(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear")
        );
        if (backCameraIndex !== -1) setCurrentDeviceIndex(backCameraIndex);
      })
      .catch((err) => {
        console.error("Error listing devices:", err);
      });

    return () => {
      reader.reset();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!readerRef.current || devices.length === 0) return;

    const startScanning = async () => {
      try {
        const deviceId = devices[currentDeviceIndex]?.deviceId;

        // Stop previous stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        readerRef.current?.reset();

        // Get stream with constraints
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, facingMode: "environment" }
            : { facingMode: "environment" },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Start continuous decoding
        readerRef.current?.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const barcode = result.getText();
              // Play beep sound
              const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              oscillator.type = "sine";
              oscillator.frequency.setValueAtTime(
                1000,
                audioContext.currentTime
              );
              oscillator.connect(audioContext.destination);
              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.1);

              onScan(barcode);
            }
            if (err && !(err instanceof NotFoundException)) {
              console.error("Scan error:", err);
            }
          }
        );
      } catch (err: any) {
        console.error("Camera error:", err);
        if (err.name === "NotAllowedError") {
          setError(
            "Camera access denied. Please allow camera access to scan barcodes."
          );
        } else if (err.name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError("Failed to access camera. Please try again.");
        }
      }
    };

    startScanning();
  }, [devices, currentDeviceIndex, onScan]);

  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torch } as any],
        });
        setTorch(!torch);
      } catch (err) {
        console.log("Torch not supported on this device");
      }
    }
  };

  const switchCamera = () => {
    if (devices.length > 1) {
      setCurrentDeviceIndex((prev) => (prev + 1) % devices.length);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Scan Barcode
        </h2>
        <button
          onClick={onClose}
          className="text-white p-2 hover:bg-white/20 rounded-full"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 text-center max-w-sm">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-48 border-2 border-white/50 rounded-xl relative">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg" />

                {/* Scanning line animation */}
                <div className="absolute inset-x-2 top-2 h-0.5 bg-primary-500 animate-scan" />
              </div>
            </div>

            <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
              Point camera at barcode
            </p>
          </>
        )}
      </div>

      {/* Controls */}
      {!error && (
        <div className="flex justify-center gap-8 p-6 bg-black/50">
          <button
            onClick={toggleTorch}
            className="flex flex-col items-center gap-1 text-white"
          >
            {torch ? (
              <Flashlight className="w-8 h-8" />
            ) : (
              <FlashlightOff className="w-8 h-8" />
            )}
            <span className="text-xs">Flash</span>
          </button>
          {devices.length > 1 && (
            <button
              onClick={switchCamera}
              className="flex flex-col items-center gap-1 text-white"
            >
              <SwitchCamera className="w-8 h-8" />
              <span className="text-xs">Switch</span>
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(180px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
