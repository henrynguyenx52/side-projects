import os
import cv2
import numpy as np
from typing import Tuple, List


class CPUFaceHandler:
    """OpenCV-based face detection — no mediapipe dependency needed."""

    def __init__(self, model_selection: int = 1, min_detection_confidence: float = 0.0):
        proto  = os.path.join(os.path.dirname(__file__), "../../deploy.prototxt")
        caffe  = os.path.join(os.path.dirname(__file__), "../../res10_300x300_ssd_iter_140000.caffemodel")
        self.use_dnn  = False
        self.use_haar = False

        # Download DNN / Haar model files if missing
        import urllib.request
        base = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        proto_local  = os.path.join(base, "deploy.prototxt")
        caffe_local  = os.path.join(base, "res10_300x300_ssd_iter_140000.caffemodel")
        haar_local   = os.path.join(base, "haarcascade_frontalface_default.xml")

        if not os.path.exists(proto_local):
            try:
                urllib.request.urlretrieve(
                    "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt",
                    proto_local)
            except Exception:
                pass
        if not os.path.exists(caffe_local):
            try:
                urllib.request.urlretrieve(
                    "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel",
                    caffe_local)
            except Exception:
                pass
        if not os.path.exists(haar_local):
            try:
                urllib.request.urlretrieve(
                    "https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml",
                    haar_local)
            except Exception:
                pass

        # Try DNN-based detector (Caffe model) first
        if os.path.exists(proto_local) and os.path.exists(caffe_local):
            try:
                self.net = cv2.dnn.readNetFromCaffe(proto_local, caffe_local)
                self.use_dnn = True
            except Exception:
                self.net = None
                self.use_dnn = False

        # Fall back to Haar cascade
        if not self.use_dnn and os.path.exists(haar_local):
            self.cascade = cv2.CascadeClassifier(haar_local)
            self.use_haar = True

    def detect(self, image: np.ndarray) -> Tuple[List, List]:
        bboxs, scores = [], []
        img_h, img_w = image.shape[:2]

        if self.use_dnn:
            blob = cv2.dnn.blobFromImage(image, 1.0, (300, 300), (104.0, 177.0, 123.0))
            self.net.setInput(blob)
            detections = self.net.forward()
            for i in range(detections.shape[2]):
                confidence = float(detections[0, 0, i, 2])
                if confidence > 0.5:
                    # Return RELATIVE coordinates (same contract as original mediapipe handler)
                    x1 = float(detections[0, 0, i, 3])
                    y1 = float(detections[0, 0, i, 4])
                    x2 = float(detections[0, 0, i, 5])
                    y2 = float(detections[0, 0, i, 6])
                    bboxs.append([x1, y1, x2, y2])
                    scores.append(confidence)

        elif self.use_haar:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            faces = self.cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            for (x, y, w, h) in faces:
                bboxs.append([x / img_w, y / img_h, (x + w) / img_w, (y + h) / img_h])
                scores.append(1.0)

        return bboxs, scores

    def __call__(self, image: np.ndarray) -> Tuple[List, List]:
        return self.detect(image)
