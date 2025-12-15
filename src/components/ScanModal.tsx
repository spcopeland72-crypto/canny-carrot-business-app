import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import {CameraView, useCameraPermissions, BarcodeScanningResult} from 'expo-camera';
import {Colors} from '../constants/Colors';

// Check if browser supports native BarcodeDetector API
const supportsBarcodeDetector = (): boolean => {
  return Platform.OS === 'web' && 
         typeof window !== 'undefined' && 
         'BarcodeDetector' in window;
};

interface ScanModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned?: (data: string, type: string) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MODAL_MARGIN = 10;

const ScanModal: React.FC<ScanModalProps> = ({visible, onClose, onBarcodeScanned}) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const html5QrCodeRef = useRef<any>(null);
  
  // Native camera permissions and ref
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean>(true);
  
  // Initialize cameraAvailable when modal opens
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      setCameraAvailable(true);
    }
  }, [visible]);
  
  // Request permission when modal opens (native only)
  useEffect(() => {
    if (visible && Platform.OS !== 'web' && cameraAvailable !== false) {
      console.log('[ScanModal] Modal opened, checking permissions...', { permission, cameraAvailable });
      try {
        if (permission && !permission.granted && permission.canAskAgain) {
          console.log('[ScanModal] Requesting camera permission...');
          requestPermission().then((result) => {
            console.log('[ScanModal] Permission result:', result);
          }).catch((error) => {
            console.error('[ScanModal] Permission request error:', error);
            setCameraError('Failed to request camera permission');
          });
        }
        setCameraReady(false);
        setCameraError(null);
      } catch (error) {
        console.error('[ScanModal] Error in permission effect:', error);
        setCameraError('Camera initialization error');
      }
    }
  }, [visible, permission, requestPermission, cameraAvailable]);
  
  // Reset everything when modal closes
  useEffect(() => {
    if (!visible) {
      try {
        setCameraError(null);
        setCameraReady(false);
        setCameraKey(0);
        if (cameraRef.current) {
          cameraRef.current = null;
        }
      } catch (error) {
        console.error('Error resetting camera state:', error);
      }
    }
  }, [visible]);
  
  // Small delay before showing camera
  useEffect(() => {
    if (visible && Platform.OS !== 'web' && permission?.granted) {
      console.log('[ScanModal] Permission granted, preparing camera...');
      try {
        const timer = setTimeout(() => {
          console.log('[ScanModal] Setting camera ready...');
          setCameraReady(true);
        }, 500);
        return () => {
          console.log('[ScanModal] Cleaning up camera ready timer');
          clearTimeout(timer);
        };
      } catch (error) {
        console.error('[ScanModal] Error setting camera ready:', error);
        setCameraError('Failed to initialize camera');
        setCameraReady(false);
      }
    } else {
      console.log('[ScanModal] Camera not ready:', { visible, platform: Platform.OS, granted: permission?.granted });
      setCameraReady(false);
    }
  }, [visible, permission]);
  
  // Process scanned barcode (native)
  const processBarcode = (data: string) => {
    if (onBarcodeScanned) {
      onBarcodeScanned(data, 'qr');
    }
  };

  // Start camera scanner automatically when modal opens
  useEffect(() => {
    if (!visible) {
      return;
    }
    
    // Only run on web platform
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    
    const startScanner = async () => {
      try {
        setScanError(null);
        
        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Find the container element
        const container = document.querySelector('[data-testid="scanner-container"]');
        if (!container) {
          throw new Error('Scanner container not found');
        }
        
        // Check if getUserMedia is available and handle undefined navigator.mediaDevices
        let stream: MediaStream;
        
        // Try modern API first (navigator.mediaDevices.getUserMedia)
        // If that's not available, try legacy APIs
        const tryGetUserMedia = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
          // Wait a bit for navigator.mediaDevices to be available (some mobile browsers need this)
          let attempts = 0;
          while (typeof navigator !== 'undefined' && !navigator.mediaDevices && attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          
          // Try modern API first - just try calling it, don't check first
          try {
            if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
              return await navigator.mediaDevices.getUserMedia(constraints);
            }
          } catch (e: any) {
            // If it's a permission error or other real error, re-throw it
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError' || 
                e.name === 'NotFoundError' || e.name === 'NotReadableError') {
              throw e;
            }
            // Otherwise, try legacy APIs
          }
          
          // Try legacy APIs as fallback (for older browsers)
          const getUserMedia = (navigator as any)?.getUserMedia || 
                               (navigator as any)?.webkitGetUserMedia ||
                               (window as any)?.webkitGetUserMedia || 
                               (window as any)?.mozGetUserMedia ||
                               (window as any)?.msGetUserMedia;
          
          if (getUserMedia) {
            // Use legacy API (promisified)
            return new Promise((resolve, reject) => {
              getUserMedia.call(navigator || window, constraints, resolve, reject);
            });
          }
          
          // If we get here, neither modern nor legacy APIs are available
          // Check if we're on HTTP (camera requires HTTPS on most browsers except localhost)
          const isSecureContext = typeof window !== 'undefined' && 
                                  (window.location.protocol === 'https:' || 
                                   window.location.hostname === 'localhost' || 
                                   window.location.hostname === '127.0.0.1' ||
                                   window.location.hostname.match(/^192\.168\./)); // Allow local network IPs for development
          
          // Log for debugging
          console.error('getUserMedia not available. navigator:', typeof navigator !== 'undefined', 
                       'mediaDevices:', navigator?.mediaDevices, 
                       'getUserMedia:', (navigator as any)?.getUserMedia,
                       'isSecureContext:', isSecureContext,
                       'protocol:', window?.location?.protocol,
                       'hostname:', window?.location?.hostname);
          
          // For development, try to use the API anyway even on HTTP
          // Some browsers allow it on local network IPs
          if (!isSecureContext && typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            // If it's a local network IP, try one more time with a direct call
            if (hostname.match(/^192\.168\./) || hostname.match(/^10\./) || hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
              // Try one more time - some mobile browsers allow HTTP on local network
              try {
                if (navigator.mediaDevices) {
                  return await navigator.mediaDevices.getUserMedia(constraints);
                }
              } catch (finalError: any) {
                // If it's a security error, provide helpful message
                if (finalError.name === 'NotAllowedError' || finalError.name === 'NotSupportedError') {
                  throw new Error('Camera access blocked. Mobile browsers require HTTPS for camera access. Please use HTTPS or test on localhost.');
                }
                throw finalError;
              }
            }
          }
          
          throw new Error('Camera access is not available. Please ensure you are using a modern browser with camera support.');
        };
        
        // Request camera access
        try {
          // Try with ideal constraints first
          try {
            stream = await tryGetUserMedia({
              video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
          } catch (constraintError: any) {
            // If constraints fail, try simpler ones
            if (constraintError.name === 'OverconstrainedError' || constraintError.name === 'ConstraintNotSatisfiedError') {
              stream = await tryGetUserMedia({
                video: { facingMode: 'environment' }
              });
            } else {
              throw constraintError;
            }
          }
        } catch (mediaError: any) {
          console.error('getUserMedia error:', mediaError);
          
          // Provide specific error messages
          if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
            throw new Error('Camera permission denied. Please allow camera access in your browser settings and try again.');
          } else if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
            throw new Error('No camera found. Please ensure your device has a camera.');
          } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'TrackStartError') {
            throw new Error('Camera is already in use by another application. Please close other apps using the camera.');
          } else {
            throw new Error(`Camera access failed: ${mediaError.message || mediaError.name}. Please check your browser permissions.`);
          }
        }
        
        // Ensure stream was obtained
        if (!stream) {
          throw new Error('Failed to obtain camera stream.');
        }
        
        streamRef.current = stream;
        
        // Create video element
        let videoElement = document.getElementById('qr-scanner-video-business') as HTMLVideoElement;
        if (!videoElement) {
          videoElement = document.createElement('video');
          videoElement.id = 'qr-scanner-video-business';
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'cover';
          videoElement.setAttribute('autoplay', 'true');
          videoElement.setAttribute('playsinline', 'true');
          videoElement.setAttribute('muted', 'true'); // Required for autoplay on mobile
          container.appendChild(videoElement);
        }
        
        videoRef.current = videoElement;
        videoElement.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          videoElement.onloadedmetadata = () => {
            videoElement.play()
              .then(() => {
                setScanError(null); // Clear any errors - camera is working
                resolve(undefined);
              })
              .catch(reject);
          };
          videoElement.onerror = reject;
        });
        
        // Clear any errors - camera is working
        setScanError(null);
        
        // Use native BarcodeDetector API if available
        if (supportsBarcodeDetector()) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code']
            });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
              throw new Error('Could not get canvas context');
            }
            
            const scanFrame = async () => {
              if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                try {
                  const barcodes = await barcodeDetector.detect(canvas);
                  if (barcodes && barcodes.length > 0) {
                    const qrCode = barcodes[0].rawValue;
                    stream.getTracks().forEach(track => track.stop());
                    if (onBarcodeScanned) {
                      onBarcodeScanned(qrCode, 'QR_CODE');
                    }
                    onClose();
                    return;
                  }
                } catch (detectError) {
                  // Continue scanning
                }
              }
              scanIntervalRef.current = requestAnimationFrame(scanFrame);
            };
            
            videoElement.addEventListener('loadedmetadata', () => {
              scanFrame();
            });
          } catch (barcodeError) {
            console.warn('BarcodeDetector not available, camera will still work:', barcodeError);
            // Camera is working, QR detection just won't work - don't show error
            setScanError(null);
          }
        } else {
          // Browser doesn't support BarcodeDetector - camera still works, just no auto-detection
          // Don't show error message, camera is working fine
          setScanError(null);
        }
        
      } catch (error: any) {
        console.error('Error starting camera:', error);
        // Show user-friendly error message
        const errorMessage = error.message || 'Failed to start camera scanner. Please check your browser permissions.';
        setScanError(errorMessage);
      }
    };
    
    startScanner();
    
    // Cleanup on close
    return () => {
      if (scanIntervalRef.current) {
        cancelAnimationFrame(scanIntervalRef.current);
      }
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.qrContainer}>
              <Text style={styles.qrIcon}>📱</Text>
              <Text style={styles.qrTitle}>Scan QR Code</Text>
              <Text style={styles.qrSubtitle}>
                Position customer QR code in frame
              </Text>
            </View>

            {Platform.OS === 'web' ? (
              <View style={styles.scannerContainer} testID="scanner-container">
                {scanError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{scanError}</Text>
                    <Text style={styles.errorSubtext}>
                      Please allow camera access and try again
                    </Text>
                  </View>
                ) : (
                  <View style={styles.videoWrapper}>
                    <View 
                      nativeID="html5-qrcode-scanner-business"
                      style={styles.videoContainer}
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.nativeScannerContainer}>
                {!permission ? (
                  <View style={styles.nativePlaceholder}>
                    <Text style={styles.scannerText}>Requesting camera permission...</Text>
                  </View>
                ) : !permission.granted ? (
                  <View style={styles.nativePlaceholder}>
                    <Text style={styles.scannerText}>Camera permission required</Text>
                    <Text style={styles.scannerSubtext}>
                      Please allow camera access to scan QR codes
                    </Text>
                    <TouchableOpacity
                      style={styles.permissionButton}
                      onPress={async () => {
                        const result = await requestPermission();
                      }}>
                      <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                  </View>
                ) : permission.granted ? (
                  !cameraReady ? (
                    <View style={styles.nativePlaceholder}>
                      <Text style={styles.scannerText}>Starting camera...</Text>
                    </View>
                  ) : (
                    <View style={styles.cameraContainer}>
                      {Platform.OS !== 'web' && cameraReady && cameraAvailable !== false && (() => {
                        console.log('[ScanModal] Rendering CameraView...', { cameraKey, cameraReady, cameraAvailable });
                        try {
                          return (
                            <View style={{ flex: 1 }}>
                              <CameraView
                                key={`camera-${cameraKey}`}
                                ref={(ref) => {
                                  console.log('[ScanModal] CameraView ref callback:', ref ? 'valid' : 'null');
                                  cameraRef.current = ref;
                                }}
                                style={styles.camera}
                                facing="back"
                                onBarcodeScanned={(result: BarcodeScanningResult) => {
                                  try {
                                    console.log('[ScanModal] Barcode scanned:', result?.data);
                                    if (result && result.data && typeof result.data === 'string') {
                                      processBarcode(result.data);
                                    }
                                  } catch (error) {
                                    console.error('[ScanModal] Barcode scan processing error:', error);
                                  }
                                }}
                                barcodeScannerSettings={{
                                  barcodeTypes: ['qr'],
                                }}
                              />
                            </View>
                          );
                        } catch (error) {
                          console.error('[ScanModal] Error rendering CameraView:', error);
                          setCameraError(`Camera render error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          return null;
                        }
                      })()}
                      {cameraError && (
                        <View style={styles.errorOverlay}>
                          <Text style={styles.errorText}>{cameraError}</Text>
                          <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={() => {
                              setCameraError(null);
                              setCameraKey(prev => prev + 1);
                              setCameraReady(false);
                              setTimeout(() => setCameraReady(true), 200);
                            }}>
                            <Text style={styles.permissionButtonText}>Retry</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )
                ) : (
                  <View style={styles.nativePlaceholder}>
                    <Text style={styles.scannerText}>Camera permission denied</Text>
                    <Text style={styles.scannerSubtext}>
                      Please enable camera access in device settings
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH - MODAL_MARGIN * 2,
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.background,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    width: Math.min(SCREEN_WIDTH - 60, 400),
    height: Math.min(SCREEN_WIDTH - 60, 400),
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.neutral[100],
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  nativeScannerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    width: Math.min(SCREEN_WIDTH - 60, 400),
    height: Math.min(SCREEN_WIDTH - 60, 400),
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  nativePlaceholder: {
    width: Math.min(SCREEN_WIDTH - 60, 400),
    height: Math.min(SCREEN_WIDTH - 60, 400),
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scannerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  scannerSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC3545',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ScanModal;
